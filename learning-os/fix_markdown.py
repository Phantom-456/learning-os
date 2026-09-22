import re

with open('components/ConceptDetail.tsx', 'r') as f:
    content = f.read()

# Add import
content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport ReactMarkdown from 'react-markdown';\nimport remarkGfm from 'remark-gfm';")

# Replace <div className="desc" style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
content = content.replace(
    """<div className="desc" style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>""",
    """<div className="desc markdown-body" style={{ whiteSpace: 'normal', lineHeight: '1.6' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.text || ''}</ReactMarkdown>
                  </div>"""
)

with open('components/ConceptDetail.tsx', 'w') as f:
    f.write(content)
