# Spec Delta

## Purpose

提供不需選擇來源的職缺搜尋與詳情查詢，V1 以 104 網站目前提供給網頁使用的 JSON 資料取得公開職缺，並在每筆結果標示來源。

## ADDED Requirements

### Requirement: Search enabled sources without a user-selected source
The system SHALL search every configured and enabled source without requiring the user to provide a source selector.

#### Scenario: 104 is the enabled V1 source
- **WHEN** the user searches for a job and 104 is enabled
- **THEN** the system queries 104 and returns results labeled with source `104`

#### Scenario: No source is enabled
- **WHEN** the user searches and no source is enabled
- **THEN** the system returns an explicit `NO_SOURCE_ENABLED` error rather than a successful empty result

### Requirement: Search results identify their data source
The system SHALL include a source name, source-qualified reference, original source URL, and retrieval time in each returned job.

#### Scenario: 104 returns a matching job
- **WHEN** a job is returned from 104 search
- **THEN** its result contains `source: 104`, a `104:`-prefixed `job_ref`, a validated 104 job URL, and `fetched_at`

#### Scenario: Search result is rendered as readable text
- **WHEN** the tool returns one or more jobs
- **THEN** each readable job entry includes company, job title, work-description snippet, salary, and the original 104 job link, and displays missing description or salary as `未提供`

### Requirement: Search filters reflect upstream semantics
The system SHALL translate only recognized search parameters and SHALL disclose when an upstream parameter sorts results instead of enforcing a hard filter.

#### Scenario: Salary floor is requested
- **WHEN** the 104 endpoint cannot guarantee a salary minimum filter
- **THEN** the system does not claim all results satisfy the salary floor and explains the actual endpoint behavior

#### Scenario: Region or job category is unknown
- **WHEN** a Chinese region or job category cannot be resolved by the bundled code tables
- **THEN** the system returns an unknown-filter error with bounded suggestions and does not guess a code

#### Scenario: Search is limited to Taipei City
- **WHEN** the user searches for `SRE` and selects `台北市`
- **THEN** the system sends the 104 Taipei City area code and returned jobs have Taipei City locations, while retaining multiple matching SRE listings when the source provides them

### Requirement: Search results are bounded
The system SHALL enforce page and response limits and SHALL report whether additional source pages may exist.

#### Scenario: Requested page size exceeds maximum
- **WHEN** the user requests more results than the configured maximum
- **THEN** the server clamps or rejects the value with a clear limit explanation before making an upstream request

#### Scenario: Upstream indicates additional pages
- **WHEN** the 104 response reports a later page
- **THEN** the tool reports `has_next` without claiming that the current response is exhaustive

### Requirement: Search failures are explicit
The system SHALL distinguish a successful empty search from HTTP refusal, rate limit, timeout, verification page, invalid JSON, and upstream schema change.

#### Scenario: 104 refuses or rate limits a request
- **WHEN** the 104 endpoint returns 401, 403, 429, a verification challenge, or a non-JSON denial page
- **THEN** the tool returns a source error category and does not report zero matching jobs

#### Scenario: Upstream response shape changes
- **WHEN** a response lacks required fields or fails runtime schema validation
- **THEN** the tool returns `SOURCE_SCHEMA_CHANGED` and does not expose unvalidated raw JSON

### Requirement: Job details route through a validated reference
The system SHALL retrieve details only from a validated source-qualified job reference and SHALL NOT accept caller-provided URLs.

#### Scenario: Search result is passed to details
- **WHEN** the caller sends a valid `104:` reference returned by search
- **THEN** the system extracts the 104 short job code, fetches its details, and returns source `104` with the original URL

#### Scenario: Invalid or unsupported reference is sent
- **WHEN** the caller sends malformed, unknown, or non-104 reference
- **THEN** the system returns a clear input error and makes no upstream request

### Requirement: Public listing text is bounded and untrusted
The system SHALL return only allow-listed public job fields with bounded string sizes and SHALL treat all upstream text as untrusted content.

#### Scenario: Listing includes prompt-like text or unknown fields
- **WHEN** the upstream response contains instruction-like content or unexpected fields
- **THEN** the system returns bounded listing text as data, ignores unknown fields, and does not execute the content
