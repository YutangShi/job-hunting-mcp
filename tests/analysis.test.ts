import test from "node:test";
import assert from "node:assert/strict";
import { compareJobs } from "../src/services/job-analysis.js";
import type { JobSourceAdapter } from "../src/sources/source-adapter.js";
import type { JobDetail } from "../src/domain/schemas.js";

const details: Record<string, JobDetail> = {
  "104:a1111": {
    source: "104", job_ref: "104:a1111", job_name: "SRE", company: "甲公司",
    description: "維運 Kubernetes 與 Linux", requirements: "Linux\nKubernetes",
    salary: "月薪 70,000～90,000 元", location: "台北市", url: "https://www.104.com.tw/job/a1111",
    fetched_at: "2026-10-27T00:00:00.000Z",
  },
  "104:b2222": {
    source: "104", job_ref: "104:b2222", job_name: "DevOps", company: "乙公司",
    description: "雲端平台與自動化", requirements: "AWS\nTerraform",
    salary: "待遇面議", location: "新竹市", url: "https://www.104.com.tw/job/b2222",
    fetched_at: "2026-10-27T00:00:01.000Z",
  },
};

const adapter: JobSourceAdapter = {
  source: "104",
  async search() { throw new Error("not used"); },
  async getDetails(jobRef) {
    const detail = details[jobRef];
    if (!detail) throw new Error("missing detail");
    return detail;
  },
  async close() {},
};

test("compareJobs returns source-traceable comparison rows", async () => {
  const result = await compareJobs(adapter, ["104:a1111", "104:b2222"]);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.source, "104");
  assert.equal(result.items[0]?.job_ref, "104:a1111");
  assert.equal(result.items[0]?.salary.raw, "月薪 70,000～90,000 元");
  assert.equal(result.items[1]?.salary.comparability, "unknown");
  assert.equal(result.status, "complete");
});

test("compareJobs reports partial failures without dropping successful rows", async () => {
  const result = await compareJobs(adapter, ["104:a1111", "104:missing"]);
  assert.equal(result.status, "partial");
  assert.equal(result.items.length, 1);
  assert.equal(result.failures[0]?.job_ref, "104:missing");
});

test("compareJobs rejects duplicate or over-limit references before fetching", async () => {
  let calls = 0;
  const countingAdapter: JobSourceAdapter = { ...adapter, async getDetails(jobRef) { calls += 1; return adapter.getDetails(jobRef); } };
  await assert.rejects(() => compareJobs(countingAdapter, ["104:a1111", "104:a1111"]), /不接受重複/);
  await assert.rejects(() => compareJobs(countingAdapter, Array.from({ length: 11 }, (_, index) => `104:a${String(index).padStart(4, "0")}`)), /2 至 10/);
  assert.equal(calls, 0);
});
