import re

with open('app/globals.css', 'r') as f:
    css = f.read()

card_style = """
[data-theme="rustic-castle"] .tile,
[data-theme="rustic-castle"] .card,
[data-theme="rustic-castle"] .phase,
[data-theme="rustic-castle"] .tl-block {
  background-image: var(--bg-parchment);
  background-size: cover;
  background-blend-mode: overlay;
  border-color: var(--accent);
  color: var(--text);
  box-shadow: 0 4px 10px rgba(0,0,0,0.6);
}
"""
css += "\n" + card_style

with open('app/globals.css', 'w') as f:
    f.write(css)
