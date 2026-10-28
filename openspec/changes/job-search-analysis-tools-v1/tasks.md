# Tasks

## 1. 領域契約與分析核心

- [x] 1.1 建立分析輸入／輸出 zod schemas，涵蓋 reference 上限、`AnalysisMetadata`、資料狀態與 partial failure；以 schema unit tests 驗證合法、超限及未知欄位處理。
- [x] 1.2 建立可注入來源查詢介面與比較 service，實作 `compare_jobs`；以 mock adapter tests 驗證來源追溯、explicit/inferred/not_provided 與 prompt injection 不執行。
- [x] 1.3 實作由 job_ref 路由的公司詳情 domain contract 與 `get_company_detail` service；以 mock tests 驗證 job_ref allow-list、公開欄位限制與 UNSUPPORTED_SOURCE_CAPABILITY 行為。

## 2. MCP tools 整合

- [x] 2.1 在 `src/server.ts` 註冊 `compare_jobs`，確認既有 `search_jobs` 與 `get_job_details` 的 schema、名稱與輸出未變；以 in-memory MCP test 列出並呼叫比較工具。
- [x] 2.2 註冊 `get_company_detail`，將來源錯誤轉成安全的 MCP text／structured content；以錯誤情境測試拒絕、429、timeout、schema drift 與不支援能力。
- [x] 2.3 將所有來源請求接回既有 adapter 的節流、timeout、runtime validation 與輸出大小限制；以 transport／adapter integration test 驗證不直接組上游 URL。

## 3. 來源與現場驗收

- [x] 3.1 補齊 104 adapter 的公司詳情能力，並以 fixture 驗證來源欄位、公司 URL、公開職缺清單、`fetched_at` 與 104 job_ref；無法驗證時回傳 UNSUPPORTED_SOURCE_CAPABILITY。
- [x] 3.2 執行 `npm run typecheck`、`npm test`、`npm run build`，確認所有新舊測試通過並檢查 stdout 僅有 MCP 訊息。
- [x] 3.3 擴充 `tests/e2e/stdio.test.ts`，啟動建置後 server、列出兩個新增 tools，執行每個工具至少一個成功與一個驗證錯誤案例。
- [ ] 3.4 執行 live 104 SRE 多筆搜尋與 `get_job_details`／兩個新增工具驗證，確認每筆含公司、職稱、描述、薪資、來源、104 連結及擷取時間；拒絕或 schema drift 時測試必須明確失敗。

## 4. 文件與交付

- [x] 4.1 同步更新 `README.md` 與 `README.en.md` 的 badge、MCP tools table、限制、測試指令與來源 attribution，兩頁章節與工具清單一致。
- [x] 4.2 以 `openspec validate --change job-search-analysis-tools-v1 --strict` 驗證規格，並保存完整測試結果與未納入 V1 的功能清單。
