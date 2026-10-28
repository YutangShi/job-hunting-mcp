import * as impers from "impers";
import { SourceError } from "./errors.js";

export type JsonResponse = { status: number; contentType: string | null; body: unknown };

export interface HttpTransport {
  getJson(url: string, params?: Record<string, string>): Promise<unknown>;
  getText?(url: string, params?: Record<string, string>): Promise<string>;
  close(): Promise<void>;
}

export type ImpersTransportOptions = {
  minimumIntervalMs?: number;
  timeoutSeconds?: number;
  maxResponseBytes?: number;
  impersonate?: string;
  request?: ImpersRequester;
  closeSession?: () => Promise<void>;
};

export type HttpResponse = {
  status: number;
  contentType: string | null;
  content: Buffer;
  close(): Promise<void>;
};

export type ImpersRequestOptions = {
  params?: Record<string, string>;
  impersonate: string;
  timeout: number;
  connectTimeout: number;
  headers: typeof DEFAULT_HEADERS;
  signal: AbortSignal;
  contentCallback: (chunk: Buffer) => void;
  headerCallback: (chunk: Buffer) => void;
};

export type ImpersRequester = (url: string, options: ImpersRequestOptions) => Promise<HttpResponse>;

const ALLOWED_ORIGIN = "https://www.104.com.tw";
const DEFAULT_HEADERS = {
  Referer: "https://www.104.com.tw/jobs/search/",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
};

export class ImpersTransport implements HttpTransport {
  private readonly intervalMs: number;
  private readonly timeoutSeconds: number;
  private readonly maxResponseBytes: number;
  private readonly impersonate: string;
  private readonly request: ImpersRequester;
  private readonly closeSession: () => Promise<void>;
  private queue: Promise<void> = Promise.resolve();
  private lastRequestStarted = 0;

  constructor(options: ImpersTransportOptions = {}) {
    this.intervalMs = options.minimumIntervalMs ?? 1_000;
    this.timeoutSeconds = options.timeoutSeconds ?? 20;
    this.maxResponseBytes = options.maxResponseBytes ?? 5 * 1024 * 1024;
    this.impersonate = options.impersonate ?? "chrome";
    this.request = options.request ?? impers.get;
    this.closeSession = options.closeSession ?? impers.closeSharedSession;
  }

  async getJson(url: string, params?: Record<string, string>): Promise<unknown> {
    const parsed = new URL(url);
    if (parsed.origin !== ALLOWED_ORIGIN) {
      throw new SourceError("SOURCE_UNAVAILABLE", "拒絕連線至非 104 來源網址。");
    }
    return this.withPacing(async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          return await this.performGet(url, params);
        } catch (error) {
          if (error instanceof SourceError) throw error;
          lastError = error;
          if (attempt === 0) await delay(300);
        }
      }
      const message = lastError instanceof Error ? lastError.message : "未知連線錯誤";
      if (/timed?\s*out|timeout/i.test(message)) {
        throw new SourceError("SOURCE_TIMEOUT", "104 查詢逾時。", { cause: lastError });
      }
      throw new SourceError("SOURCE_UNAVAILABLE", "無法連線至 104 搜尋服務。", { cause: lastError });
    });
  }

  async getText(url: string, params?: Record<string, string>): Promise<string> {
    const parsed = new URL(url);
    if (parsed.origin !== ALLOWED_ORIGIN) throw new SourceError("SOURCE_UNAVAILABLE", "拒絕連線至非 104 來源網址。");
    return this.withPacing(async () => {
      const response = await this.request(url, {
        ...(params ? { params } : {}),
        impersonate: this.impersonate,
        timeout: this.timeoutSeconds,
        connectTimeout: Math.min(10, this.timeoutSeconds),
        headers: { ...DEFAULT_HEADERS, Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" },
        signal: new AbortController().signal,
        contentCallback: () => {},
        headerCallback: () => {},
      }).catch((error: unknown) => { throw new SourceError("SOURCE_UNAVAILABLE", "無法連線至 104 公司服務。", { cause: error }); });
      try {
        if (response.content.byteLength > this.maxResponseBytes) throw new SourceError("SOURCE_UNAVAILABLE", "104 回應超過允許大小。");
        if (response.status === 429) throw new SourceError("SOURCE_RATE_LIMITED", "104 暫時限制查詢，請稍後再試。");
        if ([401, 403].includes(response.status)) throw new SourceError("SOURCE_FORBIDDEN", `104 回應 HTTP ${response.status}。`);
        if (response.status < 200 || response.status >= 300) throw new SourceError("SOURCE_UNAVAILABLE", `104 回應 HTTP ${response.status}。`);
        const text = response.content.toString("utf8");
        if (/just a moment|cf-chl-|驗證碼|captcha/i.test(text)) throw new SourceError("SOURCE_CHALLENGE", "104 回傳驗證頁，未取得公司資料。");
        return text;
      } finally { await response.close(); }
    });
  }

  async close(): Promise<void> {
    await this.closeSession();
  }

  private async performGet(url: string, params?: Record<string, string>): Promise<unknown> {
    const controller = new AbortController();
    let receivedBytes = 0;
    let oversized = false;
    const response = await this.request(url, {
      ...(params ? { params } : {}),
      impersonate: this.impersonate,
      timeout: this.timeoutSeconds,
      connectTimeout: Math.min(10, this.timeoutSeconds),
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      contentCallback: (chunk) => {
        receivedBytes += chunk.byteLength;
        if (receivedBytes > this.maxResponseBytes) {
          oversized = true;
          controller.abort("response size limit exceeded");
        }
      },
      headerCallback: (chunk) => {
        const headerText = chunk.toString("latin1");
        const length = headerText.match(/^content-length:\s*(\d+)/im)?.[1];
        if (length && Number(length) > this.maxResponseBytes) {
          oversized = true;
          controller.abort("content length exceeds response size limit");
        }
      },
    }).catch((error: unknown) => {
      if (oversized) throw new SourceError("SOURCE_UNAVAILABLE", "104 回應超過允許大小。", { cause: error });
      throw error;
    });
    try {
      const body = response.content;
      if (body.byteLength > this.maxResponseBytes) {
        throw new SourceError("SOURCE_UNAVAILABLE", "104 回應超過允許大小。" );
      }
      if (response.status === 429) {
        throw new SourceError("SOURCE_RATE_LIMITED", "104 暫時限制查詢，請稍後再試。" );
      }
      if ([401, 403].includes(response.status)) {
        throw new SourceError("SOURCE_FORBIDDEN", `104 回應 HTTP ${response.status}。`);
      }
      if (response.status < 200 || response.status >= 300) {
        throw new SourceError("SOURCE_UNAVAILABLE", `104 回應 HTTP ${response.status}。`);
      }
      const text = body.toString("utf8");
      const looksLikeHtml = /<\s*!doctype\s+html|<\s*html[\s>]/i.test(text.slice(0, 1_000));
      if (looksLikeHtml || !/json/i.test(response.contentType ?? "")) {
        throw new SourceError("SOURCE_CHALLENGE", "104 回傳非 JSON 頁面，可能是驗證或存取限制頁。");
      }
      try {
        return JSON.parse(text) as unknown;
      } catch (error) {
        throw new SourceError("SOURCE_NON_JSON", "104 回應不是有效 JSON。", { cause: error });
      }
    } finally {
      await response.close();
    }
  }

  private async withPacing<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const waitMs = Math.max(0, this.intervalMs - (Date.now() - this.lastRequestStarted));
      if (waitMs > 0) await delay(waitMs);
      this.lastRequestStarted = Date.now();
      return await operation();
    } finally {
      release();
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
