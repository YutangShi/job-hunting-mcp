import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/server.js";
import type { JobSourceAdapter } from "../src/sources/source-adapter.js";

const fakeAdapter: JobSourceAdapter = {
  source: "104",
  async search(query) {
    assert.equal(query.keyword, "SRE");
    assert.equal(query.page_size, 10);
    return {
      source: "104",
      total: 1,
      page: 1,
      page_size: 1,
      has_next: false,
      jobs: [{
        source: "104",
        job_ref: "104:abc12",
        job_name: "SRE 系統工程師",
        company: "測試公司",
        salary: "待遇面議",
        location: "台北市",
        snippet: "合成測試資料",
        url: "https://www.104.com.tw/job/abc12",
        appear_date: "20261025",
        fetched_at: "2026-10-25T00:00:00.000Z",
      }],
    };
  },
  async getDetails(jobRef) {
    return {
      source: "104",
      job_ref: jobRef,
      job_name: "SRE 系統工程師",
      company: "測試公司",
      description: "合成測試詳情",
      requirements: "Linux",
      salary: "待遇面議",
      location: "台北市",
      url: "https://www.104.com.tw/job/abc12",
      fetched_at: "2026-10-25T00:00:00.000Z",
    };
  },
  async close() {},
};

test("MCP server lists and invokes source-neutral job tools", async () => {
  const server = createMcpServer(fakeAdapter);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), ["get_job_details", "search_jobs"]);
    const searchTool = tools.tools.find((tool) => tool.name === "search_jobs");
    assert.ok(searchTool);
    assert.equal("source" in (searchTool.inputSchema.properties ?? {}), false);
    assert.equal(
      (searchTool.inputSchema.properties?.page_size as { default?: number } | undefined)?.default,
      10,
      "search_jobs should advertise a default page size of 10",
    );
    const result = await client.callTool({ name: "search_jobs", arguments: { keyword: "SRE" } });
    assert.equal(result.isError, undefined);
    const structured = result.structuredContent as { jobs: Array<{ source: string; job_ref: string }> };
    assert.equal(structured.jobs[0]?.source, "104");
    assert.equal(structured.jobs[0]?.job_ref, "104:abc12");
    const belowMinimum = await client.callTool({ name: "search_jobs", arguments: { keyword: "SRE", page_size: 9 } });
    assert.equal(belowMinimum.isError, true);
    const detail = await client.callTool({ name: "get_job_details", arguments: { job_ref: "104:abc12" } });
    assert.equal((detail.structuredContent as { source: string }).source, "104");
  } finally {
    await client.close();
    await server.close();
  }
});
