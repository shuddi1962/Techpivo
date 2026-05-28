"use client"

import type { Editor } from "@tiptap/react"
import { useCallback, useRef } from "react"
import {
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Table2, Link, Image, ImagePlus,
  Highlighter, AlignLeft, AlignCenter, AlignRight, Undo, Redo,
} from "lucide-react"

interface EditorToolbarProps {
  editor: Editor
  onImageUpload: (file: File) => void
  onWebImageSearch: () => void
}

const btn = "p-2 rounded-lg border-2 border-gray-200 dark:border-[#374151] hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-40 data-[active=true]:bg-[#F59E0B] data-[active=true]:text-white data-[active=true]:border-[#F59E0B]"

export function EditorToolbar({ editor, onImageUpload, onWebImageSearch }: EditorToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { onImageUpload(file); e.target.value = "" }
  }, [onImageUpload])

  const addTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2.5 border-b-2 border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#0A0F1E]">
      <input type="file" ref={fileRef} onChange={handleFile} accept="image/*" className="hidden" />

      <ToolbarGroup>
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="h-4 w-4" /></ToolbarBtn>
      </ToolbarGroup>

      <Separator />

      <ToolbarGroup>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><Bold className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><Italic className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}><Underline className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}><Strikethrough className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")}><Highlighter className="h-4 w-4" /></ToolbarBtn>
      </ToolbarGroup>

      <Separator />

      <ToolbarGroup>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}><Heading1 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}><Heading3 className="h-4 w-4" /></ToolbarBtn>
      </ToolbarGroup>

      <Separator />

      <ToolbarGroup>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}><Quote className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}><Code className="h-4 w-4" /></ToolbarBtn>
      </ToolbarGroup>

      <Separator />

      <ToolbarGroup>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}><AlignLeft className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}><AlignCenter className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}><AlignRight className="h-4 w-4" /></ToolbarBtn>
      </ToolbarGroup>

      <Separator />

      <ToolbarGroup>
        <ToolbarBtn onClick={addTable}><Table2 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => {
          const url = window.prompt("Link URL:")
          if (url) {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
          }
        }} active={editor.isActive("link")}><Link className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => fileRef.current?.click()}><Image className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={onWebImageSearch}><ImagePlus className="h-4 w-4" /></ToolbarBtn>
      </ToolbarGroup>
    </div>
  )
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function ToolbarBtn({ onClick, active, disabled, children }: { onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} data-active={active} className={btn}>
      {children}
    </button>
  )
}

function Separator() {
  return <div className="w-px h-6 bg-gray-200 dark:bg-[#374151] mx-1" />
}
