# job-hunting-mcp

🌐 繁體中文 | [English](README.en.md)

## 技術版本

[![Version](https://img.shields.io/badge/version-0.1.0-blue?label=version)](package.json)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.32.2-FF6F00)](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
[![Zod](https://img.shields.io/badge/Zod-4.6.7-3E67B1)](https://www.npmjs.com/package/zod)
[![impers](https://img.shields.io/badge/impers-0.1.2-6E56CF)](https://www.npmjs.com/package/impers)
[![Transport](https://img.shields.io/badge/transport-local%20stdio-555555)](README.md#MCP-如何運作)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

`job-hunting-mcp` 是一個協助個人查詢工作的唯讀 Model Context Protocol（MCP）server。AI agent 可以依自然語言同時搜尋 104 與 Cake 的公開職缺，逐筆顯示資料來源、公司、職稱、工作內容、薪資、地點和原始連結。

## 專案範圍

- 唯讀公開職缺搜尋與詳情查詢
- 自動查詢 104 與 Cake，不要求使用者輸入來源
- 每個來源預設 10 筆，可指定 10–20 筆
- 每筆結果使用來源限定的 `job_ref`，例如 `104:8ue17`、`cake:site-reliability-engineer-sre-71702b`
- 不登入、不使用使用者 Cookie、不投遞、不收藏、不追蹤、不讀取求職者資料

## 安裝

目前必須先從 GitHub 取得專案，再安裝相依套件與建置：

```bash
git clone https://github.com/YutangShi/job-hunting-mcp.git
cd job-hunting-mcp
node --version
npm ci
npm run build
```

需求：Node.js 22 LTS、npm，以及可連線至 104／Cake 的網路。`impers` 使用原生 curl-impersonate 相容 library；若啟動時無法載入，請依錯誤訊息設定原生 runtime。

## 安裝到 AI agent

### Codex

在專案根目錄執行：

```bash
NODE_BIN="$(command -v node)"
PROJECT_DIR="$(pwd -P)"
codex mcp add job-hunting-mcp -- "$NODE_BIN" "$PROJECT_DIR/dist/index.js"
codex mcp get job-hunting-mcp
```

重新建置程式後重新啟動 Codex 即可。只有專案路徑或啟動命令改變時才需重新註冊。

### Claude Desktop

把以下內容加入 Claude Desktop 的 MCP 設定，並將兩個路徑換成絕對路徑：

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

macOS/Linux 可用 `command -v node`，Windows 可用 `where node` 查詢 Node.js。儲存後重新啟動 Claude Desktop。

### ChatGPT 與其他 agent

目前版本是本機 stdio server。Codex CLI 和 Claude Desktop 可以直接啟動本機程序；ChatGPT 網頁版或其他託管型 agent 通常需要遠端可連線的 MCP server、HTTPS endpoint、驗證和該平台的 connector 設定，因此不能直接使用本機 `dist/index.js` 路徑。這些 client 的遠端部署尚未包含在本版本。

## MCP 如何運作

```text
使用者問題
  ↓
AI agent 呼叫 search_jobs
  ↓
job-hunting-mcp 分別查詢 104 與 Cake
  ↓
合併正規化結果，保留每筆來源與來源狀態
  ↓
AI agent 使用回傳的 job_ref 呼叫 get_job_details
```

本機 client 透過 stdio MCP frame 溝通。來源查詢有節流與大小限制；某個來源失敗時，其他來源的成功結果仍會保留，並在回應中顯示失敗來源與錯誤類別。

## MCP tools

目前程式實際註冊的 MCP tools 只有以下兩個。`smoke:104`、`smoke:cake`、`test:e2e` 是測試／驗證命令，不是 MCP tools。

| Tool | 用途 | 主要輸入 | 回傳內容 |
|---|---|---|---|
| `search_jobs` | 同時搜尋所有啟用來源的公開職缺 | `keyword`、`area`、`jobcat`、`salary_min`、`job_type`、`remote`、`is_new`、`exp_years`、`edu`、`sort`、`page`、`page_size` | 公司、職稱、工作內容描述、薪資、地點、來源、原始連結、`job_ref`、來源狀態 |
| `get_job_details` | 讀取搜尋結果對應的完整公開職缺內容 | `job_ref`，必須來自 `search_jobs` | 公司、職稱、完整工作內容、條件、薪資、地點、來源、原始連結 |

`search_jobs` 不接受 `source` 欄位；使用者不需要知道職缺來自哪個平台。`get_job_details` 不接受任意 URL，只接受來源限定的 `job_ref`。

## 測試與驗證

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run smoke:104
npm run smoke:cake
```

- `npm test`：執行 unit、adapter、transport 和 MCP in-memory 測試
- `npm run typecheck`：執行 TypeScript 型別檢查
- `npm run build`：建立 `dist/index.js`
- `npm run test:e2e`：啟動建置後的 stdio MCP server，列出全部 tools，實際呼叫搜尋與詳情
- `npm run smoke:104`：即時驗證台北 SRE 多筆搜尋與詳情
- `npm run smoke:cake`：即時驗證 Cake SRE 搜尋與詳情；來源回傳 403、429、challenge 或 schema 變更時會明確失敗

## 授權

本專案採用 MIT License，詳見 [LICENSE](LICENSE)。第三方地區／職類代碼表的授權說明見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
