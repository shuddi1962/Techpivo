"use client"

import type { Editor } from "@tiptap/react"
import { useRef, useState } from "react"
import {
  Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Image, Link, Table2, AlignLeft, AlignCenter,
  AlignRight, Highlighter, Undo, Redo, Minus,
} from "lucide-react"

interface EditorToolbarProps {
  editor: Editor
  onImageUpload: (file: File) => void
}

export function EditorToolbar({ editor, onImageUpload }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [addingLink, setAddingLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")

  const ToolButton = ({ onClick, active, children, title }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? "bg-[#6366F1] text-white" : "text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937]"
      }`}
    >
      {children}
    </button>
  )

  const handleImageClick = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageUpload(file)
      e.target.value = ""
    }
  }

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl("")
      setAddingLink(false)
    }
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[#1F2937] bg-[#0A0F1E]">
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
        <Underline className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
        <Code className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-5 bg-[#1F2937] mx-1" />

      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
        <Heading1 className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-5 bg-[#1F2937] mx-1" />

      <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
        <Code2 className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-5 bg-[#1F2937] mx-1" />

      <ToolButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
        <AlignLeft className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
        <AlignCenter className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
        <AlignRight className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-5 bg-[#1F2937] mx-1" />

      <ToolButton onClick={handleImageClick} title="Insert Image">
        <Image className="h-4 w-4" />
      </ToolButton>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <ToolButton onClick={() => setAddingLink(!addingLink)} active={editor.isActive("link")} title="Insert Link">
        <Link className="h-4 w-4" />
      </ToolButton>

      <ToolButton onClick={addTable} title="Insert Table">
        <Table2 className="h-4 w-4" />
      </ToolButton>

      <ToolButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
        <Highlighter className="h-4 w-4" />
      </ToolButton>

      <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-5 bg-[#1F2937] mx-1" />

      <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
        <Undo className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Shift+Z)">
        <Redo className="h-4 w-4" />
      </ToolButton>

      {addingLink && (
        <div className="flex items-center gap-1 ml-2">
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="bg-[#111827] border border-[#1F2937] rounded px-2 py-1 text-xs text-[#F9FAFB] w-48 focus:outline-none focus:border-[#6366F1]"
            onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
            autoFocus
          />
          <button onClick={handleLinkSubmit} className="text-xs text-[#6366F1] hover:text-[#818CF8] px-1">Add</button>
        </div>
      )}
    </div>
  )
}
