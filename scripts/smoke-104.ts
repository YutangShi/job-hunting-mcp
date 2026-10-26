import { ImpersTransport } from "../src/sources/104/http-transport.js";
import { Job104Adapter } from "../src/sources/104/adapter.js";

const adapter = new Job104Adapter(new ImpersTransport());

try {
  const result = await adapter.search({ keyword: "SRE", area: ["台北市"], page: 1, page_size: 20 });
  const relevant = result.jobs.filter((job) => /\bSRE\b|site reliability/i.test(job.job_name));
  const outsideTaipei = result.jobs.filter((job) => !job.location.startsWith("台北市"));
  if (relevant.length < 2) {
    throw new Error(`台北市 SRE 搜尋需至少回傳 2 筆職稱符合 SRE／Site Reliability 的職缺，實際 ${relevant.length} 筆。`);
  }
  if (outsideTaipei.length > 0) {
    throw new Error(`台北市篩選回傳 ${outsideTaipei.length} 筆非台北市職缺。`);
  }
  const selected = relevant[0]!;
  const details = await adapter.getDetails(selected.job_ref);
  if (details.job_ref !== selected.job_ref || details.source !== "104") {
    throw new Error("詳情 reference 或來源與搜尋結果不一致。");
  }
  console.log(JSON.stringify({
    source: result.source,
    query: { keyword: "SRE", area: ["台北市"] },
    resultCount: result.jobs.length,
    total: result.total,
    relevantCount: relevant.length,
    allLocationsMatch: outsideTaipei.length === 0,
    matchingJobs: relevant.map(({ job_name, company, location, job_ref, url }) => ({ job_name, company, location, job_ref, url })),
    selected: { job_name: selected.job_name, company: selected.company, url: selected.url, job_ref: selected.job_ref },
    detail: { job_name: details.job_name, company: details.company, url: details.url },
    fetched_at: result.jobs[0]?.fetched_at,
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await adapter.close();
}
