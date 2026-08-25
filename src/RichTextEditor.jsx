import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Heading1,
  Heading2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Minus,
} from "lucide-react";

const ToolbarBtn = ({ icon: Icon, onClick, isActive, disabled, title }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${isActive
      ? "bg-white/20 text-white"
      : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
  >
    <Icon size={15} />
  </button>
);

const Divider = () => <div className="w-px h-4 bg-slate-700 mx-1.5 opacity-50" />;

export default function RichTextEditor({ value, onChange, placeholder, label }) {
  const emitQueue = React.useRef([]);
  const onChangeRef = React.useRef(onChange);

  // Always keep a reference to the latest onChange from props

  // so Tiptap's useEditor hook (which only initializes once) never invokes a stale closure natively.
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || "Start typing..." }),
    ],
    editorProps: {
      transformPastedHTML(html) {
        // PDF viewers and generic HTML copy operations often include literal \n characters to visually format the output.
        // Chrome's DOMParser natively collapses all \n into empty spaces, aggressively deleting multiline splits.
        // By forcefully translating them to <br/> BEFORE parsing, Prosemirror preserves them natively as HardBreak nodes.
        // Prosemirror's strict schema automatically discards any invalid <br/> tags added outside valid block containers!
        return html.replace(/\r?\n/g, '<br/>');
      }
    },
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Track our own emitted updates to avoid getting fooled by React's async reconciliation later
      emitQueue.current.push(html);
      if (emitQueue.current.length > 50) emitQueue.current.shift();
      onChangeRef.current(html);
    },
  });

  useEffect(() => {
    if (!editor || value === undefined) return;

    // Have we recently emitted this exact value ourselves? Then ignore this state prop.
    if (emitQueue.current.includes(value)) return;

    // Did the parent intentionally pass exactly what we already hold? Ignore.
    if (editor.getHTML() === value) return;

    // This must be an external load (e.g. from local storage) making a legitimate overwrite.
    editor.commands.setContent(value, false, { preserveWhitespace: "full" });
    emitQueue.current = []; // Reset queue for safety
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    let finalUrl = url.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('mailto:') && !finalUrl.startsWith('tel:')) {
      finalUrl = `https://${finalUrl}`;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run();
  };

  return (
    <div className="block mb-3">
      {label && <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>}
      <div className="border border-slate-200 rounded-md overflow-hidden bg-white flex flex-col focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 shadow-sm">
        <div className="flex items-center flex-wrap gap-0.5 p-1.5 bg-[#1e2330] rounded-t-[5px]">
          <ToolbarBtn icon={Heading1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="H1" />
          <ToolbarBtn icon={Heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="H2" />

          <Divider />

          <ToolbarBtn icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold" />
          <ToolbarBtn icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic" />
          <ToolbarBtn icon={UnderlineIcon} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Underline" />
          <ToolbarBtn icon={Strikethrough} onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strikethrough" />

          <Divider />

          <ToolbarBtn icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet List" />
          <ToolbarBtn icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Numbered List" />
          <ToolbarBtn icon={Quote} onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Blockquote" />

          <Divider />

          <ToolbarBtn icon={AlignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })} title="Align Left" />
          <ToolbarBtn icon={AlignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })} title="Align Center" />
          <ToolbarBtn icon={AlignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })} title="Align Right" />

          <Divider />

          <ToolbarBtn icon={LinkIcon} onClick={setLink} isActive={editor.isActive("link")} title="Link" />
          <ToolbarBtn icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider" />
        </div>

        <div className="p-3 text-sm text-slate-800 editor-content-wrapper min-h-[120px] max-h-[400px] overflow-y-auto w-full break-normal">
          <EditorContent editor={editor} />
        </div>

        <style>{`
          .editor-content-wrapper .ProseMirror {
            outline: none;
            min-height: 90px;
          }
          .editor-content-wrapper .ProseMirror > *:first-child {
            margin-top: 0;
          }
          .editor-content-wrapper .ProseMirror > *:last-child {
            margin-bottom: 0;
          }
          .editor-content-wrapper .ProseMirror p {
            margin-top: 0.5em;
            margin-bottom: 0.5em;
            white-space: pre-wrap;
          }
          .editor-content-wrapper .ProseMirror h1 {
            font-size: 1.3em;
            font-weight: 700;
            margin-top: 0.8em;
            margin-bottom: 0.4em;
          }
          .editor-content-wrapper .ProseMirror h2 {
            font-size: 1.15em;
            font-weight: 600;
            margin-top: 0.8em;
            margin-bottom: 0.4em;
          }
          .editor-content-wrapper .ProseMirror ul {
            list-style-type: disc;
            padding-left: 1.5em;
            margin-top: 0.5em;
            margin-bottom: 0.5em;
          }
          .editor-content-wrapper .ProseMirror ol {
            list-style-type: decimal;
            padding-left: 1.5em;
            margin-top: 0.5em;
            margin-bottom: 0.5em;
          }
          .editor-content-wrapper .ProseMirror li > p {
            margin: 0;
            display: inline;
          }
          .editor-content-wrapper .ProseMirror a {
            color: #0d9488;
            text-decoration: underline;
            cursor: pointer;
          }
          .editor-content-wrapper .ProseMirror blockquote {
            border-left: 3px solid #cbd5e1;
            padding-left: 1em;
            color: #64748b;
            font-style: italic;
            margin-top: 0.5em;
            margin-bottom: 0.5em;
          }
          .editor-content-wrapper .ProseMirror hr {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 1em 0;
          }
          .editor-content-wrapper .ProseMirror p.is-editor-empty:first-child::before {
            color: #94a3b8;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
        `}</style>
      </div>
    </div>
  );
}
