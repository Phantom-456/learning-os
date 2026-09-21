import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerConceptTools } from './tools/concepts';

const server = new McpServer({ name: 'learning-os', version: '0.1.0' });
registerConceptTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('learning-os MCP server failed to start:', err);
  process.exit(1);
});
