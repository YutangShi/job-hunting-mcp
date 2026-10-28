import type { CompanyDetail } from "../domain/analysis-schemas.js";
import type { JobDetail, SearchQuery, SearchResponse } from "../domain/schemas.js";

export interface JobSourceAdapter {
  readonly source: string;
  search(query: SearchQuery): Promise<SearchResponse>;
  getDetails(jobRef: string): Promise<JobDetail>;
  getCompanyDetail?(jobRef: string): Promise<CompanyDetail>;
  close(): Promise<void>;
}

export type SourceSearchResponse = SearchResponse & { source: string };
