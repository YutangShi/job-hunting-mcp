# job-hunting-mcp

`job-hunting-mcp` is a read-only Model Context Protocol (MCP) server for personal job search. It lets an AI agent search public job listings from 104 and Cake, show the source of every listing, and open full details using the reference returned by search.

`job-hunting-mcp` 是一個供個人查詢工作的唯讀 MCP server。AI agent 可以同時搜尋 104 與 Cake 的公開職缺，顯示每筆資料來源，並使用搜尋結果的 reference 讀取完整職缺內容。

## 1. Project purpose / 專案目的

The project helps an individual search jobs through a natural-language assistant. Users do not need to choose 104 or Cake first. Each enabled source is queried independently, and every result contains its source, original link, salary, location, description, and source-qualified `job_ref`.

本專案協助個人用自然語言找工作。使用者不必先選 104 或 Cake；server 會分別查詢已啟用的來源。每筆結果包含資料來源、原始連結、薪資、地點、工作內容與來源限定的 `job_ref`。

Current scope / 目前範圍：

- Read-only public job search and details / 唯讀公開職缺搜尋與詳情
- Sources: `104` and `cake` / 資料來源：`104`、`cake`
- No login, user cookies, applications, saving, following, or candidate data / 不登入、不讀取使用者 Cookie、不投遞、不收藏、不追蹤、不讀取求職者資料
- Default: 10 results per source; explicit range: 10–20 / 每個來源預設 10 筆，可指定 10–20 筆

## 2. Installation / 安裝

### Requirements / 需求

- Node.js 22 LTS
- npm
- Network access to enabled sources / 可連線至啟用來源

From the project root / 在專案根目錄執行：

```bash
node --version
npm ci
npm run build
```

The `impers` package uses a native curl-impersonate-compatible library. If startup cannot load the native library, configure the runtime according to the error message and your deployment environment.

`impers` 使用原生 curl-impersonate 相容 library。若啟動時無法載入原生 library，請依錯誤訊息與部署環境設定 runtime。

## 3. Install on agents / 安裝到各種 agent

### Codex

This repository provides a local stdio MCP server. Register it with Codex CLI:

本專案提供本機 stdio MCP server。使用 Codex CLI 註冊：

```bash
NODE_BIN="$(command -v node)"
PROJECT_DIR="$(pwd -P)"
codex mcp add job-hunting-mcp -- "$NODE_BIN" "$PROJECT_DIR/dist/index.js"
codex mcp get job-hunting-mcp
```

Restart Codex after registration or rebuilding. Re-register only if the project path or command changes.

註冊或重新建置後重新啟動 Codex。只有專案路徑或啟動命令改變時才需要重新註冊。

### Claude Desktop

Add this server to Claude Desktop's MCP configuration. Replace the paths with absolute paths on your machine:

將以下設定加入 Claude Desktop 的 MCP 設定，並把路徑換成你電腦上的絕對路徑：

```json
{
  "mcpServers": {
    "job-hunting-mcp": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/job-hunting-mcp/dist/index.js"]
    }
  }
}
```

Use `command -v node` on macOS/Linux or `where node` on Windows to find Node.js. Restart Claude Desktop after saving the configuration.

macOS/Linux 可用 `command -v node`，Windows 可用 `where node` 查詢 Node.js。儲存設定後重新啟動 Claude Desktop。

### ChatGPT and hosted agents / ChatGPT 與託管型 agent

This version is a local stdio server. ChatGPT web and other hosted agents generally require a remotely reachable MCP server or an official connector configuration; they cannot launch a process from your local filesystem with the Codex/Claude stdio commands above. Direct installation into those clients requires a remote deployment, HTTPS endpoint, authentication, and the client-specific MCP registration flow.

本版本是本機 stdio server。ChatGPT 網頁版與其他託管型 agent 通常需要可從網路連線的 MCP server 或官方 connector 設定，不能直接使用上面的本機檔案路徑啟動程序。若要直接安裝到這些 client，需要遠端部署、HTTPS endpoint、驗證和該 client 的 MCP 註冊流程。

## 4. How MCP works / MCP 如何運作

```text
User request / 使用者問題
        |
        v
AI agent calls search_jobs / agent 呼叫 search_jobs
        |
        v
job-hunting-mcp queries 104 and Cake / 同時查詢 104 與 Cake
        |
        v
Normalized results with source labels / 正規化結果與來源標籤
        |
        v
AI agent calls get_job_details(job_ref) / agent 使用 job_ref 呼叫詳情
```

The server uses stdio MCP frames for local clients. Search requests are sent to each enabled adapter with bounded pacing. A source failure does not erase successful results from another source; the response includes source status. Every `job_ref` is namespaced, such as `104:8ue17` or `cake:site-reliability-engineer-sre-71702b`.

本機 client 透過 stdio MCP frame 與 server 溝通。搜尋會以有界節流呼叫各來源 adapter。某個來源失敗時不會清除其他來源的成功結果，回應會附上來源狀態。每個 `job_ref` 都包含來源 namespace，例如 `104:8ue17` 或 `cake:site-reliability-engineer-sre-71702b`。

## 5. MCP tools / MCP 工具

### `search_jobs`

Searches all enabled sources without a `source` input. It supports keyword, area, job category, salary, job type, remote work, experience, education, sorting, and pagination. The default is 10 results per source; explicit `page_size` values are 10–20.

不需要輸入 `source`，會搜尋所有啟用來源。支援關鍵字、地區、職類、薪資、工作型態、遠端、年資、學歷、排序與分頁。每個來源預設 10 筆，`page_size` 可指定 10–20。

Each result includes company, title, work description, salary, location, source, original link, and `job_ref`.

每筆結果包含公司、職稱、工作內容、薪資、地點、資料來源、原始連結與 `job_ref`。

### `get_job_details`

Retrieves full public details for a `job_ref` returned by `search_jobs`. It accepts a source-qualified reference, not an arbitrary URL.

讀取 `search_jobs` 回傳的 `job_ref` 所對應的公開職缺詳情。只接受來源限定 reference，不接受任意 URL。

## 6. Testing / 測試

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run smoke:104
npm run smoke:cake
```

`npm run test:e2e` starts the built MCP server over stdio, lists all exposed tools, searches Taipei SRE jobs, validates normalized output, and follows a returned reference to details. `smoke:104` and `smoke:cake` contact live sources; 403, 429, challenge pages, timeouts, or schema changes are reported as failures rather than empty searches.

`npm run test:e2e` 會啟動建置後的 MCP server，透過 stdio 列出所有工具，搜尋台北 SRE，驗證正規化輸出，並使用回傳 reference 查詢詳情。`smoke:104` 與 `smoke:cake` 會連線真實來源；403、429、challenge、timeout 或上游 schema 變更都會明確回報失敗，不會偽裝成查無結果。

## 7. License / 授權

This project is released under the MIT License. See [LICENSE](LICENSE).

本專案採用 MIT License，詳見 [LICENSE](LICENSE)。Third-party code tables retain their separate notice in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
# job-hunting-mcp
