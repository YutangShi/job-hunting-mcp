# job-hunting-mcp

🌐 [繁體中文](README.md) | English

## Technology versions

[![Version](https://img.shields.io/badge/version-0.1.0-blue?label=version)](package.json)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.32.2-FF6F00)](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
[![Zod](https://img.shields.io/badge/Zod-4.6.7-3E67B1)](https://www.npmjs.com/package/zod)
[![impers](https://img.shields.io/badge/impers-0.1.2-6E56CF)](https://www.npmjs.com/package/impers)
[![Transport](https://img.shields.io/badge/transport-local%20stdio-555555)](README.en.md#how-mcp-works)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

`job-hunting-mcp` is a read-only Model Context Protocol (MCP) server for personal job search. An AI agent can search public listings from 104 and Cake using natural language and return the company, title, description, salary, location, source, and original link for every result.

## Scope

- Read-only public job search and details
- Automatically queries 104 and Cake; users do not select a source
- Defaults to 10 results per source; explicit `page_size` range is 10–20
- Uses source-qualified references such as `104:8ue17` and `cake:site-reliability-engineer-sre-71702b`
- No login, user cookies, applications, saving, following, or candidate data

## Installation

Clone the repository before installing dependencies and building:

```bash
git clone https://github.com/YutangShi/job-hunting-mcp.git
cd job-hunting-mcp
node --version
npm ci
npm run build
```

Requirements: Node.js 22 LTS, npm, and network access to 104 and Cake. `impers` uses a native curl-impersonate-compatible library; configure the native runtime if startup reports that it cannot be loaded.

## Install on AI agents

### Codex

Run from the project root:

```bash
NODE_BIN="$(command -v node)"
PROJECT_DIR="$(pwd -P)"
codex mcp add job-hunting-mcp -- "$NODE_BIN" "$PROJECT_DIR/dist/index.js"
codex mcp get job-hunting-mcp
```

Restart Codex after rebuilding. Re-register only when the project path or launch command changes.

### Claude Desktop

Add this to Claude Desktop's MCP configuration and replace both paths with absolute paths:

```json
{
  "mcpServers": {
    "job-hunting-mcp": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/job-hunting-mcp/dist/index.js"]
    }
  }
}
```

Use `command -v node` on macOS/Linux or `where node` on Windows. Restart Claude Desktop after saving the configuration.

### ChatGPT and other hosted agents

This version is a local stdio server. Codex CLI and Claude Desktop can launch the local process directly. ChatGPT web and other hosted agents generally require a remotely reachable MCP server, an HTTPS endpoint, authentication, and a client-specific connector configuration. Remote deployment for those clients is not included in this version.

## How MCP works

```text
User request
  ↓
AI agent calls search_jobs
  ↓
job-hunting-mcp queries 104 and Cake independently
  ↓
Normalized results preserve source and source status
  ↓
AI agent calls get_job_details with the returned job_ref
```

Local clients communicate through stdio MCP frames. Source requests use bounded pacing and response limits. If one source fails, successful results from another source remain available and the response reports the failed source and error category.

## MCP tools

The program currently registers exactly two MCP tools. `smoke:104`, `smoke:cake`, and `test:e2e` are validation commands, not MCP tools.

| Tool | Purpose | Main input | Returned data |
|---|---|---|---|
| `search_jobs` | Search public jobs across all enabled sources | `keyword`, `area`, `jobcat`, `salary_min`, `job_type`, `remote`, `is_new`, `exp_years`, `edu`, `sort`, `page`, `page_size` | Company, title, description, salary, location, source, original link, `job_ref`, source status |
| `get_job_details` | Retrieve full public details for a search result | `job_ref` returned by `search_jobs` | Company, title, full description, requirements, salary, location, source, original link |

`search_jobs` does not accept a `source` field. `get_job_details` does not accept an arbitrary URL; it accepts only a source-qualified `job_ref`.

## Testing

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run smoke:104
npm run smoke:cake
```

- `npm test`: unit, adapter, transport, and in-memory MCP tests
- `npm run typecheck`: TypeScript type checking
- `npm run build`: creates `dist/index.js`
- `npm run test:e2e`: starts the built stdio MCP server, lists all tools, and invokes search and details
- `npm run smoke:104`: live Taipei SRE search and details validation
- `npm run smoke:cake`: live Cake SRE search and details validation; 403, 429, challenge, and schema changes fail explicitly

## License

This project is released under the MIT License. See [LICENSE](LICENSE). Third-party area and job-category tables retain their separate notice in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
