import type { JobDetail, SearchQuery, SearchResponse } from "../domain/schemas.js";
import { SourceError } from "./104/errors.js";
import type { JobSourceAdapter } from "./source-adapter.js";

export type SourceStatus = { source: string; ok: boolean; error?: string };
export type MultiSourceResponse = SearchResponse & { source: "multiple"; source_statuses: SourceStatus[] };

export class MultiSourceAdapter implements JobSourceAdapter {
  readonly source = "multiple" as const;
  constructor(private readonly adapters: readonly JobSourceAdapter[]) {}

  async search(query: SearchQuery): Promise<MultiSourceResponse> {
    if (this.adapters.length === 0) throw new SourceError("SOURCE_UNAVAILABLE", "沒有啟用的職缺來源。");
    const outcomes = await Promise.all(this.adapters.map(async (adapter) => {
      try { return { adapter, result: await adapter.search(query) } as const; }
      catch (error) { return { adapter, error } as const; }
    }));
    const sourceStatuses: SourceStatus[] = outcomes.map((item) => item.result
      ? { source: item.adapter.source, ok: true }
      : { source: item.adapter.source, ok: false, error: safeError(item.error) });
    const successful = outcomes.filter((item): item is { adapter: JobSourceAdapter; result: SearchResponse } => "result" in item);
    if (successful.length === 0) throw new SourceError("SOURCE_UNAVAILABLE", `所有職缺來源查詢失敗：${sourceStatuses.map((item) => `${item.source}=${item.error}`).join("、")}`);
    return {
      source: "multiple",
      total: successful.reduce((sum, item) => sum + item.result.total, 0),
      page: query.page,
      page_size: successful.reduce((sum, item) => sum + item.result.jobs.length, 0),
      has_next: successful.some((item) => item.result.has_next),
      jobs: successful.flatMap((item) => item.result.jobs),
      source_statuses: sourceStatuses,
    };
  }

  async getDetails(jobRef: string): Promise<JobDetail> {
    const source = jobRef.split(":", 1)[0];
    const adapter = this.adapters.find((candidate) => candidate.source === source);
    if (!adapter) throw new SourceError("INVALID_JOB_REF", "job_ref 的來源未啟用或不受支援。");
    return adapter.getDetails(jobRef);
  }

  async close(): Promise<void> { await Promise.all(this.adapters.map((adapter) => adapter.close())); }
}

function safeError(error: unknown): string { return error instanceof SourceError ? error.code : "SOURCE_UNAVAILABLE"; }
