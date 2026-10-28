# Proposal

## Why

V1 能整理職缺與公司資訊，但無法依求職者的技能、經歷與偏好排序適配度，也無法協助準備履歷與面試。V2 應提供以當次請求資料為基礎的個人化分析，同時避免保存履歷、登入平台或執行投遞等高風險操作。

## What Changes

- 新增 `match_jobs_to_profile`，依技能、經歷、地點、薪資與工作型態計算可解釋的匹配結果。
- 新增 `analyze_salary`，整理公開薪資資訊並標示未提供、不可比較及樣本不足情況。
- 新增 `generate_resume_keywords`，從指定職缺擷取履歷應強調的關鍵字與證據缺口。
- 新增 `generate_application_checklist`，產生投遞前檢查清單，不執行投遞。
- 新增 `prepare_interview_questions`，依職缺需求產生面試準備題目與依據。
- 個人資料僅在單次 MCP 呼叫記憶體中使用，不寫入日誌、檔案、資料庫或來源平台。
- 所有模型或規則產生的建議都必須標示為輔助分析，不得宣稱錄取機率或薪資保證。

## Capabilities

### New Capabilities

- `candidate-job-matching`: 候選人資料與職缺的可解釋匹配及薪資分析。
- `application-preparation`: 履歷關鍵字、投遞檢查與面試準備輸出。

### Modified Capabilities

- 無。V2 工具只消費既有搜尋／詳情結果，不改變既有來源工具契約。

## Impact

- 影響 MCP tool schema、候選人輸入的資料最小化驗證、匹配與內容產生 service、輸出安全過濾及測試文件。
- 不新增帳號、Cookie、遠端履歷儲存、向 104／Cake 寫入資料或自動投遞能力。
- 若未來接入外部 LLM，必須另行評估資料傳輸、金鑰、成本與供應商政策；本變更預設使用本地規則與既有 agent 的推理能力。
