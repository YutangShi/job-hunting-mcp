# Design

## Context

See `proposal.md` and the two capability specs for V1 user-visible behavior. The repository started as documentation only. V1 now targets real 104 public listings and Codex local stdio integration; Cake and remote hosting remain out of scope.

## Goals / Non-Goals

**Goals:**

- Use TypeScript for the MCP server and domain contract.
- Use the reference project's web JSON endpoints and browser-compatible TLS/HTTP2 client behavior for 104 requests.
- Prove that Codex can search for SRE jobs and retrieve details using a result reference.
- Bound request frequency, time, pages, response sizes and output while surfacing upstream errors clearly.

**Non-Goals:**

- Cake, remote Streamable HTTP, OAuth, company analytics, candidate data or platform write operations.
- Account login, user cookies, proxy rotation, CAPTCHA/verification solving, or full-site data mirroring.
- Guaranteeing that an unofficial web endpoint remains stable or always returns results.

## Decisions

### 1. Keep the MCP server source-neutral, initially enable only 104

The MCP tools accept job criteria, not a source selector. A dispatcher invokes configured adapters; V1 config enables only `104`. Each result contains `source`, `job_ref`, source URL, and retrieval timestamp. Details accept only `104:<short-code>` and derive the URL from the fixed 104 host.

**Alternative considered:** Put the 104 HTTP code directly in each tool. Rejected because it couples the client contract to one source and complicates adding Cake later.

### 2. Use TypeScript `impers` as the first HTTP client candidate

`impers` is a TypeScript/Node binding to curl-impersonate. It is the closest direct match to the reference project's `curl_cffi` behavior without running a second application runtime. Pin its package version and curl-impersonate library release, validate supported OS/architecture and clean installation, and encapsulate it behind `HttpTransport`. If the alpha package is unstable on target platforms, the `HttpTransport` boundary allows a persistent `curl_cffi` worker without changing tools or domain types.

**Alternative considered:** Node built-in `fetch`/Undici. Rejected because it does not provide the same curl-impersonate browser TLS/HTTP2 behavior. A separate Python worker is retained as a fallback, not the initial path, to avoid adding IPC and another runtime before evidence requires it.

### 3. Call the same category of 104 web JSON endpoints as the reference

The adapter uses the search JSON endpoint `https://www.104.com.tw/jobs/search/api/jobs` and details endpoint `https://www.104.com.tw/job/ajax/content/{shortCode}` described in the reference implementation. Query construction and response mapping live in separate modules. Area and job-category names are resolved through bundled code tables; unknown values return bounded suggestions. Details use the short code from `link.job`, not numeric `jobNo`.

**Alternative considered:** Scrape rendered HTML. Rejected because the reference JSON responses are structured and can be validated more directly.

### 4. Validate responses and fail explicitly

Use runtime schemas for search metadata, job rows, and details. Unknown fields are ignored; required-field failures, non-JSON content, status 401/403/429, timeouts, and oversized payloads map to distinct errors. No source error becomes a zero-result success. Retry only transient network failures within a small bounded budget; do not retry refusals or verification pages.

**Alternative considered:** Parse arbitrary upstream JSON permissively. Rejected because upstream drift would silently produce misleading results or malformed `job_ref` values.

### 5. Provide one compact but useful Codex tool interface

Expose `search_jobs` with keyword, area, job category, salary floor, employment type, remote, experience, education, sorting, page and page size; clamp page size and max page. Expose `get_job_details` with one `job_ref` argument. Return concise structured data plus readable text, with visible source attribution. Do not return HR contact fields.

**Alternative considered:** Reproduce every feature in the user's initial table. Rejected for V1 because session/login, saves, company tracking, and reload are unrelated to read-only job discovery and introduce credentials or write effects.

### 6. Use Codex stdio as the first client target

Use `@modelcontextprotocol/sdk` stdio transport. Provide a project-local configuration example and verify using the MCP SDK client against the built server; then configure or invoke it from Codex if the current environment permits. Keep stdout protocol-clean and write diagnostics to stderr.

**Alternative considered:** Start with remote OAuth deployment. Rejected because the immediate acceptance target is a working Codex query and local stdio removes hosting and identity setup from the critical path.

## Risks / Trade-offs

- [104 changes its web endpoint or response schema] → Runtime validation, clear `SOURCE_SCHEMA_CHANGED`, versioned fixtures, and a live SRE smoke check.
- [`impers` is alpha and uses native libraries] → Pin versions, validate the actual target OS/architecture, provide explicit native-library configuration, and preserve the HTTP transport interface for a Python fallback.
- [Browser fingerprint requests may still be refused or challenged] → Respect request pacing and stop on refusal/challenge; report the actual failure instead of claiming no jobs exist.
- [Search filters may not be strict filters upstream] → Document the true 104 semantics, especially salary sorting vs. salary filtering.
- [Codex may surface result ordering and long descriptions differently] → Cap output and validate with a real MCP tool call using `SRE`.

## Migration Plan

Greenfield implementation. Build TypeScript scaffolding and runtime schemas; implement the isolated 104 transport, query mapper and response parser; register tools; build and install into Codex; run unit tests and a live SRE search/detail smoke check. If `impers` fails a platform requirement, switch only the HTTP transport implementation to a persistent `curl_cffi` worker. No database migration or existing endpoint migration is needed.

## Open Questions

None for the V1 scope. `impers` support is a measurable implementation gate: either its pinned build passes clean install and live smoke checks, or the transport fallback is used without changing MCP behavior.
