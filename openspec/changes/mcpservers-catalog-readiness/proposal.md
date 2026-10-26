# Proposal

## Why

專案原本規劃支援 ChatGPT、Claude 等遠端 MCP 客戶端，但尚未把公開目錄的提交資料與遠端連線條件納入驗收。mcpservers.org 的提交表單要求可辨識的名稱、分類、簡短描述、原始碼／網站／文件連結、聯絡信箱，並讓提交者標示是否支援遠端連線；現在補齊這些條件，才能避免功能完成後仍缺少上架所需的資訊與可驗證部署。

## What Changes

- 定義 MCP server 的公開目錄上架就緒能力，涵蓋穩定的遠端連線、可複製的安裝文件、提交 metadata、聯絡窗口與上架前驗證。
- 將 mcpservers.org 表單欄位轉成專案 metadata checklist；官方 MCP Registry 名稱列為選填，免費／付費提交由維護者屆時決定。
- 在專案 README 與路線圖加入目錄上架階段和驗收要求，說明目錄收錄不等同於 MCP 協定認證、來源平台授權或 ChatGPT／Claude 上架核准。
- 保留來源授權門檻：上架前仍須取得 104／Cake 正式 API、合作契約或書面授權；禁止以反爬規避方式取得職缺資料。

## Capabilities

### New Capabilities

- `server-catalog-readiness`: 定義 MCP 服務成為可供公開目錄提交的遠端服務時，必須具備的公開 metadata、連線與安裝資訊、聯絡資訊及提交流程。

### Modified Capabilities

無。

## Impact

- 文件：`README.md`、`docs/roadmap.md`、新增公開目錄上架檢查清單。
- MCP 服務：後續需提供可從公網連線的 HTTPS Streamable HTTP endpoint，並在公開文件中說明連線設定與支援客戶端；本 change 只定義需求，不實作服務。
- 外部服務：mcpservers.org 提交頁；正式提交仍需維護者提供聯絡信箱並決定提交方案。
- 前置條件：104／Cake 的來源授權、資料使用範圍與展示欄位仍須個別確認。
