import type { JobDetail, SearchQuery, SearchResponse } from "../domain/schemas.js";

export interface JobSourceAdapter {
  readonly source: string;
  search(query: SearchQuery): Promise<SearchResponse>;
  getDetails(jobRef: string): Promise<JobDetail>;
  close(): Promise<void>;
}

export type SourceSearchResponse = SearchResponse & { source: string };
