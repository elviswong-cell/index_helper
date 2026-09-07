#!/usr/bin/env node
/**
 * MCP server for the Helper Recruitment platform's admin operations.
 *
 * Gives an LLM full admin control over the app's Firestore data — creating
 * and editing tasks, reviewing/deciding registrations, managing the tutor
 * database, and handling invoices — via the Firebase Admin SDK, which
 * bypasses the app's normal Firestore security rules entirely. Treat the
 * service-account credential this server runs with as a master key: see
 * README.md before deploying it anywhere.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerRegistrationTools } from "./tools/registrations.js";
import { registerTutorTools } from "./tools/tutors.js";
import { registerInvoiceTools } from "./tools/invoices.js";

const server = new McpServer({
  name: "helper-recruitment-mcp-server",
  version: "1.0.0",
});

registerTaskTools(server);
registerRegistrationTools(server);
registerTutorTools(server);
registerInvoiceTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("helper-recruitment-mcp-server running via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
