# Proposal

## Why

目前 `search_jobs` 與 `get_job_details` 能取得原始職缺，但求職者仍須自行比較條件、拆解 JD 與判斷公司。V1 應在公開資料與唯讀邊界內提供可驗證的分析工具，讓 AI agent 能把多來源職缺轉成可直接決策的資訊。

## What Changes

- 新增 `compare_jobs`，比較多筆來源限定 `job_ref` 的職缺。
- 新增 `get_company_detail`，依單一搜尋結果的 `job_ref` 解析其所屬公司的公開資訊與目前公開職缺。
- 所有輸出保留來源、來源職缺 reference、原始 URL 與擷取時間；職缺文字只視為不可信外部資料。
- 維持唯讀、無登入、無 Cookie、無收藏／投遞／追蹤；限制請求併發、頁數、回應大小與分析輸出大小。
- 第一版驗收以 104 公開 JSON 搜尋與 Codex stdio 的 SRE 搜尋／詳情流程為準；Cake adapter 保持隔離，未通過來源驗證時不得宣稱成功。

## Capabilities

### New Capabilities

- `job-comparison`: 比較多筆公開職缺的條件、資料完整度與來源。
- `company-detail`: 由職缺 `job_ref` 取得所屬公司的公開詳情，不另提供公司搜尋工具。

### Modified Capabilities

- 無。現有 `search_jobs` 與 `get_job_details` 契約保持相容。

## Impact

- 影響 `src/server.ts` 的 MCP tool registration、領域 schema、比較／公司詳情 service、來源 adapter 的查詢能力與單元／整合／E2E 測試。
- 不新增外部資料庫或登入依賴；沿用現有來源 adapter、執行期 schema validation 與 curl-impersonate 相容 HTTP client。
- 104 公開網站端點、欄位及反自動化行為可能變動；拒絕、驗證頁、429、timeout 或 schema drift 必須回傳可觀測錯誤，不得轉成空結果。
