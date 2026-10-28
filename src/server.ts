import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SearchQuerySchema } from "./domain/schemas.js";
import { SourceError } from "./sources/104/errors.js";
import { ImpersTransport } from "./sources/104/http-transport.js";
import { Job104Adapter } from "./sources/104/adapter.js";
import type { JobSourceAdapter } from "./sources/source-adapter.js";
import { compareJobs } from "./services/job-analysis.js";

const searchInputShape = {
  keyword: z.string().trim().max(100).optional().describe("職務關鍵字，例如 SRE、DevOps、資料工程師"),
  area: z.array(z.string().trim().min(1).max(80)).max(10).optional().describe("104 地區名稱，例如 台北市、新竹市"),
  jobcat: z.array(z.string().trim().min(1).max(100)).max(10).optional().describe("104 職類名稱，例如 系統工程師"),
  salary_min: z.number().int().positive().optional().describe("薪資下限；104 端點的薪資條件可能是排序而非硬性篩選"),
  job_type: z.enum(["全職", "兼職", "高階", "派遣", "接案"]).optional(),
  remote: z.boolean().optional(),
  is_new: z.boolean().optional().describe("是否限定近期刊登職缺"),
  exp_years: z.number().int().min(0).max(99).optional(),
  edu: z.string().trim().max(20).optional().describe("104 學歷代碼"),
  sort: z.enum(["relevance", "date", "salary"]).optional(),
  page: z.number().int().min(1).max(100).optional(),
  page_size: z.number().int().min(10).max(20).default(10).describe("每個來源預設搜尋 10 筆；可指定 10 至 20 筆"),
};

