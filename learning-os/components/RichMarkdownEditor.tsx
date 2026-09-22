'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Markdown, type MarkdownStorage } from 'tiptap-markdown';
import { useEffect } from 'react';

// tiptap-markdown@0.9.0 (the version actually installed, for Tiptap v3) ships
// a `MarkdownStorage` type (index.d.ts) describing the `getMarkdown()` API it
// adds to `editor.storage.markdown` at runtime, but it does NOT itself merge
// that into `@tiptap/core`'s `Storage` interface — so without this
// augmentation, `editor.storage.markdown` is a real, working runtime value
// that TypeScript doesn't know about. This declares it properly instead of
// silencing the checker with @ts-expect-error on every access.
declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

export default function RichMarkdownEditor({ value, onChange, editable }: { value: string; onChange: (markdown: string) => void; editable: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Highlight, TextStyle, Color, Markdown.configure({ html: false })],
    content: value,
    editable,
    onUpdate: ({ editor: e }) => {
      onChange(e.storage.markdown.getMarkdown());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (current !== value) editor.commands.setContent(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div className="rich-editor">
      {editable && (
        <div className="rich-editor-toolbar">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}>B</button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}><i>I</i></button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''}><u>U</u></button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''}><s>S</s></button>
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'active' : ''}>Highlight</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}>H1</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}>H2</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}>H3</button>
          <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} title="Text color" />
        </div>
      )}
      <EditorContent editor={editor} className="rich-editor-content" />
    </div>
  );
}
