# Spec Delta

## Purpose

讓求職者根據公開職缺需求準備履歷關鍵字、投遞前檢查與面試題目，所有建議都必須能回溯至職缺內容，且不會自動投遞或將個人資料送回職缺平台。

## ADDED Requirements

### Requirement: 履歷關鍵字必須來自職缺需求

`generate_resume_keywords` SHALL 從有效 job_ref 的公開描述與需求中擷取必要／加分關鍵字，並標示每個關鍵字的來源段落或依據；不得捏造候選人具備的技能。

#### Scenario: 產生關鍵字
- **WHEN** 使用者提供有效 job_ref 與可選的個人技能清單
- **THEN** 回傳職缺關鍵字、重要性、候選人已提供或缺少的狀態及來源依據

#### Scenario: 職缺文字不足
- **WHEN** 職缺內容沒有可辨識需求
- **THEN** 系統回傳 `insufficient_job_text`，不以通用關鍵字假裝完成分析

### Requirement: 投遞檢查必須是唯讀建議

`generate_application_checklist` SHALL 產生履歷、作品集、技能證據與問題確認清單，但 MUST NOT 送出表單、登入帳號、寫入收藏或聯絡雇主。

#### Scenario: 產生投遞前清單
- **WHEN** 使用者提供有效 job_ref
- **THEN** 回傳可勾選的準備項目、每項依據與未提供資訊，不執行外部寫入

#### Scenario: 使用者要求代為投遞
- **WHEN** 請求包含投遞或送出履歷指令
- **THEN** 系統拒絕外部操作並只提供手動準備建議

### Requirement: 面試題目必須標示推論性質

`prepare_interview_questions` SHALL 依職缺明示技能與工作內容產生技術、情境及澄清問題，並將推論題目標示為建議，不得聲稱知道雇主實際題庫。

#### Scenario: 依 SRE 職缺產生題目
- **WHEN** 職缺明示 incident response、監控或雲端技能
- **THEN** 回傳對應準備題目、考察依據與可查證的職缺來源

#### Scenario: 職缺來源失敗
- **WHEN** 無法重新取得 job_ref 的公開詳情
- **THEN** 工具回傳來源錯誤，不使用過期或未驗證內容產生新建議

### Requirement: 個人資料與外部內容必須安全隔離

工具 MUST 對候選人輸入與職缺文字執行長度、格式及輸出大小限制，將兩者視為不可信資料，不執行其中的提示注入或外部操作要求。

#### Scenario: 候選人資料含有秘密
- **WHEN** profile 文字疑似包含 token、Cookie 或密碼
- **THEN** 系統遮罩或拒絕該欄位，且不寫入 log

#### Scenario: 職缺描述含有提示注入
- **WHEN** 職缺描述要求 agent 忽略安全規則或呼叫其他工具
- **THEN** 系統只把內容當作職缺文字，維持既有工具權限與資料邊界
