# Proposal

## Why

V1 要先讓 Codex 透過 MCP 查詢真實的 104 SRE 職缺，而不是只驗證合成資料。沿用參考專案已展示的 104 網頁 JSON 端點與 curl-impersonate 相容 HTTP 請求方式，先建立單一來源的唯讀 TypeScript MCP，再以真實搜尋與詳情流程驗收。

## What Changes

- 新增 TypeScript stdio MCP server，提供 `search_jobs` 與 `get_job_details`。
- 新增 104 adapter，呼叫網站目前使用的 JSON 搜尋與詳情端點；中文地區／職類條件轉換為 104 query parameters。
- 使用 TypeScript 的 `impers`（curl-impersonate binding）實作瀏覽器 TLS／HTTP2 請求特徵，並隔離於 source adapter 以便替換。
- 搜尋不要求使用者選來源；每筆結果顯示 `104`、來源限定 `job_ref`、來源網址與擷取時間。
- 把 Codex 透過 MCP 搜尋 `SRE` 並成功讀取至少一筆詳情列為 V1 驗收。
- 同步更新代理人規則、README、架構、資料來源政策與路線圖，移除 fixture-only 和必須先取得正式 API 的 V1 前置條件。
- 只做唯讀公開職缺搜尋；不加入登入、Cookie、代理輪替、CAPTCHA 處理、收藏、追蹤、投遞、Cake adapter 或遠端部署。

## Capabilities

### New Capabilities

- `job-search`: 定義來源無關搜尋工具、104 結果來源標示、來源 reference 詳情路由及即時上游錯誤行為。
- `mcp-server-runtime`: 定義 TypeScript stdio server、工具註冊與 Codex 本機安裝及驗收行為。

### Modified Capabilities

無。

## Impact

- 新增 TypeScript 專案、MCP SDK、`impers` 原生 HTTP client、104 query builder、上游 response schema、source adapter、MCP tools 與 smoke script。
- 104 網頁端點與回應格式可能變更；限制請求頻率、結果頁數和輸出量，並對 403、429、驗證頁、timeout 及 schema 改變回報明確錯誤。
- Cake 和遠端服務保留在後續版本，不影響 V1 的 104／Codex 驗收範圍。
