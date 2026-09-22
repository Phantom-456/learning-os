import re

with open('app/globals.css', 'r') as f:
    content = f.read()

# Replace the rustic-castle section
castle_theme_new = """
[data-theme="rustic-castle"] {
  --bg: #1c201e; /* Dark mossy stone */
  --panel: #262c28; /* Lighter mossy stone block */
  --panel-2: #2e3631;
  --panel-3: #39423c;
  --border: #3b453d;
  --border-2: #4a574d;
  --text: #e6e3cf; /* Old parchment / off-white */
  --muted: #a3a89e;
  --muted-2: #7b8277;

  --accent: #d4af37; /* Fairy tale gold / amber instead of harsh neon green */
  --accent-ink: #1c201e;
  --pink: #ff1493;
  --red: #c94f4f;
  --green: #5cc279;
  --amber: #d4af37;
  --blue: #5d98d4;
  --orange: #d97d43;

  --serif: "Palatino Linotype", "Book Antiqua", Palatino, serif;
}

[data-theme="rustic-castle"] body {
  /* Subtle stone/parchment texture overlay using radial gradients */
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(20, 25, 20, 0.4) 0%, transparent 20%),
    radial-gradient(circle at 90% 80%, rgba(15, 20, 15, 0.5) 0%, transparent 30%),
    linear-gradient(to bottom, #1c201e, #141715);
  background-attachment: fixed;
}

[data-theme="rustic-castle"] .page-head h1 {
  font-family: var(--serif);
  color: var(--accent);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  letter-spacing: 1px;
}

[data-theme="rustic-castle"] .brand {
  font-family: var(--serif);
  color: var(--accent);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-size: 22px;
}

[data-theme="rustic-castle"] .tile,
[data-theme="rustic-castle"] .card,
[data-theme="rustic-castle"] .phase,
[data-theme="rustic-castle"] .tl-block,
[data-theme="rustic-castle"] .react-flow__node {
  /* Crayon / rough stone look */
  box-shadow: 
    inset 0 0 12px rgba(0,0,0,0.4), 
    0 4px 6px rgba(0,0,0,0.3),
    0 1px 1px rgba(255,255,255,0.05);
  border: 1px solid var(--border-2);
  border-radius: 4px; /* blocky like castle stones */
  position: relative;
  overflow: hidden;
}

[data-theme="rustic-castle"] .tile::before,
[data-theme="rustic-castle"] .card::before,
[data-theme="rustic-castle"] .tl-block::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

[data-theme="rustic-castle"] .react-flow__node > * {
  position: relative;
  z-index: 1;
}

[data-theme="rustic-castle"] .tile > *,
[data-theme="rustic-castle"] .card > *,
[data-theme="rustic-castle"] .tl-block > * {
  position: relative;
  z-index: 1;
}

[data-theme="rustic-castle"] .nav a.active {
  background: rgba(212, 175, 55, 0.1); /* Gold glow */
  border-left: 3px solid var(--accent);
  color: var(--accent);
}

[data-theme="rustic-castle"] .nav .dot {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

[data-theme="rustic-castle"] .btn.solid {
  background: linear-gradient(180deg, #d4af37, #aa8a29);
  border: 1px solid #7d651d;
  color: #111;
  text-shadow: 0 1px 0 rgba(255,255,255,0.3);
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
}
[data-theme="rustic-castle"] .btn.solid:hover {
  filter: brightness(1.15);
}
"""

# Replace the old rustic-castle block
content = re.sub(
    r'\[data-theme="rustic-castle"\].*?(?=\[data-theme="light"\])', 
    castle_theme_new + '\n\n', 
    content, 
    flags=re.DOTALL
)

with open('app/globals.css', 'w') as f:
    f.write(content)
