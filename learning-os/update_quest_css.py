import re

with open('app/globals.css', 'r') as f:
    css = f.read()

quest_css = """
/* Quest Details Gamification */
.quest-step {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--border-2);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 14px;
}
.step-header {
  display: flex; align-items: center; gap: 10px;
}
.step-num {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  background: var(--accent); color: #000; font-weight: bold; font-family: var(--sans); font-size: 13px;
}
.step-title {
  color: var(--accent); font-family: var(--serif); font-weight: bold; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}
.quest-textarea {
  width: 100%; min-height: 80px; margin-top: 10px;
  background: rgba(0,0,0,0.3) !important; border: 1px solid var(--border-2) !important;
  color: var(--text) !important; padding: 10px !important; border-radius: 6px !important;
  font-family: var(--sans) !important; font-size: 14px !important; resize: vertical;
}
.quest-textarea:focus { border-color: var(--accent) !important; outline: none; }
.quest-select {
  background: rgba(0,0,0,0.3) !important; border: 1px solid var(--border-2) !important;
  color: var(--text) !important; padding: 8px 10px !important; border-radius: 6px !important; width: 100% !important;
  font-family: var(--sans); font-size: 13px; outline: none;
}
"""
css += "\n" + quest_css

with open('app/globals.css', 'w') as f:
    f.write(css)
