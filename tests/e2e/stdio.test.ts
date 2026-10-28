import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverEntry = resolve(process.cwd(), "dist/index.js");
const expectedTools = ["compare_jobs", "get_company_detail", "get_job_details", "search_jobs"];

test("built stdio MCP server lists and completes every exposed tool", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: process.cwd(),
    stderr: "pipe",
  });
  const client = new Client({ name: "job-hunting-mcp-e2e", version: "1.0.0" });
  await client.connect(transport);

  try {
    const listed = await client.listTools();
    const toolNames = listed.tools.map(({ name }) => name).sort();
    assert.deepEqual(toolNames, expectedTools, "new MCP tools must be added to this E2E invocation table");

    const search = await client.callTool({
      name: "search_jobs",
      arguments: { keyword: "SRE", area: ["台北市"], page: 1 },
    });
    assert.equal(search.isError, undefined, "search_jobs should complete successfully");
    const searchText = search.content
      .filter((item): item is { type: "text"; text: string } => item.type === "text")
      .map(({ text }) => text)
      .join("\n");
    for (const label of ["公司：", "職稱：", "工作內容描述：", "薪資：", "104 連結："]) {
      assert.ok(searchText.includes(label), `search_jobs output must include ${label}`);
    }

    const searchData = search.structuredContent as {
      source: string;
      jobs: Array<{ source: string; job_ref: string; url: string; location: string }>;
      source_statuses?: Array<{ source: string; ok: boolean; error?: string }>;
    };
    assert.equal(searchData.source, "multiple");
    assert.ok(searchData.jobs.length >= 10, "default search should return at least 10 listings when enabled sources have enough matches");
    const jobsBySource = new Map<string, number>();
    for (const job of searchData.jobs) jobsBySource.set(job.source, (jobsBySource.get(job.source) ?? 0) + 1);
    for (const count of jobsBySource.values()) assert.ok(count <= 10, "default page size must cap each source at 10 listings");
    for (const job of searchData.jobs) {
      assert.ok(["104", "cake"].includes(job.source));
      assert.match(job.job_ref, /^(104|cake):[a-zA-Z0-9_-]+$/);
      assert.match(job.url, /^https:\/\/(www\.104\.com\.tw\/job|www\.cake\.me\/)/);
      if (job.source === "104") assert.ok(job.location.startsWith("台北市"), `unexpected non-Taipei 104 job: ${job.job_ref}`);
    }

    const taipei104Jobs = searchData.jobs.filter((job) => job.source === "104");
    if (taipei104Jobs.length > 0) {
      const detail = await client.callTool({ name: "get_job_details", arguments: { job_ref: taipei104Jobs[0]!.job_ref } });
      assert.equal(detail.isError, undefined, "get_job_details should complete successfully for a 104 result");
      const detailData = detail.structuredContent as { source: string; job_ref: string; job_name: string; company: string; description: string; salary: string; url: string };
      assert.equal(detailData.source, "104");
      assert.equal(detailData.job_ref, taipei104Jobs[0]!.job_ref);
      assert.ok(detailData.job_name.length > 0);
      assert.ok(detailData.company.length > 0);
      assert.ok(detailData.description.length > 0);
      assert.ok(detailData.salary.length > 0);
      assert.match(detailData.url, /^https:\/\/www\.104\.com\.tw\/job\//);
    } else {
      assert.equal(searchData.source_statuses?.find((status) => status.source === "104")?.ok, false, "missing 104 results must report a source failure");
    }

    const comparisonRefs = taipei104Jobs.length >= 2 ? taipei104Jobs.slice(0, 2).map((job) => job.job_ref) : searchData.jobs.slice(0, 2).map((job) => job.job_ref);
    if (comparisonRefs.length >= 2) {
      const comparison = await client.callTool({ name: "compare_jobs", arguments: { job_refs: comparisonRefs } });
      assert.equal(comparison.isError, undefined, "compare_jobs should complete successfully");
      const comparisonData = comparison.structuredContent as { status: string; items: Array<{ source: string; job_ref: string; salary: { raw: string } }> };
      assert.ok(["complete", "partial"].includes(comparisonData.status));
      if (comparisonData.items.length > 0) assert.ok(comparisonData.items.every((item) => item.salary.raw.length > 0));
      else assert.equal(comparisonData.status, "partial");
    } else {
      const comparison = await client.callTool({ name: "compare_jobs", arguments: { job_refs: ["bad", "also-bad"] } });
      assert.equal(comparison.isError, true);
    }

    const companyRef = taipei104Jobs[0]?.job_ref ?? searchData.jobs[0]?.job_ref ?? "bad";
    const company = await client.callTool({ name: "get_company_detail", arguments: { job_ref: companyRef } });
    if (taipei104Jobs.length > 0) {
      assert.equal(company.isError, undefined, "get_company_detail should complete successfully for a 104 result");
      const companyData = company.structuredContent as { source: string; company_name: string; company_url: string; open_jobs: unknown[] };
      assert.equal(companyData.source, "104");
      assert.ok(companyData.company_name.length > 0);
      assert.match(companyData.company_url, /^https:\/\/www\.104\.com\.tw\/company\//);
      assert.ok(Array.isArray(companyData.open_jobs));
    } else {
      assert.equal(company.isError, true, "company detail must report the unavailable 104 source");
    }
  } finally {
    await client.close();
  }
});
