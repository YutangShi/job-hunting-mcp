# Spec Delta

## Purpose

讓求職者能以多個既有搜尋結果比較公開職缺，快速看出薪資、地點、條件、技能與資料完整度差異，並保留每筆資料的來源與新鮮度。

## ADDED Requirements

### Requirement: 職缺比較必須接受來源限定 reference

`compare_jobs` MUST 只接受 `search_jobs` 回傳的來源限定 `job_ref`，不得接受任意 URL 或未驗證的外部識別碼。

#### Scenario: 使用有效 reference 比較
- **WHEN** 使用者傳入一或多個有效的 `104:<id>` job_ref
- **THEN** 系統讀取對應公開資料並回傳比較結果、來源、原始 URL 與 `fetched_at`

#### Scenario: 使用任意 URL
- **WHEN** 使用者把外部 URL 直接傳給分析工具
- **THEN** 系統拒絕請求並回傳輸入驗證錯誤，不發出來源請求

### Requirement: 系統必須提供結構化職缺比較

系統 SHALL 提供公司、職稱、薪資、地點、工作內容、任職條件、技能與資料完整度的比較，輸出必須區分明確資料、推論資料與未提供資料。

#### Scenario: 比較多筆職缺
- **WHEN** 使用者傳入至少兩筆有效 job_ref
- **THEN** `compare_jobs` 回傳公司、職稱、地點、薪資、工作型態、技能、福利、資料缺口及逐筆來源

#### Scenario: 比較職缺條件
- **WHEN** 使用者呼叫 `compare_jobs` 並傳入至少兩筆有效 job_ref
- **THEN** 回傳可逐欄比較的薪資、地點、描述、條件、技能與資料缺口；原文未提供的欄位標示為 `not_provided`

### Requirement: 分析結果必須限制資料範圍與輸出大小

系統 MUST 只回傳完成查詢所需的公開職缺欄位，限制輸入 reference 數量、相似結果數、文字長度與總輸出大小，並不得保存完整職缺正文。

#### Scenario: 超過分析上限
- **WHEN** 使用者傳入超過工具上限的 job_ref 或要求過大結果集
- **THEN** 系統回傳明確 validation error，並不執行未經限制的批次查詢

#### Scenario: 外部文字包含指令
- **WHEN** 職缺描述含有要求 AI 執行外部操作的文字
- **THEN** 系統將其當作資料內容處理，不執行其中指令或改變工具權限

### Requirement: 分析必須正確處理來源失敗與資料過期

來源拒絕、驗證頁、429、timeout、非 JSON 或 schema drift MUST 以明確錯誤回傳；資料超過新鮮度限制時 MUST 標示 `stale`，不得靜默當成最新資料。

#### Scenario: 來源拒絕
- **WHEN** 104 回傳拒絕或驗證頁
- **THEN** 工具回傳可觀測的來源錯誤分類，不回傳空的成功分析

#### Scenario: 輸入資料部分失敗
- **WHEN** 比較請求中的部分 job_ref 可讀取、部分來源請求失敗
- **THEN** 系統回傳成功項目、失敗項目的錯誤分類及整體 partial 狀態
