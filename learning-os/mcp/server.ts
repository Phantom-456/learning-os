import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerConceptTools } from './tools/concepts';
import { registerSourceTools } from './tools/sources';
import { registerCourseTools } from './tools/courses';
import { registerTemplateTools } from './tools/templates';
import { registerGlobalKnowledgeTools } from './tools/globalKnowledge';
import { registerProjectTools } from './tools/projects';
import { registerPriceTools } from './tools/prices';
import { registerRollupTools } from './tools/rollup';

const server = new McpServer({ name: 'learning-os', version: '0.1.0' });
registerConceptTools(server);
registerSourceTools(server);
registerCourseTools(server);
registerTemplateTools(server);
registerGlobalKnowledgeTools(server);
registerProjectTools(server);
registerPriceTools(server);
registerRollupTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('learning-os MCP server failed to start:', err);
  process.exit(1);
});
