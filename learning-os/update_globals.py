import re

with open('app/globals.css', 'r') as f:
    css = f.read()

# Remove sidebar CSS
css = re.sub(r'\.shell \{.*?\}', '.shell { min-height: 100vh; display: flex; flex-direction: column; }', css, flags=re.DOTALL)
css = re.sub(r'\.sidebar \{.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'@media \(max-width: 768px\) \{.*?\}', '', css, flags=re.DOTALL)

# Add game-btn CSS and Nano Banana
game_styles = """
.game-btn {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: var(--bg-parchment, var(--panel-2)); border: 2px solid var(--accent);
  color: var(--text); font-family: var(--serif); font-size: 24px; font-weight: bold;
  padding: 16px 24px; border-radius: 12px; cursor: pointer; text-decoration: none;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5); transition: transform 0.1s, filter 0.1s;
  background-size: cover; background-blend-mode: overlay;
}
.game-btn:hover { transform: scale(1.05); filter: brightness(1.1); }
.game-btn:active { transform: scale(0.95); }
"""
css += "\n" + game_styles

# Update rustic-castle theme root variables
castle_root = """[data-theme="rustic-castle"] {
  --bg: #1c201e; 
  --panel: rgba(20, 25, 20, 0.85); 
  --panel-2: rgba(30, 36, 30, 0.9); 
  --panel-3: rgba(45, 55, 45, 0.9);
  --border: #4a544d; --border-2: #3a423d;
  --text: #e6e3cf; --muted: #a4a8a0; --muted-2: #6b736c;
  --accent: #FFE135; /* Nano Banana! */
  --accent-rgb: 255, 225, 53;
  --amber: #f9a826; --green: #4caf50; --red: #e53935; --blue: #29b6f6;
  --sans: system-ui, -apple-system, sans-serif;
  --serif: "Palatino Linotype", "Book Antiqua", Palatino, serif;
  --radius: 12px; --radius-sm: 8px;
  
  --bg-castle: url('/assets/castle-bg.jpg');
  --bg-parchment: url('/assets/parchment-bg.jpg');
}"""
css = re.sub(r'\[data-theme="rustic-castle"\] \{.*?\}', castle_root, css, count=1, flags=re.DOTALL)

# Add body background for rustic-castle
castle_body = """[data-theme="rustic-castle"] body {
  background-image: var(--bg-castle);
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
  color: var(--text);
}
"""
css = re.sub(r'\[data-theme="rustic-castle"\] body \{.*?\}', castle_body, css, count=1, flags=re.DOTALL)

with open('app/globals.css', 'w') as f:
    f.write(css)
