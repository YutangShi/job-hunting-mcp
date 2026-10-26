import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverEntry = resolve(process.cwd(), "dist/index.js");
const expectedTools = ["get_job_details", "search_jobs"];

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

    const detail = await client.callTool({
      name: "get_job_details",
      arguments: { job_ref: searchData.jobs[0]!.job_ref },
    });
    assert.equal(detail.isError, undefined, "get_job_details should complete successfully");
    const detailData = detail.structuredContent as {
      source: string;
      job_ref: string;
      job_name: string;
      company: string;
      description: string;
      salary: string;
      url: string;
    };
    assert.equal(detailData.source, "104");
    assert.equal(detailData.job_ref, searchData.jobs[0]!.job_ref);
    assert.ok(detailData.job_name.length > 0);
    assert.ok(detailData.company.length > 0);
    assert.ok(detailData.description.length > 0);
    assert.ok(detailData.salary.length > 0);
    assert.match(detailData.url, /^https:\/\/www\.104\.com\.tw\/job\//);
  } finally {
    await client.close();
  }
});
