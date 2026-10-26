import type { SearchQuery } from "../../domain/schemas.js";
import { resolveAreas, resolveJobCategories } from "./code-tables.js";

const SORT_CODES = { relevance: "15", date: "16", salary: "13" } as const;
const JOB_TYPE_CODES: Record<NonNullable<SearchQuery["job_type"]>, string> = {
  全職: "1",
  兼職: "2",
  高階: "3",
  派遣: "4",
  接案: "5",
};

export function buildSearchParams(query: SearchQuery): Record<string, string> {
  const sort = query.sort ?? (query.salary_min !== undefined ? "salary" : "relevance");
  const params: Record<string, string> = {
    jobsource: "joblist_search",
    mode: "s",
    order: SORT_CODES[sort],
    page: String(query.page),
    pagesize: String(query.page_size),
  };
  if (query.keyword) {
    params.keyword = query.keyword;
    params.kwop = "7";
  }
  if (query.area.length) params.area = resolveAreas(query.area).join(",");
  if (query.jobcat.length) params.jobcat = resolveJobCategories(query.jobcat).join(",");
  if (query.salary_min !== undefined) {
    params.scmin = String(query.salary_min);
    params.scstrict = "1";
  }
  if (query.job_type) params.wt = JOB_TYPE_CODES[query.job_type];
  if (query.remote) params.remoteWork = "1,2";
  if (query.is_new) params.isnew = "7";
  if (query.exp_years !== undefined) params.jobexp = String(query.exp_years);
  if (query.edu) params.edu = query.edu;
  return params;
}
