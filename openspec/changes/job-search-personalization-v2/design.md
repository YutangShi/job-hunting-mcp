# Design

## Context

V2 建立在 V1 的標準化職缺與公司資料之上，輸入包含使用者當次提供的技能、經歷與偏好。專案是本機 stdio MCP；不能假設有使用者資料庫、登入 session 或外部 LLM。個人資料與上游職缺文字都必須視為不可信輸入。

## Goals / Non-Goals

**Goals:**

- 提供可解釋、可測試的匹配、薪資、履歷關鍵字、投遞清單與面試準備工具。
- 將 profile 僅保留在單次呼叫的記憶體物件；log 只記錄計數與錯誤類別。
- 讓所有建議能指向 job_ref、欄位或原文依據，並區分事實與推論。
- 以固定規則與 schema 先實作，讓不同 agent 可自行使用結果撰寫自然語言。

**Non-Goals:**

- 不保存履歷、建立使用者帳戶、同步雲端履歷或呼叫外部 LLM API。
- 不判定錄取機率、人格適任性、年齡／性別／健康等敏感特徵，也不替雇主做自動篩選決策。
- 不自動投遞、登入、收藏、追蹤或聯絡雇主。

## Decisions

1. **Profile schema 最小化且明確分欄。** 將 skills、years_experience、locations、salary_preference、work_modes 分開驗證；自由文字設長度與秘密偵測限制，禁止把整份履歷作為未結構化無上限字串。
2. **匹配採可解釋規則。** 對技能、年資、地點、薪資與工作型態使用固定權重，輸出每項分數、命中／缺口與 unknown；不使用錄取機率或不可重現的黑盒分數。
3. **薪資先正規化再統計。** 將 period、currency、min、max、is_negotiable 分離；月薪與年薪不混算，面議／未提供列為 unknown，樣本數不足不產生市場結論。
4. **內容產生服務只產生建議。** Resume keywords、checklist、interview questions 以職缺需求證據為輸入，輸出 evidence refs；不直接修改履歷或呼叫平台。
5. **安全過濾分兩層。** 輸入層遮罩 token／Cookie／密碼並限制長度；輸出層移除私人聯絡資料、敏感推論與外部操作指令。職缺文字永遠不具工具授權。
6. **不新增儲存依賴。** MCP handler 建立 request-scoped context，呼叫完成即釋放；若未來需要保存 profile，必須另立變更並重新評估同意、加密與刪除政策。

## Risks / Trade-offs

- [技能同義詞造成誤配] → 維護可版本化的同義詞表，回傳原始命中詞與規則版本，允許 unknown。
- [薪資區間誤換算] → 不在缺少 period/currency 時換算；明確標示不可比較。
- [使用者輸入秘密] → secret pattern redaction、log denylist 與單元測試；不保證能辨識所有秘密，因此文件提醒不要貼入秘密。
- [履歷建議捏造經歷] → 只產生「可強調／需補證據」狀態，不填寫使用者未提供的成果。
- [職缺 prompt injection] → 將上游內容包裝為純資料，工具呼叫權限固定由 MCP server 控制。

## Migration Plan

1. 先新增 profile／salary／evidence schemas 與純函式測試。
2. 加入匹配與個人化 service，再逐一註冊五個 MCP tools；不修改 V1 tool 契約。
3. 執行 in-memory MCP、敏感資料、prompt injection、輸出上限與回歸 E2E 測試。
4. 更新中英文 README 與資料隱私說明。
5. 若回滾，移除五個 V2 tool registration；V1 搜尋、詳情與分析工具保持可用。

## Open Questions

無。V2 預設不保存 profile、不接外部 LLM、以規則式輸出為主；若要改變任一前提，應另立變更。
