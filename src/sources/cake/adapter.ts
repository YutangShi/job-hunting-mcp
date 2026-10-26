import { JobDetailSchema, JobSummarySchema, SearchQuerySchema, type JobDetail, type JobSummary, type SearchQuery, type SearchResponse } from "../../domain/schemas.js";
import { SourceError } from "../104/errors.js";
import { CakeHtmlTransport } from "./http-transport.js";

const SEARCH_URL = "https://www.cake.me/jobs/";
const MAX_SNIPPET = 500;

export class CakeAdapter {
  readonly source = "cake" as const;
  private readonly urls = new Map<string, string>();
  constructor(private readonly http: CakeHtmlTransport) {}

  async search(input: unknown): Promise<SearchResponse> {
    const query = SearchQuerySchema.parse(input);
    if (!query.keyword) throw new SourceError("INVALID_FILTER", "Cake 搜尋需要 keyword。");
    const html = await this.http.getText(`${SEARCH_URL}${encodeURIComponent(query.keyword)}`, { locale: "zh-TW" });
    const jobs = extractJobs(html).slice(0, query.page_size).map((job) => toSummary(job));
    for (const job of jobs) this.urls.set(job.job_ref.slice("cake:".length), job.url);
    return { source: "cake", total: jobs.length, page: query.page, page_size: jobs.length, has_next: false, jobs };
  }

  async getDetails(input: unknown): Promise<JobDetail> {
    if (typeof input !== "string" || !/^cake:[a-zA-Z0-9_-]{3,120}$/.test(input)) throw new SourceError("INVALID_JOB_REF", "Cake job_ref 格式無效。");
    const code = input.slice(5);
    const detailUrl = this.urls.get(code) ?? `https://www.cake.me/jobs/${encodeURIComponent(code)}`;
    const html = await this.http.getText(detailUrl, { locale: "zh-TW" });
    const job = extractJobs(html).find((candidate) => candidate.id === code);
    if (!job) throw new SourceError("SOURCE_SCHEMA_CHANGED", "Cake 職缺詳情格式已變更或職缺已不存在。");
    return JobDetailSchema.parse({ source: "cake", job_ref: input, job_name: job.title, company: job.company, description: job.description, requirements: "", salary: job.salary, location: job.location, url: job.url, fetched_at: new Date().toISOString() });
  }

  async close(): Promise<void> { await this.http.close(); }
}

type CakeJob = { id: string; title: string; company: string; description: string; salary: string; location: string; url: string };

function extractJobs(html: string): CakeJob[] {
  const script = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!script) throw new SourceError("SOURCE_SCHEMA_CHANGED", "Cake 頁面沒有可解析的職缺資料。");
  let root: unknown;
  try { root = JSON.parse(script); } catch (error) { throw new SourceError("SOURCE_NON_JSON", "Cake 頁面內嵌資料不是有效 JSON。", { cause: error }); }
  const found: CakeJob[] = [];
  const initialState = (root as { props?: { pageProps?: { initialState?: { jobSearch?: { entityByPathId?: Record<string, unknown> } } } } }).props?.pageProps?.initialState;
  for (const [key, value] of Object.entries(initialState?.jobSearch?.entityByPathId ?? {})) {
    const record = value as Record<string, unknown>;
    const page = record.page as Record<string, unknown> | undefined;
    const id = key.replace(/^cake:/, "");
    const title = text(record.title);
    const company = text(page?.name);
    if (!title || !company) continue;
    const location = Array.isArray(record.locations) ? record.locations.map(text).filter(Boolean).join("、") : text(record.location);
    const salary = formatSalary(record.salary);
    const companyPath = text(page?.path);
    found.push({ id, title, company, description: text(record.description), salary, location, url: `https://www.cake.me/companies/${companyPath}/jobs/${id}` });
  }
  walk(root, (value) => {
    const record = value as Record<string, unknown>;
    const title = text(record.title ?? record.jobTitle ?? record.name);
    const url = normalizeUrl(text(record.url ?? record.jobUrl ?? record.href));
    const id = text(record.id ?? record.slug ?? record.jobId ?? (url ? url.split("/").pop() : ""));
    const companyValue = record.companyName ?? record.company;
    const company = text(companyValue) || (companyValue && typeof companyValue === "object" ? text((companyValue as Record<string, unknown>).name) : "");
    if (title && url && id && company) found.push({ id, title, company, description: text(record.description ?? record.summary ?? record.jobDescription), salary: text(record.salary ?? record.salaryText), location: text(record.location ?? record.city), url });
  });
  const unique = new Map(found.map((job) => [job.id, job]));
  if (unique.size === 0) throw new SourceError("SOURCE_SCHEMA_CHANGED", "Cake 頁面沒有可辨識的職缺欄位。");
  return [...unique.values()];
}

function walk(value: unknown, visit: (value: Record<string, unknown>) => void): void { if (!value || typeof value !== "object") return; if (Array.isArray(value)) { for (const item of value) walk(item, visit); return; } const record = value as Record<string, unknown>; visit(record); for (const child of Object.values(record)) walk(child, visit); }
function text(value: unknown): string { return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : typeof value === "number" ? String(value) : ""; }
function normalizeUrl(value: string): string { if (!value) return ""; try { const url = new URL(value.startsWith("/") ? `https://www.cake.me${value}` : value, "https://www.cake.me"); return url.hostname.endsWith("cake.me") || url.hostname.endsWith("cakeresume.com") ? url.toString() : ""; } catch { return ""; } }
function toSummary(job: CakeJob): JobSummary { return JobSummarySchema.parse({ source: "cake", job_ref: `cake:${job.id}`, job_name: job.title, company: job.company, salary: job.salary || "未提供", location: job.location || "未提供", snippet: job.description.slice(0, MAX_SNIPPET), url: job.url, appear_date: "", fetched_at: new Date().toISOString() }); }
function formatSalary(value: unknown): string { if (!value || typeof value !== "object") return ""; const salary = value as Record<string, unknown>; const min = text(salary.min); const max = text(salary.max); const currency = text(salary.currency); const type = text(salary.type); const suffix = type === "per_year" ? "/ 年" : type === "per_month" ? "/ 月" : type === "per_hour" ? "/ 時" : ""; if (!min && !max) return ""; if (min && max) return `${min} ~ ${max} ${currency}${suffix}`; return `${min || max} ${currency}${suffix}`; }
