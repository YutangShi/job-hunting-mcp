# 專案路線圖

## V1：Codex + 104 唯讀搜尋

1. 建立 TypeScript MCP stdio server，支援 `search_jobs` 與 `get_job_details`。
2. 建立 104 source adapter，呼叫網站 JSON 搜尋／詳情端點，採用 curl-impersonate 相容的 HTTP client。
3. 完成上游回應驗證、中文地區／職類解析、薪資和地點標準化、來源 reference、安全限制與錯誤分類。
4. 在 Codex 設定 MCP server，實際搜尋 SRE 職缺，從搜尋結果取得 reference 並成功查詳情。
5. 提供安裝、設定、限制與排錯文件；不提供 cookie、登入、收藏、投遞、代理輪替或全站抓取。

### V1 驗收條件

- Codex 可啟動本機 MCP server 並列舉兩項工具。
- 使用「SRE」查詢可回傳 104 職缺結果；每筆結果顯示 `104`、職缺名稱、公司、地點、原始 URL 及擷取時間。
- 使用「SRE + 台北市」查詢至少回傳兩筆標題包含 SRE／Site Reliability 的職缺，且回傳頁面每筆工作地點均位於台北市。
- 至少一筆搜尋結果可用 `job_ref` 呼叫詳情工具成功。
- 來源拒絕、限流、timeout 或 schema 變動回傳明確錯誤，不會誤顯示為 0 筆結果。
- `npm ci`、typecheck、build 和自動化測試通過；live smoke check 的結果與執行時間記錄在文件／發佈紀錄。

## 後續版本

### V1.1：搜尋體驗

- 強化地區／職類代碼表更新流程、篩選語意與分頁。
- 依真實使用結果改善排序、摘要與詳情欄位。

### V2：Cake 與多來源

- 新增 Cake adapter，搜尋時自動扇出至啟用來源。
- 保留逐筆來源標示及各來源錯誤狀態，不對不同來源分數做錯誤比較。

### V3：遠端部署與目錄

- 加入 Streamable HTTP、使用者驗證、共享限流、健康檢查與維運監控。
- 準備 mcpservers.org 目錄資料及 ChatGPT／Claude 遠端連線文件；上架前另外驗證客戶端方案限制與端點可用性。

## 排除範圍

- 履歷／求職者資料、會員登入及私人聯絡資料。
- 收藏、追蹤、投遞及其他平台寫入操作。
- 代理輪替、Cookie 重用、CAPTCHA／挑戰處理和全站鏡像。
