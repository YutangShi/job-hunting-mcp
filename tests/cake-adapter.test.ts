import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CakeAdapter } from "../src/sources/cake/adapter.js";

class FakeCakeTransport {
  constructor(private readonly html: string) {}
  async getText(): Promise<string> { return this.html; }
  async close(): Promise<void> {}
}

const fixture = await readFile(resolve(process.cwd(), "tests/fixtures/cake-search.html"), "utf8");

test("Cake adapter parses Next.js listings with cake-qualified references", async () => {
  const adapter = new CakeAdapter(new FakeCakeTransport(fixture));
  const result = await adapter.search({ keyword: "SRE" });
  assert.equal(result.source, "cake");
  assert.equal(result.jobs.length, 2);
  assert.equal(result.jobs[0]?.job_ref, "cake:senior-sre-engineer");
  assert.equal(result.jobs[0]?.company, "Cake Test Co.");
  assert.match(result.jobs[0]?.url ?? "", /^https:\/\/www\.cake\.me\//);
});

test("Cake adapter routes detail lookups from a cake-qualified reference", async () => {
  const adapter = new CakeAdapter(new FakeCakeTransport(fixture));
  const detail = await adapter.getDetails("cake:senior-sre-engineer");
  assert.equal(detail.source, "cake");
  assert.equal(detail.job_ref, "cake:senior-sre-engineer");
  assert.equal(detail.company, "Cake Test Co.");
  assert.match(detail.description, /Kubernetes/);
});
