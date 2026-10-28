# Design

## Context

目前 server 以 `search_jobs`／`get_job_details` 暴露來源資料，來源 adapter 位於 `src/sources/`，領域 schema 已包含來源與 `job_ref`。新工具應重用已驗證的領域模型，不直接解析 104／Cake 原始 JSON，也不能把外部職缺文字當成指令。V1 的 live 驗收以 104 公開 JSON 與 Codex stdio 為準；Cake 即使存在 adapter，也必須由來源啟用設定與 schema 驗證決定是否可用。

## Goals / Non-Goals

**Goals:**

- 建立來源無關的比較 service 與公司詳情 service，讓 MCP handler 只負責輸入驗證、呼叫 service 與格式化輸出。
- 統一 `AnalysisMetadata`（source、source_ref、url、fetched_at、freshness）與 partial failure 結構。
- 用固定上限控制 references、公司職缺數、併發、文字與輸出大小。
- 讓每個分析結論能追溯到來源欄位或明確標示為推論／未提供。
- 以 in-memory MCP、mock adapter、live 104 SRE smoke 及 stdio E2E 驗收。

**Non-Goals:**

- 不新增登入、Cookie、代理輪替、CAPTCHA、收藏、追蹤、投遞或 HR 私人聯絡資料。
- 不建立全站索引、長期快取、排程抓取或外部資料庫。
- 不在 V1 引入外部 LLM API；分析使用可測試的規則與既有 agent 解讀。

## Decisions

1. **以來源限定 job reference 作為唯一輸入識別。** `job_ref` 先經 adapter allow-list 驗證，再取得最小必要欄位；拒絕任意 URL 可降低 SSRF、資料外洩與不可追溯結果。
2. **分析層與來源層分離。** 新增 domain analysis service 依 `JobSummary`／`JobDetail` 介面工作；來源 adapter 負責端點、反自動化錯誤與 runtime schema validation。相較於在 `server.ts` 直接處理 JSON，此方式可重用於 104 與未來 Cake。
3. **規則式、可解釋的職缺比較。** 使用欄位正規化與技能詞彙，回傳差異、命中的原文片段或欄位路徑；不使用不可重現的黑盒排名。
4. **公司資料透過獨立 adapter 能力。** `get_company_detail` 從已驗證的 job_ref 路由至來源公司資料；來源無公司端點時回傳 `UNSUPPORTED_SOURCE_CAPABILITY`，不拼湊虛構公司資料。
5. **錯誤採部分成功模型。** 多 reference 或多來源查詢保留成功項目，同時列出每個失敗項目的安全錯誤 code；全數失敗才讓 MCP tool 以錯誤結果結束。
6. **版本相容採 additive tools。** 不修改現有兩個 tool 的輸入輸出；新增 tool 使用獨立 zod schemas，page size、reference 數與輸出上限寫入測試。

## Risks / Trade-offs

- [上游欄位或反自動化改變] → 所有 JSON 執行期驗證；拒絕、驗證頁、429、timeout、非 JSON 與 schema drift 使用明確 error code。
- [需求抽取誤判] → 每項標示 `explicit`／`inferred`／`not_provided`，輸出原文依據，不宣稱事實。
- [分析輸出過大] → 限制輸入數量、單欄位文字長度與總 bytes，超限回傳 validation error。
- [來源請求增加負載] → 只用既有詳情路由、有限併發與間隔；不做預抓或批次鏡像。
- [Cake 尚未穩定啟用] → V1 live acceptance 只承諾 104；Cake 需通過獨立 smoke 與 schema 驗證後才列為 enabled source。

## Migration Plan

1. 先新增 domain schemas、比較／公司詳情 service 與 mock adapter 測試，不改既有 tool。
2. 註冊兩個 V1 MCP tools，執行 typecheck、unit、in-memory MCP 與 stdio E2E。
3. 執行 104 SRE 多筆搜尋／詳情 smoke；來源拒絕時保留明確失敗狀態。
4. 更新中英文 README 的工具表與版本說明。
5. 若回滾，移除新 tool registration 與分析模組；既有 `search_jobs`／`get_job_details` 不受影響。

## Open Questions

無。來源啟用策略、唯讀邊界、輸出標示與驗收來源已在本設計及 specs 中決定。
