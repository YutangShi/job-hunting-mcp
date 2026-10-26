# 系統架構

## V1 目標

第一版以 Codex 本機 stdio MCP 為驗收環境，使用 TypeScript 提供來源無關的工具契約，啟用 104 與 Cake adapter。搜尋時不要求使用者輸入來源；結果顯示來源名稱與來源網址。遠端部署與寫入功能不屬於 V1。

## 元件

```text
Codex / MCP Client
       │ stdio
       ▼
TypeScript MCP Server
       │ search_jobs / get_job_details
       ▼
Job domain + source dispatcher
       │
104 adapter ── impers (curl-impersonate binding)
       │
104 website JSON search/detail endpoints
```

### MCP Server

以 `@modelcontextprotocol/sdk` 實作 stdio server。MCP tool schema、錯誤映射及 JSON 輸出由 TypeScript 管理。stdio stdout 僅輸出 MCP frames，啟動和錯誤診斷輸出 stderr。

V1 工具：

- `search_jobs`：接受關鍵字、地區、職類、薪資下限、遠端、經驗、排序、頁碼與頁面大小等條件；頁面大小預設 10、可指定 10–20，來源若沒有足夠符合條件的職缺則回傳實際筆數。呼叫目前啟用的來源 adapter。每筆結果包含 `source`、來源限定 `job_ref`、職稱、公司、地點、薪資原文、摘要、來源 URL、刊登時間與 `fetched_at`。
- `get_job_details`：只接收 MCP 搜尋結果提供的 `job_ref`；透過來源前綴路由，不接受 caller URL。

### 104 Adapter

所有 104 網路請求集中於 `src/sources/104/`。V1 使用參考專案採用的 104 網站 JSON 搜尋與詳情端點，透過 `impers` 連接 curl-impersonate，設定瀏覽器指紋與必要的網頁請求 headers。HTTP client 包在 adapter 內，之後可在不變動 MCP 工具契約的情況下替換。

搜尋條件轉成 104 query parameters；地區和職類中文名稱透過版本控制的代碼表解析，未知名稱回傳建議而不猜測。詳情端點使用搜尋結果來源連結中的短職缺代碼，不以數字 `jobNo` 直接替代。

回應先以執行期 schema 驗證，後映射至來源無關的領域模型。回傳錯誤需區分輸入錯誤、上游 HTTP 拒絕／限流、timeout、非 JSON 和 schema 改變；錯誤不得偽裝為空結果。

### Source-neutral routing

V1 雖只啟用 104，搜尋與詳情工具不在公開輸入中暴露 `source` 選擇。結果的 `job_ref` 採 `104:<short-job-id>`，未來 Cake 需使用獨立命名空間。第一版不做跨來源模糊去重或相關性分數比較。

## 安全與穩定性控制

- 只允許設定檔指定的固定 104 host；使用者參數不會形成 URL。
- 限制 timeout、每次搜尋的 page/page size、最大回傳筆數、response body 大小與輸出字數。
- 依序發送來源請求並套用最低間隔，避免並行放大流量；不做全站排程抓取。
- 401／403／429／驗證挑戰／非 JSON 回應會明確回報並停止該次來源請求，不進行代理輪替、帳號登入、Cookie 重用或 CAPTCHA 處理。
- `impers` 為原生 FFI 依賴，需固定 npm 版本與 curl-impersonate runtime，驗證安裝平台和乾淨環境啟動；更新時先跑回歸與 live smoke check。
- 外部職缺文字當成資料而非指令；日誌不保存完整內容、Cookie 或秘密。

## 部署範圍

V1 使用 Node.js 22 LTS、npm lockfile 與 Codex stdio。安裝說明使用 `npm install`／`npm run build`，Codex MCP 設定透過 `command` 啟動編譯後 server。正式遠端 Streamable HTTP、OAuth、共享分散式限流、Cake adapter、資料快取與目錄上架留待後續變更。
