import re

with open('app/globals.css', 'r') as f:
    css = f.read()

css = css.replace("min-height: 80px;", "min-height: 150px;")

css += """
@keyframes fadeInOverlay {
  from { opacity: 0; }
  to { opacity: 1; }
}
.quest-panel-overlay {
  animation: fadeInOverlay 0.3s ease forwards;
}
"""

with open('app/globals.css', 'w') as f:
    f.write(css)
