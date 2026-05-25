"use client"

import { useCallback, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import ImageExtension from "@tiptap/extension-image"
import LinkExtension from "@tiptap/extension-link"
import UnderlineExtension from "@tiptap/extension-underline"
import PlaceholderExtension from "@tiptap/extension-placeholder"
import CharacterCountExtension from "@tiptap/extension-character-count"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import HighlightExtension from "@tiptap/extension-highlight"
import TextAlignExtension from "@tiptap/extension-text-align"
import CodeBlockLowlightExtension from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { usePostEditor } from "./post-editor-provider"
import { EditorToolbar } from "./editor-toolbar"

const lowlight = createLowlight(common)

export function RichTextEditor() {
  const { post, updatePost } = usePostEditor()
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#6366F1] underline underline-offset-2 hover:text-[#818CF8]" },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: "max-w-full h-auto rounded-lg" },
      }),
      PlaceholderExtension.configure({
        placeholder: "Start writing your post...",
      }),
      CharacterCountExtension.configure({
        limit: 100000,
      }),
      Table.configure({
        HTMLAttributes: { class: "min-w-full border-collapse border border-[#1F2937]" },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: { class: "border border-[#1F2937] px-3 py-2 text-sm" },
      }),
      TableHeader.configure({
        HTMLAttributes: { class: "border border-[#1F2937] px-3 py-2 text-sm font-semibold bg-[#1a2235]" },
      }),
      HighlightExtension.configure({
        multicolor: true,
      }),
      TextAlignExtension.configure({
        types: ["heading", "paragraph"],
      }),
      CodeBlockLowlightExtension.configure({
        lowlight,
        HTMLAttributes: { class: "bg-[#0A0F1E] rounded-lg p-4 text-sm font-mono overflow-x-auto" },
      }),
    ],
    content: post.content,
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[500px] px-6 py-4",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith("image/")) {
            handleImageUpload(file)
            return true
          }
        }
        return false
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile()
              if (file) handleImageUpload(file)
              return true
            }
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      updatePost({ content: html })
      const text = editor.getText()
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      setCharCount(text.length)
    },
  })

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run()
      }
    } catch {
      const url = URL.createObjectURL(file)
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="border border-[#1F2937] rounded-lg overflow-hidden bg-[#111827]">
      <EditorToolbar editor={editor} onImageUpload={handleImageUpload} />
      <EditorContent editor={editor} />
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#1F2937] text-xs text-[#6B7280]">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  )
}
