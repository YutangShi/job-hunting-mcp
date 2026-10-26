# Tasks

## 1. TypeScript MCP 專案基礎

- [x] 1.1 建立 Node.js 22／TypeScript 專案、MCP SDK、lint／format／typecheck／build/test scripts 及 lockfile；以 `npm ci`、`npm run typecheck` 和 `npm run build` 驗證乾淨安裝。
- [x] 1.2 評估並固定 `impers` 與 curl-impersonate runtime；以乾淨環境載入原生套件並對 104 搜尋端點完成受控連線 smoke check，若不可用則依 design 改用長駐 `curl_cffi` worker 並記錄原因。
- [x] 1.3 建立領域 schema、錯誤型別、source adapter 介面及 HTTP transport 邊界；以 typecheck 和 schema 測試確認工具層不依賴 104 原始欄位。

## 2. 104 搜尋與詳情 adapter

- [x] 2.1 實作固定 104 host 的搜尋／詳情 HTTP transport、必要 headers、timeout、minimum interval、回應 byte 上限及有限 retry；以 transport 測試確認 query encoding、請求節流和拒絕狀態分類。
- [x] 2.2 實作地區／職類代碼表與搜尋條件映射；以測試確認中文名稱精確命中、無效名稱建議、薪資排序語意、遠端／年資／學歷欄位和頁面上限。
- [x] 2.3 實作搜尋回應的 runtime schema 與 `JobSummary` 正規化；以固定 JSON fixture 測試欄位缺漏、薪資 sentinel、無效 URL、非 JSON、未知欄位及 schema drift。
- [x] 2.4 實作詳情 reference 解析與詳情 schema；以測試確認只接受 `104:<short-code>`、從來源 URL 取短碼、拒絕 caller URL／錯誤來源及正確轉換 JD／條件／薪資／地點。
- [x] 2.5 實作 `104SourceAdapter` 的搜尋、詳情、來源標示、`fetched_at`、分頁狀態及來源錯誤；以 adapter 契約測試確認 403／429／挑戰頁／timeout／schema drift 均不會被轉成空結果。

## 3. MCP 工具與 Codex stdio

- [x] 3.1 建立 stdio MCP server 並註冊 `search_jobs`、`get_job_details`；以 SDK client subprocess 測試確認工具列舉、輸入驗證、structured content 與 stdout protocol-clean。
- [x] 3.2 以 MCP 工具輸入支援關鍵字、中文地區／職類、薪資下限、遠端、年資、排序和分頁；以 MCP client 測試確認 `source` 不在必要輸入中、結果明確顯示 104 且 `job_ref` 可查詳情。
- [x] 3.3 提供 `npm run smoke:104`，使用 `SRE + 台北市` 即時搜尋並驗證至少兩筆標題符合 SRE／Site Reliability、所有地點均為台北市，且來源、URL、`job_ref` 正確；至少以一筆結果呼叫詳情。
- [x] 3.4 用 Codex 本機 MCP 設定實際呼叫 `search_jobs` 查詢 `SRE + 台北市`；確認回傳多筆標題符合 SRE／Site Reliability、每筆地點均為台北市，並記錄來源標示及職缺資料。
- [x] 3.5 格式化搜尋工具的可讀結果，每筆列出公司、職稱、工作內容描述、薪資及 104 連結；缺少描述或薪資時顯示「未提供」。
- [x] 3.6 新增 stdio E2E，啟動已建置 MCP server、列舉所有工具並實際呼叫每項工具；搜尋限定台北 SRE 並以搜尋 reference 取得詳情。

## 4. 文件與交付

- [x] 4.1 更新 `AGENTS.md`、README、架構、資料來源政策、路線圖、目錄文件與 OpenSpec context，說明 104 網頁 JSON／impersonation 路徑、節流與限制、Codex 設定和 live smoke 命令；以文件 review 確認不再稱 V1 為 fixture-only 或等候正式 API。
- [x] 4.2 完成 `npm test`、typecheck、build、即時 104 smoke 和 Codex 的 `SRE + 台北市` 搜尋驗收；確認 Codex 顯示多筆符合職稱且所有地點在台北市，並記錄實際命令輸出。
