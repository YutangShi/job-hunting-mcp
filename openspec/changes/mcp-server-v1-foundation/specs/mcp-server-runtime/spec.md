# Spec Delta

## Purpose

提供可由 Codex 本機啟動的 TypeScript MCP server，透過 stdio 安全地提供唯讀 104 搜尋與詳情工具，並讓本機安裝與實際工具呼叫可重現。

## ADDED Requirements

### Requirement: Server exposes documented read-only tools over stdio
The system SHALL register the documented job search and detail tools on a local stdio MCP server.

#### Scenario: Codex starts the configured server
- **WHEN** Codex starts the server with the documented command
- **THEN** it can list `search_jobs` and `get_job_details` and invoke each with the documented input schema

#### Scenario: End-to-end check covers every exposed tool
- **WHEN** the stdio E2E test starts the built server and lists its tools
- **THEN** it verifies the full tool set and successfully invokes every listed tool, including searching Taipei SRE jobs and retrieving details with a returned `job_ref`

#### Scenario: Server emits diagnostics
- **WHEN** the server starts or encounters an error
- **THEN** stdout remains a valid MCP protocol stream and diagnostic messages go to stderr

### Requirement: Source network requests use a bounded HTTP client
The system SHALL isolate source network access behind the 104 adapter and enforce timeout, request pacing, pagination, response size, and output size limits.

#### Scenario: Repeated requests are made
- **WHEN** multiple 104 requests are issued by a tool call
- **THEN** the adapter observes its configured minimum interval and does not fan out unbounded requests

#### Scenario: Upstream request exceeds its deadline or response limit
- **WHEN** a source request exceeds the configured timeout or body limit
- **THEN** the adapter stops reading and returns a classified source error

### Requirement: Source denial is observable and not hidden
The system SHALL expose upstream refusal and format failures as explicit errors and SHALL NOT convert them into successful empty results.

#### Scenario: Upstream returns refusal or a verification response
- **WHEN** the source returns 401, 403, 429, or a non-JSON verification page
- **THEN** the tool returns the corresponding source failure category and does not claim no matching jobs were found

#### Scenario: Upstream schema changes
- **WHEN** runtime validation rejects an upstream response
- **THEN** the tool returns `SOURCE_SCHEMA_CHANGED` without returning raw response content

### Requirement: Server does not collect account credentials or user cookies
The system SHALL perform V1 searches without requiring 104 account credentials, user cookies, or interactive login.

#### Scenario: Search or details are called
- **WHEN** a client invokes a V1 tool
- **THEN** the server uses only its configured public read-only source client and does not request credentials or cookies from the MCP caller

### Requirement: MCP protocol output does not expose sensitive diagnostics
The system SHALL log only bounded operational metadata and SHALL exclude secrets, full user prompts, and full job descriptions from logs.

#### Scenario: Tool call succeeds or fails
- **WHEN** a tool call completes or fails
- **THEN** diagnostics include only safe source, duration, count, and error-class fields needed for troubleshooting
