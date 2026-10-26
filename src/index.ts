import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ImpersTransport } from "./sources/104/http-transport.js";
import { Job104Adapter } from "./sources/104/adapter.js";
import { CakeAdapter } from "./sources/cake/adapter.js";
import { CakeHtmlTransport } from "./sources/cake/http-transport.js";
import { MultiSourceAdapter } from "./sources/multi-source-adapter.js";
import { createMcpServer } from "./server.js";

const http = new ImpersTransport();
const cakeHttp = new CakeHtmlTransport();
const adapter = new MultiSourceAdapter([new Job104Adapter(http), new CakeAdapter(cakeHttp)]);
const server = createMcpServer(adapter);
const transport = new StdioServerTransport();

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`Received ${signal}; stopping job-hunting-mcp.`);
  try {
    await server.close();
  } finally {
    await adapter.close();
  }
}

process.once("SIGINT", () => { void shutdown("SIGINT").finally(() => process.exit(0)); });
process.once("SIGTERM", () => { void shutdown("SIGTERM").finally(() => process.exit(0)); });

try {
  await server.connect(transport);
} catch (error) {
  console.error("Unable to start job-hunting-mcp:", error instanceof Error ? error.message : String(error));
  await adapter.close().catch(() => undefined);
  process.exitCode = 1;
}
