with open('app/globals.css', 'r') as f:
    css = f.read()

md_css = """
/* Markdown Styles */
.markdown-body {
  font-family: var(--sans);
  color: var(--text);
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  margin-top: 1.5em; margin-bottom: 0.5em;
  font-family: var(--serif); color: var(--accent);
}
.markdown-body p { margin-bottom: 1em; }
.markdown-body ul, .markdown-body ol { margin-left: 1.5em; margin-bottom: 1em; }
.markdown-body li { margin-bottom: 0.25em; }
.markdown-body code {
  background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 4px;
  font-family: monospace; font-size: 0.9em;
}
.markdown-body pre {
  background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px;
  overflow-x: auto; margin-bottom: 1em; border: 1px solid var(--border);
}
.markdown-body blockquote {
  border-left: 4px solid var(--accent); padding-left: 12px;
  color: var(--muted); font-style: italic; margin-left: 0;
}
"""
css += "\n" + md_css

with open('app/globals.css', 'w') as f:
    f.write(css)
