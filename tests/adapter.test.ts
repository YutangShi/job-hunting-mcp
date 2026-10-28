import test from "node:test";
import assert from "node:assert/strict";
import { Job104Adapter } from "../src/sources/104/adapter.js";
import { SourceError } from "../src/sources/104/errors.js";
import { buildSearchParams } from "../src/sources/104/params.js";
import { SearchQuerySchema } from "../src/domain/schemas.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const searchFixture = JSON.parse(await readFile(resolve(here, "fixtures/search.json"), "utf8")) as unknown;
const detailFixture = JSON.parse(await readFile(resolve(here, "fixtures/detail.json"), "utf8")) as unknown;

class FakeTransport {
  calls: Array<{ url: string; params?: Record<string, string> }> = [];
  constructor(private readonly responses: unknown[]) {}
  async getJson(url: string, params?: Record<string, string>): Promise<unknown> {
    this.calls.push({ url, ...(params ? { params } : {}) });
    const next = this.responses.shift();
    if (next instanceof Error) throw next;
    return next;
  }
  async close(): Promise<void> {}
}

class FakeCompanyTransport extends FakeTransport {
  constructor(private readonly html: string) { super([searchFixture]); }
  async getText(url: string): Promise<string> {
    this.calls.push({ url });
    return this.html;
  }
}

test("search maps 104 records and defaults to a 10-result page", async () => {
  const oversized = structuredClone(searchFixture) as { data: Array<{ descSnippet: string }> };
  oversized.data[0]!.descSnippet = "x".repeat(600);
  const transport = new FakeTransport([oversized]);
  const adapter = new Job104Adapter(transport);
  const result = await adapter.search({ keyword: "SRE" });
  assert.equal(result.source, "104");
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0]?.job_ref, "104:abc12");
  assert.equal(result.jobs[0]?.source, "104");
  assert.equal(result.jobs[0]?.url, "https://www.104.com.tw/job/abc12");
  assert.equal(result.jobs[0]?.snippet.length, 500);
  assert.equal(result.has_next, true);
  assert.equal(transport.calls[0]?.params?.keyword, "SRE");
});

test("search rejects an upstream job URL outside the 104 origin", async () => {
  const bad = structuredClone(searchFixture) as { data: Array<{ link: { job: string } }> };
  bad.data[0]!.link.job = "https://evil.example/job/abc12";
  const adapter = new Job104Adapter(new FakeTransport([bad]));
  const result = await adapter.search({ keyword: "SRE" });
  assert.equal(result.jobs.length, 0);
});

test("details route through a validated short-code reference", async () => {
  const transport = new FakeTransport([detailFixture]);
  const adapter = new Job104Adapter(transport);
  const detail = await adapter.getDetails("104:abc12");
  assert.equal(detail.source, "104");
  assert.equal(detail.job_ref, "104:abc12");
  assert.match(detail.url, /www\.104\.com\.tw\/job\/abc12$/);
  assert.match(detail.requirements, /經驗：2年以上/);
  assert.doesNotMatch(JSON.stringify(detail), /secret-contact|candidate-state|interactionRecord/);
  assert.equal(transport.calls[0]?.url, "https://www.104.com.tw/job/ajax/content/abc12");
});

test("invalid job references do not issue network calls", async () => {
  const transport = new FakeTransport([detailFixture]);
  const adapter = new Job104Adapter(transport);
  await assert.rejects(() => adapter.getDetails("https://evil.example/job/x"), (error: unknown) => {
    assert.ok(error instanceof SourceError);
    assert.equal(error.code, "INVALID_JOB_REF");
    return true;
  });
  assert.equal(transport.calls.length, 0);
});

test("query validation and code tables reject unknown filters", () => {
  const query = SearchQuerySchema.parse({ keyword: " SRE " });
  assert.equal(query.page_size, 10);
  const params = buildSearchParams({ ...query, area: ["台北市"], jobcat: ["系統工程師"] });
  assert.equal(params.keyword, "SRE");
  assert.equal(params.area, "6001001000");
  assert.match(params.jobcat ?? "", /^\d+$/);
  assert.equal(buildSearchParams({ ...query, salary_min: 80_000 }).order, "13");
  assert.throws(() => buildSearchParams({ ...query, area: ["不存在的地區"] }), (error: unknown) => {
    assert.ok(error instanceof SourceError);
    assert.equal(error.code, "INVALID_FILTER");
    return true;
  });
  assert.throws(() => SearchQuerySchema.parse({ keyword: "SRE", page_size: 9 }));
});

test("malformed upstream payload is reported as schema changed", async () => {
  const adapter = new Job104Adapter(new FakeTransport([{ data: [{ something: true }] }]));
  await assert.rejects(() => adapter.search({ keyword: "SRE" }), (error: unknown) => {
    assert.ok(error instanceof SourceError);
    assert.equal(error.code, "SOURCE_SCHEMA_CHANGED");
    return true;
  });
});

test("company detail uses the company link captured from a validated job search result", async () => {
  const transport = new FakeCompanyTransport(await readFile(resolve(here, "fixtures/company.html"), "utf8"));
  const adapter = new Job104Adapter(transport);
  await adapter.search({ keyword: "SRE" });
  const result = await adapter.getCompanyDetail("104:abc12");
  assert.equal(result.source, "104");
  assert.equal(result.company_name, "合成測試股份有限公司");
  assert.equal(result.industry, "軟體及網路相關業");
  assert.equal(result.company_url, "https://www.104.com.tw/company/synthetic");
  assert.equal(result.open_jobs.length, 1);
  assert.equal(transport.calls.at(-1)?.url, "https://www.104.com.tw/company/synthetic");
});
