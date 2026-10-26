# Spec Delta

## Purpose

讓維護者能以完整、正確且可驗證的公開資訊，提交遠端 MCP 服務至第三方 MCP 伺服器目錄，並讓使用者知道如何連線、使用與聯絡服務維護者。

## ADDED Requirements

### Requirement: Public directory metadata is complete
The project SHALL maintain a directory submission record with a server name, applicable category, concise user-facing description, public source-code/repository/website/documentation URL, remote-connection support status, and a maintained contact email; the official MCP Registry name SHALL be optional.

#### Scenario: Maintainer prepares a submission
- **WHEN** a maintainer prepares the mcpservers.org submission
- **THEN** every required field has a verified value and the optional official registry name is either a valid published identifier or left blank

#### Scenario: Submission metadata is stale or incomplete
- **WHEN** a required field is missing, points to a private resource, or contradicts the deployed service
- **THEN** the project is not considered ready for directory submission

### Requirement: Remote connection is documented and verifiable
The project SHALL provide a public HTTPS remote MCP endpoint and user-facing connection instructions before claiming remote support in a directory listing.

#### Scenario: Remote support is declared
- **WHEN** the project marks remote connection support in a directory listing
- **THEN** the documented endpoint is reachable by intended clients, uses the documented MCP transport, and the instructions explain setup, authentication if required, supported clients, and common connection errors

#### Scenario: Remote endpoint is unavailable
- **WHEN** the endpoint fails its public connectivity or MCP handshake check
- **THEN** the listing SHALL NOT claim the service is remotely available until the failure is resolved and re-verified

### Requirement: Public documentation explains service and data boundaries
The project SHALL publish documentation that explains tool behavior, installation or connection steps, support contact, privacy-relevant data flows, source attribution, and any material availability or data-freshness limitations before public listing.

#### Scenario: User evaluates the service before connecting
- **WHEN** a user follows the public documentation link from a directory entry
- **THEN** the user can identify what the tools do, which sources are enabled, what query data and results are processed, how to connect, and where to report a problem

#### Scenario: A source is not authorized or enabled
- **WHEN** a source lacks a documented official API, contract, or written authorization
- **THEN** public documentation identifies that source as unavailable or pending authorization, and the service does not query it

### Requirement: Directory publication follows source authorization
The project SHALL submit or publish a source-backed job-search MCP service only when each enabled source's permitted access, fields, attribution, use, rate limits, retention, and client-side data transfer scope are documented.

#### Scenario: All enabled sources have documented authorization
- **WHEN** a maintainer reviews the pre-publication checklist
- **THEN** each enabled source has a recorded authorization basis and the user-visible service behavior stays within its permitted scope

#### Scenario: A source refuses access or authorization is unclear
- **WHEN** a source returns an explicit refusal or its authorization scope cannot be verified
- **THEN** that source remains disabled and the listing does not imply that its job data is available
