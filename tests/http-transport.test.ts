import test from "node:test";
import assert from "node:assert/strict";
import { ImpersTransport, type ImpersRequestOptions, type ImpersRequester } from "../src/sources/104/http-transport.js";
import { SourceError } from "../src/sources/104/errors.js";

function fakeResponse(status: number, text: string, contentType = "application/json") {
  return {
    status,
    contentType,
    content: Buffer.from(text),
    async close() {},
  };
}

function requester(handler: (url: string, options: ImpersRequestOptions) => ReturnType<ImpersRequester>): ImpersRequester {
  return async (url, options) => handler(url, options);
}

test("HTTP transport uses fixed 104 origin, browser profile and bounded options", async () => {
  let capturedUrl = "";
  let capturedOptions: ImpersRequestOptions | undefined;
  const transport = new ImpersTransport({
    request: requester((url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return Promise.resolve(fakeResponse(200, JSON.stringify({ ok: true })));
    }),
    closeSession: async () => {},
  });
  const result = await transport.getJson("https://www.104.com.tw/jobs/search/api/jobs", { keyword: "SRE" });
  assert.deepEqual(result, { ok: true });
  assert.equal(capturedUrl, "https://www.104.com.tw/jobs/search/api/jobs");
  assert.equal(capturedOptions?.params?.keyword, "SRE");
  assert.equal(capturedOptions?.impersonate, "chrome");
  assert.equal(capturedOptions?.headers.Referer, "https://www.104.com.tw/jobs/search/");
});

test("HTTP transport rejects non-104 origins without network access", async () => {
  let calls = 0;
  const transport = new ImpersTransport({
    request: requester(() => { calls += 1; return Promise.resolve(fakeResponse(200, "{}")); }),
    closeSession: async () => {},
  });
  await assert.rejects(() => transport.getJson("https://example.com/jobs"), (error: unknown) => {
    assert.ok(error instanceof SourceError);
    assert.equal(error.code, "SOURCE_UNAVAILABLE");
    return true;
  });
  assert.equal(calls, 0);
});

test("HTTP 403 and 429 are returned as explicit errors without retry", async () => {
  for (const [status, code] of [[403, "SOURCE_FORBIDDEN"], [429, "SOURCE_RATE_LIMITED"]] as const) {
    let calls = 0;
    const transport = new ImpersTransport({
      request: requester(() => { calls += 1; return Promise.resolve(fakeResponse(status, "{}")); }),
      closeSession: async () => {},
    });
    await assert.rejects(() => transport.getJson("https://www.104.com.tw/jobs/search/api/jobs"), (error: unknown) => {
      assert.ok(error instanceof SourceError);
      assert.equal(error.code, code);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("HTTP 200 verification page is not parsed as an empty search", async () => {
  const transport = new ImpersTransport({
    request: requester(() => Promise.resolve(fakeResponse(200, "<!doctype html><html>verify</html>", "text/html"))),
    closeSession: async () => {},
  });
  await assert.rejects(() => transport.getJson("https://www.104.com.tw/jobs/search/api/jobs"), (error: unknown) => {
    assert.ok(error instanceof SourceError);
    assert.equal(error.code, "SOURCE_CHALLENGE");
    return true;
  });
});

test("HTTP transport aborts response once streamed bytes exceed the limit", async () => {
  let calls = 0;
  const transport = new ImpersTransport({
    maxResponseBytes: 8,
    request: requester((_url, options) => {
      calls += 1;
      options.contentCallback(Buffer.from("0123456789"));
      assert.equal(options.signal.aborted, true);
      throw new Error("aborted oversized response");
    }),
    closeSession: async () => {},
  });
  await assert.rejects(() => transport.getJson("https://www.104.com.tw/jobs/search/api/jobs"), (error: unknown) => {
    assert.ok(error instanceof SourceError);
    assert.equal(error.code, "SOURCE_UNAVAILABLE");
    assert.match(error.message, /超過允許大小/);
    return true;
  });
  assert.equal(calls, 1);
});

test("HTTP transport serializes concurrent upstream requests with the configured interval", async () => {
  const starts: number[] = [];
  const transport = new ImpersTransport({
    minimumIntervalMs: 30,
    request: requester(() => {
      starts.push(Date.now());
      return Promise.resolve(fakeResponse(200, "{}"));
    }),
    closeSession: async () => {},
  });
  await Promise.all([1, 2, 3].map(() => transport.getJson("https://www.104.com.tw/jobs/search/api/jobs")));
  assert.equal(starts.length, 3);
  assert.ok(starts[1]! - starts[0]! >= 20);
  assert.ok(starts[2]! - starts[1]! >= 20);
});
