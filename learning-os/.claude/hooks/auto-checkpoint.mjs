#!/usr/bin/env node
// PostToolUse hook, matched against the learning-os MCP server's checkpoint-
// mutating tools (set_checkpoint_depends_on, update_project). Reads the hook
// JSON on stdin, extracts the project id from the tool call's input, and if
// any checkpoint just became unblocked, prints that to stdout.
// Invoked via `npx tsx .claude/hooks/auto-checkpoint.mjs` (see .claude/settings.json)
// because lib.mjs imports lib/core/*.ts TypeScript source directly.
import { summarizeUnblocked } from './lib.mjs';

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const toolInput = payload.tool_input ?? {};
    const projectId = toolInput.projectId ?? toolInput.id;
    if (projectId) {
      const summary = summarizeUnblocked(projectId);
      if (summary) process.stdout.write(`${summary}\n`);
    }
  } catch {
    // Malformed input — fail silently, never block the tool call.
  }
  process.exit(0);
});
