/**
 * @fileoverview Rich text editor component using Tiptap.
 *
 * A WYSIWYG rich text editor with formatting toolbar for lesson notes,
 * homework assignments, and other text content. Built with Tiptap and
 * integrated with the application's design system.
 *
 * Features:
 * - Bold, italic text formatting
 * - Bullet and numbered lists
 * - Blockquotes
 * - Undo/redo functionality
 * - Placeholder text support
 * - Responsive design
 * - Accessibility support
 */

"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Type,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

/**
 * Props for the RichTextEditor component.
 */
interface RichTextEditorProps {
  /** Initial HTML content for the editor */
  content: string;
  /** Callback fired when content changes, receives HTML string */
  onChange: (content: string) => void;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /** Additional CSS classes for the editor */
  className?: string;
}

/**
 * Rich text editor component with formatting toolbar.
 *
 * Provides a complete WYSIWYG editing experience with:
 * - Formatting options (bold, italic, lists, quotes)
 * - Undo/redo functionality
 * - Live content updates
 * - Consistent styling with design system
 * - Focus management and accessibility
 *
 * @example
 * ```tsx
 * const [content, setContent] = useState('<p>Initial content</p>');
 *
 * <RichTextEditor
 *   content={content}
 *   onChange={setContent}
 *   placeholder="Write your lesson notes..."
 * />
 * ```
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder,
      }),
    ],
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[120px] px-3 py-2",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-em:text-muted-foreground",
          "prose-blockquote:text-muted-foreground prose-blockquote:border-l-border",
          "prose-ul:text-foreground prose-ol:text-foreground",
          "prose-li:text-foreground",
          className
        ),
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:border-ring">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 data-[active=true]:bg-neutral-100"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive("bold")}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 data-[active=true]:bg-neutral-100"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive("italic")}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>

        {/* Separator */}
        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 data-[active=true]:bg-neutral-100"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive("bulletList")}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 data-[active=true]:bg-neutral-100"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive("orderedList")}
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 data-[active=true]:bg-neutral-100"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive("blockquote")}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        {/* Separator */}
        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 disabled:opacity-50"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 disabled:opacity-50"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="min-h-[120px] max-w-none" />
    </div>
  );
}
