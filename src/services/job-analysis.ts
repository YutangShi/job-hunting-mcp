import type { JobDetail } from "../domain/schemas.js";
import type { JobSourceAdapter } from "../sources/source-adapter.js";
import { JobComparisonResultSchema, type JobComparisonItem, type JobComparisonResult, type SalaryComparison } from "../domain/analysis-schemas.js";

const MAX_COMPARE_REFS = 10;
const JOB_REF_PATTERN = /^(104|cake):[A-Za-z0-9_-]{3,120}$/;

export type { JobComparisonResult } from "../domain/analysis-schemas.js";

export async function compareJobs(adapter: JobSourceAdapter, jobRefs: string[]): Promise<JobComparisonResult> {
  if (!Array.isArray(jobRefs) || jobRefs.length < 2 || jobRefs.length > MAX_COMPARE_REFS) {
    throw new Error(`compare_jobs 需要 2 至 ${MAX_COMPARE_REFS} 筆 job_ref。`);
  }
  const uniqueRefs = [...new Set(jobRefs)];
  if (uniqueRefs.length !== jobRefs.length) throw new Error("compare_jobs 不接受重複的 job_ref。");
  for (const ref of uniqueRefs) {
    if (!JOB_REF_PATTERN.test(ref)) throw new Error("job_ref 格式無效；請使用 search_jobs 回傳的來源限定 reference。");
  }

  const outcomes = await Promise.all(uniqueRefs.map(async (jobRef) => {
    try {
      return { detail: await adapter.getDetails(jobRef) } as const;
    } catch (error) {
      return { job_ref: jobRef, error } as const;
    }
  }));
  const items = outcomes.flatMap((outcome) => "detail" in outcome ? [toComparison(outcome.detail)] : []);
  const failures = outcomes.flatMap((outcome) => "detail" in outcome ? [] : [{
    job_ref: outcome.job_ref,
    code: errorCode(outcome.error),
    message: safeMessage(outcome.error),
  }]);
  return JobComparisonResultSchema.parse({ status: failures.length === 0 ? "complete" : "partial", items, failures });
}

function toComparison(detail: JobDetail): JobComparisonItem {
  return {
    source: detail.source,
    job_ref: detail.job_ref,
    job_name: detail.job_name,
    company: detail.company,
    description: detail.description,
    requirements: detail.requirements,
    salary: parseSalary(detail.salary),
    location: detail.location,
    url: detail.url,
    fetched_at: detail.fetched_at,
    evidence: "explicit",
  };
}

function parseSalary(raw: string): SalaryComparison {
  const text = raw.trim();
  const period = text.match(/時薪|日薪|月薪|年薪/)?.[0];
  const values = [...text.matchAll(/[0-9][0-9,]*/g)].map((match) => Number(match[0].replaceAll(",", ""))).filter(Number.isFinite);
  const normalizedPeriod = period === "時薪" ? "hourly" : period === "日薪" ? "daily" : period === "月薪" ? "monthly" : period === "年薪" ? "yearly" : undefined;
  if (!normalizedPeriod || values.length === 0 || /面議|面谈|面談/i.test(text)) return { raw, comparability: "unknown" };
  const min = values[0];
  const max = values[1] ?? min;
  if (min === undefined || max === undefined) return { raw, comparability: "unknown" };
  return { raw, min, max, period: normalizedPeriod, comparability: "comparable" };
}

function errorCode(error: unknown): string { return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "SOURCE_UNAVAILABLE"; }
function safeMessage(error: unknown): string { return error instanceof Error ? error.message : "查詢失敗。"; }
