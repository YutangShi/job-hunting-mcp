import { CakeAdapter } from "../src/sources/cake/adapter.js";
import { CakeHtmlTransport } from "../src/sources/cake/http-transport.js";

const adapter = new CakeAdapter(new CakeHtmlTransport());
try {
  const result = await adapter.search({ keyword: "SRE" });
  if (result.jobs.length < 1) throw new Error("Cake SRE 搜尋沒有回傳職缺。");
  const first = result.jobs[0]!;
  const detail = await adapter.getDetails(first.job_ref);
  if (detail.source !== "cake" || detail.job_ref !== first.job_ref || !detail.description) throw new Error("Cake 詳情 reference 或內容驗證失敗。");
  console.log(JSON.stringify({ source: result.source, resultCount: result.jobs.length, first: { job_name: first.job_name, company: first.company, salary: first.salary, location: first.location, url: first.url, job_ref: first.job_ref }, detail: { job_name: detail.job_name, company: detail.company, url: detail.url } }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally { await adapter.close(); }
