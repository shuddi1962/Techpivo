"use client"

import { useCallback, useState, useRef, useEffect } from "react"
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
import { createClient } from "@/lib/supabase/client"
import { Search, Loader2, X } from "lucide-react"

const lowlight = createLowlight(common)

export function RichTextEditor() {
  const { post, updatePost } = usePostEditor()
  const initialText = post.content.replace(/<[^>]*>/g, "")
  const [wordCount, setWordCount] = useState(initialText.split(/\s+/).filter(Boolean).length)
  const [charCount, setCharCount] = useState(initialText.length)
  const [showWebImage, setShowWebImage] = useState(false)
  const [webQuery, setWebQuery] = useState("")
  const [webResults, setWebResults] = useState<{ src: string; alt: string }[]>([])
  const [webSearching, setWebSearching] = useState(false)
  const [webSource, setWebSource] = useState<"pexels" | "google">("pexels")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageWidth, setImageWidth] = useState("100%")
  const [imageLink, setImageLink] = useState("")

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return
    const supabase = createClient()
    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const blobUrl = URL.createObjectURL(file)
    editor.chain().focus().setImage({ src: blobUrl }).run()
    const { error } = await supabase.storage.from("post-images").upload(fileName, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(fileName)
      editor.commands.updateAttributes("image", { src: publicUrl })
      URL.revokeObjectURL(blobUrl)
    }
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#6366F1] underline underline-offset-2 hover:text-[#818CF8] font-medium" },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: "max-w-full h-auto rounded-lg cursor-pointer" },
      }),
      PlaceholderExtension.configure({
        placeholder: "Start writing your post...",
      }),
      CharacterCountExtension.configure({
        limit: 100000,
      }),
      Table.configure({
        HTMLAttributes: { class: "min-w-full border-collapse border-2 border-gray-300 dark:border-[#374151]" },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: { class: "border-2 border-gray-300 dark:border-[#374151] px-3 py-2 text-sm" },
      }),
      TableHeader.configure({
        HTMLAttributes: { class: "border-2 border-gray-300 dark:border-[#374151] px-3 py-2 text-sm font-semibold bg-gray-100 dark:bg-[#1a2235]" },
      }),
      HighlightExtension.configure({
        multicolor: true,
      }),
      TextAlignExtension.configure({
        types: ["heading", "paragraph"],
      }),
      CodeBlockLowlightExtension.configure({
        lowlight,
        HTMLAttributes: { class: "bg-gray-100 dark:bg-[#0A0F1E] rounded-lg p-4 text-sm font-mono overflow-x-auto border-2 border-gray-300 dark:border-[#374151]" },
      }),
    ],
    content: post.content,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-6 py-4 text-gray-900 dark:text-[#D1D5DB]",
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
      handleClickOn: (view, pos, node) => {
        if (node.type.name === "image") {
          setSelectedImage(node.attrs.src)
          setImageWidth(node.attrs.width || "100%")
          return true
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

  const searchWebImages = async () => {
    if (!webQuery) return
    setWebSearching(true)
    if (webSource === "pexels") {
      try {
        const res = await fetch(`/api/pexels?query=${encodeURIComponent(webQuery)}`)
        const data = await res.json()
        if (data.photos) {
          setWebResults(data.photos.map((p: any) => ({ src: p.src.large2x || p.src.large, alt: p.alt })))
        }
      } catch {}
    } else {
      try {
        const res = await fetch(`/api/google-images?query=${encodeURIComponent(webQuery)}`)
        const data = await res.json()
        if (data.items) {
          setWebResults(data.items.map((p: any) => ({ src: p.link, alt: p.title })))
        }
      } catch {}
    }
    setWebSearching(false)
  }

  const insertWebImage = (src: string) => {
    if (!editor) return
    editor.chain().focus().setImage({ src }).run()
    setShowWebImage(false)
    setWebResults([])
    setWebQuery("")
  }

  useEffect(() => {
    if (!editor) return
    const handler = (e: CustomEvent) => {
      editor.chain().focus().insertContent(e.detail.html).run()
    }
    document.addEventListener("insert-internal-link", handler as EventListener)
    return () => document.removeEventListener("insert-internal-link", handler as EventListener)
  }, [editor])

  const applyImageTransform = () => {
    if (!editor || !selectedImage) return
    editor.chain().focus().updateAttributes("image", { width: imageWidth }).run()
    setSelectedImage(null)
  }

  const insertLinkedImage = () => {
    if (!editor || !selectedImage) return
    const imgHtml = `<a href="${imageLink || selectedImage}" target="_blank" rel="noopener noreferrer"><img src="${selectedImage}" width="${imageWidth}" class="max-w-full h-auto rounded-lg" /></a>`
    editor.chain().focus().insertContent(imgHtml).run()
    setSelectedImage(null)
    setImageLink("")
  }

  if (!editor) return null

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-300 dark:border-[#374151] rounded-xl shadow-sm overflow-hidden">
      <EditorToolbar
        editor={editor}
        onImageUpload={handleImageUpload}
        onWebImageSearch={() => setShowWebImage(true)}
      />

      <EditorContent editor={editor} />

      {selectedImage && (
        <div className="px-6 py-3 border-t-2 border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#0A0F1E]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Width:</label>
              <select value={imageWidth} onChange={(e) => setImageWidth(e.target.value)} className="text-xs border-2 border-gray-300 dark:border-[#374151] rounded-md px-2 py-1 bg-white dark:bg-[#0A0F1E] text-gray-900 dark:text-white">
                <option value="100%">Full</option>
                <option value="75%">75%</option>
                <option value="50%">Half</option>
                <option value="25%">Quarter</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 shrink-0">Link:</label>
              <input value={imageLink} onChange={(e) => setImageLink(e.target.value)} placeholder="https://..." className="flex-1 text-xs border-2 border-gray-300 dark:border-[#374151] rounded-md px-2 py-1 bg-white dark:bg-[#0A0F1E] text-gray-900 dark:text-white" />
            </div>
            <button onClick={applyImageTransform} className="text-xs font-semibold text-white bg-[#6366F1] hover:bg-[#4F46E5] px-3 py-1.5 rounded-md">Resize</button>
            <button onClick={insertLinkedImage} disabled={!imageLink} className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 rounded-md">Add Link</button>
            <button onClick={() => { editor.chain().focus().deleteSelection().run(); setSelectedImage(null) }} className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1">Remove</button>
            <button onClick={() => setSelectedImage(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Done</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-2.5 border-t-2 border-gray-200 dark:border-[#1F2937] text-xs font-semibold text-gray-500 dark:text-[#9CA3AF]">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>

      {showWebImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-[#374151] w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 dark:border-[#1F2937]">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Insert Image from Web</h3>
              <button onClick={() => { setShowWebImage(false); setWebResults([]) }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setWebSource("pexels")} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${webSource === "pexels" ? "bg-[#6366F1] text-white border-[#6366F1]" : "bg-white dark:bg-[#0A0F1E] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-[#6366F1]"}`}>Pexels</button>
                <button onClick={() => setWebSource("google")} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${webSource === "google" ? "bg-[#6366F1] text-white border-[#6366F1]" : "bg-white dark:bg-[#0A0F1E] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-[#6366F1]"}`}>Google</button>
              </div>
              <div className="flex gap-2">
                <input value={webQuery} onChange={(e) => setWebQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchWebImages()} placeholder={`Search ${webSource === "pexels" ? "free stock photos" : "the web"}...`} className="flex-1 bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
                <button onClick={searchWebImages} disabled={webSearching} className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
                  {webSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </button>
              </div>
              {webResults.length > 0 && (
                <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                  {webResults.map((img, i) => (
                    <button key={i} onClick={() => insertWebImage(img.src)}
                      className="relative group rounded-xl overflow-hidden border-2 border-gray-200 dark:border-[#374151] hover:border-[#6366F1] transition-all">
                      <img src={img.src} alt={img.alt} className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
