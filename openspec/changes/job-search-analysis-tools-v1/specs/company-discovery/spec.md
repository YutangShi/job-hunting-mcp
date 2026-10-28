# Spec Delta

## Purpose

讓求職者能從既有職缺搜尋結果進入所屬公司的公開詳情，查看公司基本資訊與目前公開職缺，並在每筆結果上清楚辨識資料來源、擷取時間與資料完整性。

## ADDED Requirements

### Requirement: 公司詳情必須由職缺 reference 路由

`get_company_detail` SHALL 只接受由 `search_jobs` 回傳的來源限定 `job_ref`，由來源 adapter 解析該職缺所屬公司的公開資料，不要求使用者輸入平台專用 company ID 或任意 URL。

#### Scenario: 由職缺取得公司
- **WHEN** 使用者提供有效的 `104:<id>` 或受支援來源 job_ref
- **THEN** 系統回傳該職缺所屬公司的公開詳情、來源、原始公司 URL 與 `fetched_at`

#### Scenario: 任意 URL 或未知 reference
- **WHEN** 使用者傳入任意公司 URL、未來自 `search_jobs` 的 company ID 或無效 job_ref
- **THEN** 系統拒絕請求並不發出公司來源請求

### Requirement: 公司詳情必須限制於公開內容

`get_company_detail` MUST 只回傳公開公司介紹、福利、產業、規模、公司所在地及公開職缺清單；來源未提供的欄位必須標示 `not_provided`。

#### Scenario: 讀取公司詳情
- **WHEN** 使用有效 job_ref 且來源支援公司資料
- **THEN** 回傳公司公開欄位、職缺清單、來源、原始 URL 與 `fetched_at`

#### Scenario: 來源不支援公司資料
- **WHEN** 有效 job_ref 所屬來源沒有可驗證的公司端點
- **THEN** 回傳 `UNSUPPORTED_SOURCE_CAPABILITY`，不得回傳空的成功公司資料

#### Scenario: 嘗試讀取私人聯絡資料
- **WHEN** 上游內容包含未公開或個人化 HR 聯絡資料
- **THEN** 系統不回傳該資料，並維持公開資料邊界

### Requirement: 公司資料必須處理來源拒絕與 schema 變更

公司查詢遇到拒絕、驗證頁、429、timeout、非 JSON 或 schema drift MUST 回傳明確來源錯誤，不得轉成空公司清單或虛構公司資訊。

#### Scenario: 公司端點失敗
- **WHEN** 來源公司端點拒絕請求
- **THEN** 工具回傳來源錯誤 code、可供診斷的安全訊息與失敗來源

#### Scenario: 公司內容不完整
- **WHEN** 上游缺少必要識別欄位
- **THEN** 系統拒絕該筆資料並回報 schema validation error，不將不完整資料當成成功結果
