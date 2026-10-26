import { JobDetailSchema, JobSummarySchema, SearchQuerySchema, type JobDetail, type JobSummary, type SearchQuery, type SearchResponse } from "../../domain/schemas.js";
import { SourceError } from "./errors.js";
import type { HttpTransport } from "./http-transport.js";
import { buildSearchParams } from "./params.js";
import { RawDetailResponseSchema, RawSearchResponseSchema, type RawSearchJob } from "./schemas.js";

const SEARCH_URL = "https://www.104.com.tw/jobs/search/api/jobs";
const DETAIL_BASE_URL = "https://www.104.com.tw/job/ajax/content/";
const SOURCE_JOB_URL = "https://www.104.com.tw/job/";
const MAX_SNIPPET_CHARS = 500;
const MAX_DESCRIPTION_CHARS = 10_000;
const MAX_REQUIREMENT_CHARS = 3_000;
const SALARY_HIGH_SENTINEL = 9_999_999;

const SALARY_PREFIX: Record<number, string> = { 30: "時薪", 40: "日薪", 50: "月薪", 60: "年薪" };

export class Job104Adapter {
  readonly source = "104" as const;

  constructor(private readonly http: HttpTransport) {}

  async search(input: unknown): Promise<SearchResponse> {
    const parsedInput = SearchQuerySchema.safeParse(input);
    if (!parsedInput.success) {
      throw new SourceError("INVALID_FILTER", "搜尋條件格式錯誤。");
    }
    const query = parsedInput.data;
    const raw = await this.http.getJson(SEARCH_URL, buildSearchParams(query));
    const parsed = RawSearchResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new SourceError("SOURCE_SCHEMA_CHANGED", "104 搜尋回應格式已變更。");
    }
    const fetchedAt = new Date().toISOString();
    const jobs = parsed.data.data
      .map((job) => toSummary(job, fetchedAt))
      .filter((job): job is JobSummary => job !== null)
      .slice(0, query.page_size);
    const pagination = parsed.data.metadata.pagination;
    return {
      source: "104",
      total: pagination.total,
      page: pagination.currentPage,
      page_size: jobs.length,
      has_next: pagination.currentPage < pagination.lastPage,
      ...(query.salary_min !== undefined ? {
        salary_filter_note: "104 搜尋端點的薪資條件／排序不保證代表硬性薪資下限；請以職缺薪資欄位及詳情內容確認。",
      } : {}),
      jobs,
    };
  }

  async getDetails(input: unknown): Promise<JobDetail> {
    if (typeof input !== "string" || !/^104:[a-zA-Z0-9]{3,32}$/.test(input)) {
      throw new SourceError("INVALID_JOB_REF", "job_ref 格式無效；請使用搜尋結果中的 104 reference。");
    }
    const shortCode = input.slice("104:".length);
    const raw = await this.http.getJson(`${DETAIL_BASE_URL}${encodeURIComponent(shortCode)}`);
    const parsed = RawDetailResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new SourceError("SOURCE_SCHEMA_CHANGED", "104 職缺詳情回應格式已變更。");
    }
    const data = parsed.data.data;
    const condition = data.condition;
    const requirementParts = [
      condition.workExp && `經驗：${condition.workExp}`,
      condition.edu && `學歷：${condition.edu}`,
      listText(condition.major).length > 0 && `科系：${listText(condition.major).join("、")}`,
      listText(condition.specialty).length > 0 && `專長：${listText(condition.specialty).join("、")}`,
      listText(condition.skill).length > 0 && `技能：${listText(condition.skill).join("、")}`,
      listText(condition.certificate).length > 0 && `證照：${listText(condition.certificate).join("、")}`,
      (Array.isArray(condition.other) ? condition.other.join("\n") : condition.other).trim(),
    ].filter((part): part is string => Boolean(part));
    const result: JobDetail = {
      source: "104",
      job_ref: input,
      job_name: data.header.jobName,
      company: data.header.custName,
      description: data.jobDetail.jobDescription.slice(0, MAX_DESCRIPTION_CHARS),
      requirements: requirementParts.join("\n").slice(0, MAX_REQUIREMENT_CHARS),
      salary: data.jobDetail.salary,
      location: `${data.jobDetail.addressRegion}${data.jobDetail.addressArea}${data.jobDetail.addressDetail}`.slice(0, 300),
      url: `${SOURCE_JOB_URL}${shortCode}`,
      fetched_at: new Date().toISOString(),
    };
    return JobDetailSchema.parse(result);
  }

  async close(): Promise<void> {
    await this.http.close();
  }
}

function toSummary(job: RawSearchJob, fetchedAt: string): JobSummary | null {
  const url = normalizeJobUrl(job.link.job);
  if (!url) return null;
  const shortCode = url.slice(SOURCE_JOB_URL.length);
  const result: JobSummary = {
    source: "104",
    job_ref: `104:${shortCode}`,
    job_name: job.jobName,
    company: job.custName,
    salary: formatSalary(job.salaryLow, job.salaryHigh, job.s10),
    location: job.jobAddrNoDesc || job.jobAddress,
    ...(job.jobType !== undefined ? { job_type: job.jobType } : {}),
    ...(job.remoteWorkType !== undefined ? { remote: job.remoteWorkType } : {}),
    snippet: (job.descSnippet || job.description).slice(0, MAX_SNIPPET_CHARS),
    url,
    appear_date: job.appearDate,
    fetched_at: fetchedAt,
  };
  const parsed = JobSummarySchema.safeParse(result);
  return parsed.success ? parsed.data : null;
}

function normalizeJobUrl(value: string): string | null {
  const candidate = value.startsWith("//") ? `https:${value}` : value;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.hostname !== "www.104.com.tw") return null;
    const match = url.pathname.match(/^\/job\/([a-zA-Z0-9]{3,32})\/?$/);
    if (!match?.[1]) return null;
    return `${SOURCE_JOB_URL}${match[1]}`;
  } catch {
    return null;
  }
}

function formatSalary(low: number, high: number, salaryType: number): string {
  if (salaryType === 10 || (low === 0 && (high === 0 || high >= SALARY_HIGH_SENTINEL))) return "待遇面議";
  const prefix = SALARY_PREFIX[salaryType] ?? "月薪";
  if (high >= SALARY_HIGH_SENTINEL) return `${prefix} ${low.toLocaleString("zh-TW")} 元以上`;
  if (low === 0) return `${prefix} ${high.toLocaleString("zh-TW")} 元以下`;
  if (low === high) return `${prefix} ${low.toLocaleString("zh-TW")} 元`;
  return `${prefix} ${low.toLocaleString("zh-TW")}～${high.toLocaleString("zh-TW")} 元`;
}

function listText(items: Array<string | { description: string }>): string[] {
  return items.map((item) => typeof item === "string" ? item : item.description).filter(Boolean);
}