export function createMcpServer(adapter: JobSourceAdapter = new Job104Adapter(new ImpersTransport())): McpServer {
  const server = new McpServer({ name: "job-hunting-mcp", version: "0.1.0" });

  server.registerTool("search_jobs", {
    title: "搜尋職缺",
    description: "自動搜尋已啟用的 104 與 Cake 公開職缺。直接輸入職務條件即可，不需指定來源；例如 keyword='SRE'。每個來源預設回傳 10 筆，可指定 10–20 筆；來源符合條件的職缺不足時會回傳實際筆數。每筆結果包含公司、職稱、工作內容描述、薪資、原始職缺連結、來源和可供 get_job_details 使用的來源限定 job_ref。",
    inputSchema: searchInputShape,
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async (args) => {
    try {
      const query = SearchQuerySchema.parse(args);
      if (!query.keyword && query.area.length === 0 && query.jobcat.length === 0) {
        throw new SourceError("INVALID_FILTER", "請至少提供 keyword、area 或 jobcat 其中一項搜尋條件。");
      }
      const result = await adapter.search(query);
      const text = formatSearchResult(result);
      return { content: [{ type: "text", text }], structuredContent: result as unknown as Record<string, unknown> };
    } catch (error) {
      return toolError(error);
    }
  });

  server.registerTool("get_job_details", {
    title: "讀取職缺詳情",
    description: "讀取職缺完整內容。job_ref 必須來自 search_jobs 結果；目前 V1 只支援來源 104。",
    inputSchema: {
      job_ref: z.string().min(1).max(80).describe("search_jobs 結果中的 job_ref，例如 104:8ue17"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ job_ref }) => {
    try {
      const result = await adapter.getDetails(job_ref);
      return {
        content: [{ type: "text", text: formatJobDetail(result) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return toolError(error);
    }
  });

  server.registerTool("compare_jobs", {
    title: "比較職缺",
    description: "比較兩至十筆 search_jobs 回傳的來源限定 job_ref，回傳公司、職稱、工作內容、薪資、地點、條件、來源與資料狀態；不接受任意 URL。",
    inputSchema: {
      job_refs: z.array(z.string().min(1).max(140)).min(2).max(10).describe("search_jobs 結果中的 2 至 10 筆 job_ref"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ job_refs }) => {
    try {
      const result = await compareJobs(adapter, job_refs);
      return { content: [{ type: "text", text: formatComparison(result) }], structuredContent: result as unknown as Record<string, unknown> };
    } catch (error) { return toolError(error); }
  });

  server.registerTool("get_company_detail", {
    title: "讀取公司詳情",
    description: "依 search_jobs 回傳的 job_ref 讀取所屬公司的公開詳情與公開職缺清單；不接受任意公司 URL 或私人聯絡資料。",
    inputSchema: { job_ref: z.string().min(1).max(140).describe("search_jobs 結果中的 job_ref，例如 104:8ue17") },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ job_ref }) => {
    try {
      if (!adapter.getCompanyDetail) throw new SourceError("UNSUPPORTED_SOURCE_CAPABILITY", "目前職缺來源不支援公司詳情。");
      const result = await adapter.getCompanyDetail(job_ref);
      return { content: [{ type: "text", text: formatCompanyDetail(result) }], structuredContent: result as unknown as Record<string, unknown> };
    } catch (error) { return toolError(error); }
  });

  return server;
}

function toolError(error: unknown) {
  const sourceError = error instanceof SourceError
    ? error
    : new SourceError("SOURCE_UNAVAILABLE", "查詢失敗，請稍後再試。", { cause: error });
  const result = { source: "104", error: { code: sourceError.code, message: sourceError.message } };
  return {
    isError: true,
    content: [{ type: "text" as const, text: `${sourceError.code}: ${sourceError.message}` }],
    structuredContent: result,
  };
}

function formatSearchResult(result: Awaited<ReturnType<JobSourceAdapter["search"]>>): string {
  if (result.jobs.length === 0) {
    return `來源：${result.source}\n查無符合條件的職缺。104 回報總筆數：${result.total}。`;
  }
  const lines = result.jobs.map((job, index) => [
    `${index + 1}. 職稱：${job.job_name || "未提供"}`,
    `公司：${job.company || "未提供"}`,
    `工作內容描述：${job.snippet || "未提供"}`,
    `薪資：${job.salary || "未提供"}`,
    `104 連結：${job.url}`,
    `地點：${job.location || "未提供"}`,
    `來源：${job.source}`,
    `job_ref：${job.job_ref}`,
  ].join("\n"));
  const sourceStatuses = (result as Awaited<ReturnType<JobSourceAdapter["search"]>> & { source_statuses?: Array<{ source: string; ok: boolean; error?: string }> }).source_statuses;
  const statuses = sourceStatuses ? `\n來源狀態：${sourceStatuses.map((status) => `${status.source}=${status.ok ? "成功" : `失敗(${status.error ?? "unknown"})`}`).join("、")}` : "";
  const note = `${result.salary_filter_note ? `\n${result.salary_filter_note}` : ""}${statuses}`;
  return `搜尋來源：${result.source}；第 ${result.page} 頁；本頁 ${result.jobs.length} 筆；總數 ${result.total}；尚有下一頁：${result.has_next ? "是" : "否"}${note}\n\n${lines.join("\n\n")}`;
}

function formatJobDetail(detail: Awaited<ReturnType<JobSourceAdapter["getDetails"]>>): string {
  return [
    `職稱：${detail.job_name}`,
    `公司：${detail.company || "未提供"}`,
    `來源：${detail.source}`,
    `地點：${detail.location || "未提供"}`,
    `薪資：${detail.salary || "未提供"}`,
    `條件：\n${detail.requirements || "未提供"}`,
    `職務內容：\n${detail.description || "未提供"}`,
    `職缺：${detail.url}`,
    `job_ref：${detail.job_ref}`,
  ].join("\n\n");
}

function formatComparison(result: Awaited<ReturnType<typeof compareJobs>>): string {
  const rows = result.items.map((item, index) => [
    `${index + 1}. ${item.job_name}`,
    `公司：${item.company || "未提供"}`,
    `薪資：${item.salary.raw || "未提供"}`,
    `地點：${item.location || "未提供"}`,
    `工作內容描述：${item.description || "未提供"}`,
    `條件：${item.requirements || "未提供"}`,
    `來源：${item.source}`,
    `連結：${item.url}`,
    `job_ref：${item.job_ref}`,
  ].join("\n"));
  const failures = result.failures.length > 0 ? `\n\n失敗項目：${result.failures.map((item) => `${item.job_ref}（${item.code}）`).join("、")}` : "";
  return `比較狀態：${result.status}\n\n${rows.join("\n\n")}${failures}`;
}

function formatCompanyDetail(company: Awaited<ReturnType<NonNullable<JobSourceAdapter["getCompanyDetail"]>>>): string {
  return [
    `公司：${company.company_name}`,
    `來源：${company.source}`,
    `產業：${company.industry || "未提供"}`,
    `規模：${company.size || "未提供"}`,
    `公司連結：${company.company_url}`,
    `公司介紹：\n${company.description || "未提供"}`,
    `目前公開職缺：${company.open_jobs.length} 筆`,
    ...company.open_jobs.map((job, index) => `${index + 1}. ${job.job_name}｜${job.location || "未提供"}｜${job.url}`),
  ].join("\n\n");
}
