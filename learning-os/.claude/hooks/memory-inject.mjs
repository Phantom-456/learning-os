#!/usr/bin/env node
// UserPromptSubmit hook. Reads the hook JSON on stdin, and if the prompt
// text matches a known Concept/Course/Project/Template title, prints a
// short summary to stdout — Claude Code adds stdout text as additional
// context for this turn. Prints nothing and exits 0 on no match (the
// common case), so this costs nothing when it doesn't apply.
// Invoked via `npx tsx .claude/hooks/memory-inject.mjs` (see .claude/settings.json)
// because lib.mjs imports lib/core/*.ts TypeScript source directly.
import { matchEntityTitles, summarizeMatches } from './lib.mjs';

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const prompt = payload.prompt ?? '';
    const hits = matchEntityTitles(prompt);
    if (hits.length > 0) {
      process.stdout.write(`Learning OS context — this prompt mentions:\n${summarizeMatches(hits)}\n`);
    }
  } catch {
    // Malformed input or no matching content — fail silently, never block the prompt.
  }
  process.exit(0);
});
