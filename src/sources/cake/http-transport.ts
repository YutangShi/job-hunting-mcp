import * as impers from "impers";
import { SourceError } from "../104/errors.js";
import type { HttpResponse, ImpersRequester, ImpersRequestOptions } from "../104/http-transport.js";

export type CakeHtmlTransportOptions = {
  minimumIntervalMs?: number;
  timeoutSeconds?: number;
  maxResponseBytes?: number;
  request?: ImpersRequester;
  closeSession?: () => Promise<void>;
};

export class CakeHtmlTransport {
  private readonly intervalMs: number;
  private readonly timeoutSeconds: number;
  private readonly maxResponseBytes: number;
  private readonly request: ImpersRequester;
  private readonly closeSession: () => Promise<void>;
  private queue: Promise<void> = Promise.resolve();
  private lastRequestStarted = 0;

  constructor(options: CakeHtmlTransportOptions = {}) {
    this.intervalMs = options.minimumIntervalMs ?? 1_500;
    this.timeoutSeconds = options.timeoutSeconds ?? 20;
    this.maxResponseBytes = options.maxResponseBytes ?? 5 * 1024 * 1024;
    this.request = options.request ?? impers.get;
    this.closeSession = options.closeSession ?? impers.closeSharedSession;
  }

  async getText(url: string, params?: Record<string, string>): Promise<string> {
    const parsed = new URL(url);
    if (parsed.origin !== "https://www.cake.me" && parsed.origin !== "https://www.cakeresume.com") {
      throw new SourceError("SOURCE_UNAVAILABLE", "拒絕連線至非 Cake 來源網址。");
    }
    return this.withPacing(async () => this.performGet(url, params));
  }

  async close(): Promise<void> { await this.closeSession(); }

  private async performGet(url: string, params?: Record<string, string>): Promise<string> {
    const controller = new AbortController();
    let received = 0;
    let oversized = false;
    const headers = {
      Referer: "https://www.cake.me/jobs",
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    } as const;
    let response: HttpResponse;
    try {
      response = await this.request(url, {
        ...(params ? { params } : {}),
        impersonate: "chrome",
        timeout: this.timeoutSeconds,
        connectTimeout: Math.min(10, this.timeoutSeconds),
        headers: headers as ImpersRequestOptions["headers"],
        signal: controller.signal,
        contentCallback: (chunk) => { received += chunk.byteLength; if (received > this.maxResponseBytes) { oversized = true; controller.abort(); } },
        headerCallback: () => {},
      });
    } catch (error) {
      if (oversized) throw new SourceError("SOURCE_UNAVAILABLE", "Cake 回應超過允許大小。", { cause: error });
      if (error instanceof SourceError) throw error;
      throw new SourceError("SOURCE_UNAVAILABLE", "無法連線至 Cake 搜尋服務。", { cause: error });
    }
    try {
      if (response.content.byteLength > this.maxResponseBytes) throw new SourceError("SOURCE_UNAVAILABLE", "Cake 回應超過允許大小。");
      if (response.status === 429) throw new SourceError("SOURCE_RATE_LIMITED", "Cake 暫時限制查詢，請稍後再試。");
      if ([401, 403].includes(response.status)) throw new SourceError("SOURCE_FORBIDDEN", `Cake 回應 HTTP ${response.status}。`);
      if (response.status < 200 || response.status >= 300) throw new SourceError("SOURCE_UNAVAILABLE", `Cake 回應 HTTP ${response.status}。`);
      const text = response.content.toString("utf8");
      if (/just a moment|cf-chl-|enable javascript and cookies/i.test(text)) throw new SourceError("SOURCE_CHALLENGE", "Cake 回傳驗證頁，未取得職缺資料。");
      return text;
    } finally { await response.close(); }
  }

  private async withPacing<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue; let release!: () => void;
    this.queue = new Promise<void>((resolve) => { release = resolve; }); await previous;
    try { const waitMs = Math.max(0, this.intervalMs - (Date.now() - this.lastRequestStarted)); if (waitMs > 0) await delay(waitMs); this.lastRequestStarted = Date.now(); return await operation(); } finally { release(); }
  }
}

function delay(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
