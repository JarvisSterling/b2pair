"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface InlineTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  alignment?: "left" | "center" | "right";
  className?: string;
}

export function InlineTextEditor({
  content,
  onChange,
  placeholder = "Click to start writing...",
  alignment = "left",
  className,
}: InlineTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: alignment,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[var(--page-accent)] underline",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || "<p></p>",
    editorProps: {
      attributes: {
        class: `prose max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-p:my-4 [&_p:empty]:min-h-[1em] [&_p:has(br:only-child)]:min-h-[1em] focus:outline-none min-h-[4rem] ${className || ""}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync alignment changes
  useEffect(() => {
    if (editor && alignment) {
      editor.chain().selectAll().setTextAlign(alignment).run();
    }
  }, [alignment, editor]);

  if (!editor) return null;

  return (
    <div
      className="relative group/editor cursor-text"
      onClick={() => { if (!editor.isFocused) editor.chain().focus().run(); }}
    >
      {/* Floating toolbar on focus */}
      {editor.isFocused && (
        <div className="absolute -top-10 left-0 z-20 flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-md px-1 py-0.5 animate-scale-in">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="B"
            className="font-bold"
          />
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="I"
            className="italic"
          />
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            label="H2"
          />
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            label="H3"
          />
          <div className="w-px h-4 bg-border mx-0.5" />
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="•"
          />
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="1."
          />
          <div className="w-px h-4 bg-border mx-0.5" />
          <ToolbarButton
            active={editor.isActive("link")}
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                const url = prompt("Enter URL:");
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }
            }}
            label="🔗"
          />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`px-1.5 py-0.5 rounded text-xs transition-colors ${className} ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {label}
    </button>
  );
}
