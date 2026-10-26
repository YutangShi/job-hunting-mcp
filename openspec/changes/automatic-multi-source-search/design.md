# Design

## Context

See `proposal.md` for motivation and `specs/job-search/spec.md` for the externally visible behavior. The project has no implementation yet. Data source access remains disabled until each source has documented authorization.

## Goals / Non-Goals

**Goals:**

- Keep the user search experience source-agnostic while making result provenance explicit.
- Route detail lookups safely from a result reference without asking the user to repeat the source.
- Isolate source failures and source-specific filter capabilities.

**Non-Goals:**

- Letting users choose a source in the first search interface.
- Merging apparently similar jobs from different sources into one record.
- Accessing unauthorized or undocumented source endpoints.
- Returning candidate personal data, HR contact details, or performing login, save, follow, or apply actions.

## Decisions

### 1. Do not expose a source selector in user-facing search input

The search schema contains job criteria only. The dispatcher fans out to all source adapters that are both authorized and enabled. Source selection remains an operator configuration, not a required user decision. A source that is disabled, unlicensed, or missing authorization is skipped and cannot silently be queried.

**Alternative considered:** Make `source` a required enum parameter or ask the user to select a platform. Rejected because job seekers describe the job they want, not the site where it may be posted.

### 2. Attach provenance and a namespaced reference to every result

Each result includes a human-readable source label, a source-scoped job ID, the source's original URL, retrieval time, and a `job_ref` that includes source identity (for example, `104:<source-job-id>` or `cake:<source-job-id>`). The detail tool accepts only `job_ref` and validates its source prefix and ID before routing. The reference is supplied by the previous tool result; the user does not need to type or choose the source.

**Alternative considered:** Use the raw source ID alone or require separate `source` and `job_id` arguments. Rejected because source-local IDs may collide and separate inputs create avoidable ambiguity.

### 3. Fan out with bounded concurrency and source-isolated outcomes

Query eligible adapters concurrently with per-source timeout, response-size and page-size limits, and shared global/user quotas. Successful sources return results even if another source fails. The response includes per-source outcome metadata and a partial-results indicator. If no source is eligible or all eligible sources fail, return an explicit unavailable/authorization-required error rather than an empty match list.

**Alternative considered:** Fail the entire request on the first failed source. Rejected because one platform outage should not suppress useful results from other authorized sources. Unbounded parallel fan-out is also rejected because it can exceed source quotas.

### 4. Apply only source-supported filters and disclose gaps

Each adapter declares supported filter semantics. The dispatcher applies only supported filters; when a requested criterion cannot be enforced by a source, the result identifies the unsupported or approximate criterion. It must not imply a hard filter was enforced if it was not.

**Alternative considered:** Force all platforms into identical semantics. Rejected because salary, location, experience, recency, and remote-work filters may differ or may not exist in every source.

### 5. Keep cross-source duplicates separate by default

Do not merge two listings merely because title, company, or description looks similar. Preserve each source record and provenance. A future deduplication feature requires an explicit, testable matching rule and must preserve links to all contributing sources.

**Alternative considered:** Fuzzy deduplication during aggregation. Rejected for the first release because it risks removing distinct jobs or hiding source attribution.

## Risks / Trade-offs

- [One source is slower and increases aggregate response time] → Use bounded per-source deadlines, return completed sources, and report partial status.
- [The model or user mistakes source IDs across platforms] → Use source-qualified `job_ref` and always return a visible source label.
- [Filter semantics differ by source] → Include per-source capability metadata and disclose unenforced or approximate filters.
- [A source endpoint rejects requests] → Stop that source according to its policy; do not retry through alternate endpoints or evasion methods.
- [The result list contains duplicates] → Keep records distinct in the first version and disclose source; do not risk destructive false merging.

## Migration Plan

This is a greenfield project, so no existing endpoint contract needs migration. Before implementation, finalize the normalized search/result schema with source-qualified references. Enable adapters only after authorization review, validate responses against authorized offline fixtures, then verify partial failure and provenance behavior through the MCP client.

## Open Questions

None that change this user-facing behavior. Per-source filter support and result fields remain determined by each source's eventual authorization and API contract.
