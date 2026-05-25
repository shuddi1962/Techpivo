"use client"

import { useRef, useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Image, Upload, X, Search } from "lucide-react"

export function FeaturedImagePanel() {
  const { post, setField, uploadImage } = usePostEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pexelsQuery, setPexelsQuery] = useState("")
  const [pexelsResults, setPexelsResults] = useState<{ src: string; alt: string }[]>([])
  const [searching, setSearching] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = await uploadImage(file)
      if (url) setField("featured_image", url)
    }
    e.target.value = ""
  }

  const searchPexels = async () => {
    if (!pexelsQuery) return
    setSearching(true)
    try {
      const res = await fetch(`/api/pexels?query=${encodeURIComponent(pexelsQuery)}`)
      const data = await res.json()
      if (data.photos) {
        setPexelsResults(data.photos.map((p: any) => ({ src: p.src.large2x || p.src.large, alt: p.alt })))
      }
    } catch {
      // fallback to placeholder
    }
    setSearching(false)
  }

  return (
    <CollapsibleSection title="Featured Image" icon={<Image className="h-4 w-4" />}>
      <div className="space-y-3">
        {post.featured_image ? (
          <div className="relative group">
            <img
              src={post.featured_image}
              alt="Featured"
              className="w-full h-36 object-cover rounded-lg"
            />
            <button
              onClick={() => setField("featured_image", "")}
              className="absolute top-2 right-2 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-[#1F2937] rounded-lg flex flex-col items-center justify-center gap-2 text-[#6B7280] hover:border-[#6366F1] hover:text-[#6366F1] transition-colors"
          >
            <Upload className="h-6 w-6" />
            <span className="text-sm">Upload Image</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

        <div className="border-t border-[#1F2937] pt-3">
          <label className="block text-xs text-[#9CA3AF] mb-2">Search Pexels</label>
          <div className="flex gap-2">
            <input
              value={pexelsQuery}
              onChange={(e) => setPexelsQuery(e.target.value)}
              placeholder="Search..."
              onKeyDown={(e) => e.key === "Enter" && searchPexels()}
              className="flex-1 bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1]"
            />
            <button
              onClick={searchPexels}
              disabled={searching}
              className="bg-[#1F2937] hover:bg-[#374151] text-[#F9FAFB] px-2 py-1 rounded text-xs"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          {pexelsResults.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {pexelsResults.slice(0, 6).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setField("featured_image", img.src)}
                  className="relative group rounded-lg overflow-hidden"
                >
                  <img src={img.src} alt={img.alt} className="w-full h-16 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  )
}
