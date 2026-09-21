// Content pipeline (ARCHITECTURE.md §6): notes -> readable -> hooks + structure.
// Providers are PLUGGABLE. With no API key the LocalProvider gives a deterministic,
// fully-offline result so the app is usable with zero configuration. An LLM
// provider can be added later behind the same interface without touching callers.

export type VideoKind = 'short' | 'long';

export interface HookResult {
  hooks: string[];
  structure: string[];
}

export interface Provider {
  name: string;
  makeReadable(notes: string, title: string): Promise<string>;
  hooks(readable: string, title: string, kind: VideoKind): Promise<HookResult>;
}

const TEMPLATE_SLOTS = [
  'Why it exists',
  'Intuition',
  'Formal definition',
  'Derivation',
  'Assumptions & failure modes',
  'Worked example (by hand)',
  'Implementation',
  'On YOUR robot',
  'Connections',
  'Misconceptions & gotchas',
  'Self-test',
  'Hooks',
];

/** Offline provider: organizes a free-form dump into the §2 template skeleton. */
class LocalProvider implements Provider {
  name = 'local';

  async makeReadable(notes: string, title: string): Promise<string> {
    const trimmed = (notes || '').trim();
    const slots = TEMPLATE_SLOTS.map(
      (slot) => `## ${slot}\n\n_TODO — in your own words._\n`
    ).join('\n');
    const capture = trimmed
      ? `> Raw capture (moved here; rewrite into the slots above in your own words):\n>\n${trimmed
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n')}\n`
      : '';
    return `# ${title}\n\n${slots}\n---\n\n${capture}`;
  }

  async hooks(_readable: string, title: string, kind: VideoKind): Promise<HookResult> {
    // Hook patterns drawn from STUDY-PLAN §3 (slots 10/12 are the shareable bits).
    const hooks = [
      `The counterintuitive one: "There's something about ${title} almost everyone gets backwards."`,
      `The failure demo: "Watch what breaks the instant I remove ${title} from the loop."`,
      `The payoff tease: "By the end of this, ${title} makes the robot do it on its own."`,
    ];
    const structure =
      kind === 'short'
        ? [
            'Hook (0–3s): the surprising line above',
            `The one idea of ${title}, shown in sim`,
            'The turn / the "aha"',
            'One-line takeaway',
            'Soft CTA: "full build in the pinned video"',
          ]
        : [
            `Cold-open the result ${title} gets you`,
            'The problem it solves',
            'Intuition',
            'The honest math (kept tight)',
            'Build & simulate it live',
            'It works (demo)',
            'Recap + what it unlocks → next',
          ];
    return { hooks, structure };
  }
}

export function getProvider(): Provider {
  // When keys arrive, branch here, e.g.:
  //   if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
  //   if (process.env.ANTHROPIC_API_KEY) return new AnthropicProvider();
  return new LocalProvider();
}
