# Spec Delta

## Purpose

讓求職者以職務條件搜尋所有已授權的職缺來源，並在結果中辨識每筆資料來自哪個平台，而不必自行選擇或先知道來源平台。

## ADDED Requirements

### Requirement: Search automatically covers enabled authorized sources
The system SHALL search every source that is both enabled and covered by a documented authorization, without requiring the user to provide a source selector.

#### Scenario: Multiple sources are enabled
- **WHEN** the user searches with job criteria and more than one source is enabled and authorized
- **THEN** the system queries each eligible source and returns the available results without asking the user to choose a platform

#### Scenario: A source is unauthorized or disabled
- **WHEN** a source lacks verified authorization or is administratively disabled
- **THEN** the system does not query that source and does not represent it as an available search source

### Requirement: Every job result identifies its source
The system SHALL label every returned job with its source name, source-scoped job identifier, original source URL, and retrieval timestamp when available.

#### Scenario: Results come from more than one source
- **WHEN** a search returns jobs from multiple sources
- **THEN** each result can be attributed to its source without inferring the source from field format or identifier value

#### Scenario: Two sources use the same job identifier
- **WHEN** different sources return jobs with identical source-local identifiers
- **THEN** the system keeps their references distinct by including the source identity in each job reference

### Requirement: Job detail lookup uses a source-qualified reference
The system SHALL let the user-facing agent retrieve job details using a reference returned with a search result, without requiring the user to separately provide a source name.

#### Scenario: Detail lookup follows a search result
- **WHEN** the agent requests details using a valid job reference from a search result
- **THEN** the system routes the request to the referenced source and returns only fields permitted for that source

#### Scenario: Job reference is invalid or unknown
- **WHEN** a detail request contains an invalid, unknown, or unsupported source-qualified reference
- **THEN** the system returns a clear invalid-reference or unsupported-source error and does not query a different source as fallback

### Requirement: Partial source failures remain visible
The system SHALL return successful results from available sources when another eligible source fails, and SHALL disclose the failed source and failure category in the response.

#### Scenario: One source fails during search
- **WHEN** at least one eligible source returns results and another eligible source fails
- **THEN** the system returns the successful results and a partial-result status identifying the failed source and safe error category

#### Scenario: All eligible sources fail
- **WHEN** every eligible source fails or no authorized source is available
- **THEN** the system returns an explicit unavailable or authorization-required outcome rather than an empty result set that implies no matching jobs exist

### Requirement: Search criteria respect source capabilities
The system SHALL apply each search criterion only according to the supported semantics of each eligible source and SHALL disclose criteria that a source cannot enforce.

#### Scenario: A source does not support a requested filter
- **WHEN** the user requests a criterion that an eligible source cannot enforce
- **THEN** the response identifies the unsupported or approximate criterion for that source and does not claim the source results satisfy a hard filter that was not applied

### Requirement: Search defaults to ten results per enabled source
The system SHALL default `page_size` to 10 for every enabled source and SHALL accept explicit page sizes from 10 through 20.

#### Scenario: User omits page size
- **WHEN** the user searches without providing `page_size`
- **THEN** each eligible source is asked for 10 results, and the system returns fewer only when that source has fewer matching jobs

#### Scenario: User requests fewer than ten results
- **WHEN** the user provides a `page_size` below 10
- **THEN** the tool rejects the input with a validation error before querying any source
