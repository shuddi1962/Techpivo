"use client"

import { useRef, useState, useCallback } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import NextImage from "next/image"
import { Image, Upload, X, Search, Loader2, Trash2, Library } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMediaLibrary } from "@/lib/use-media-library"

export function FeaturedImagePanel() {
  const { post, setField, uploadImage } = usePostEditor()
  const { items: libraryItems, loading: libraryLoading, uploadFiles, deleteItem } = useMediaLibrary()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ src: string; alt: string; link?: string; license?: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [activeSource, setActiveSource] = useState<"pexels" | "google" | "wikimedia" | null>(null)
  const [source, setSource] = useState<"pexels" | "google" | "library">("pexels")

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    setField("featured_image", blobUrl)
    const url = await uploadImage(file)
    if (url) setField("featured_image", url)
    URL.revokeObjectURL(blobUrl)
    e.target.value = ""
  }, [setField, uploadImage])

  const handleLibraryUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    setField("featured_image", blobUrl)
    const [row] = await uploadFiles([file])
    if (row) setField("featured_image", row.url)
    URL.revokeObjectURL(blobUrl)
    e.target.value = ""
  }, [setField, uploadFiles])

  const searchImages = async () => {
    if (!query) return
    setSearching(true)
    setSearchError("")
    setActiveSource(null)
    try {
      if (source === "pexels") {
        const res = await fetch(`/api/pexels?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.photos) {
          setResults(data.photos.map((p: any) => ({ src: p.src.large2x || p.src.large, alt: p.alt, link: p.url, license: "Free (Pexels)" })))
          setActiveSource("pexels")
        } else {
          setResults([])
          setSearchError("No Pexels results. Try different keywords.")
        }
      } else {
        const res = await fetch(`/api/google-images?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.items?.length) {
          setResults(data.items.map((p: any) => ({ src: p.src, alt: p.alt, link: p.link, license: p.license })))
          setActiveSource(data.source === "google" ? "google" : "wikimedia")
        } else {
          setResults([])
          setSearchError("No image results. Try different keywords.")
        }
      }
    } catch {
      setResults([])
      setSearchError("Search failed. Please try again.")
    }
    setSearching(false)
  }

  return (
    <CollapsibleSection title="Featured Image" icon={<Image className="h-4 w-4" />}>
      <div className="space-y-3">
        {post.featured_image ? (
          <div className="relative group rounded-xl overflow-hidden border-2 border-gray-200 dark:border-[#1F2937]">
            <NextImage
              src={post.featured_image}
              alt="Featured"
              width={800}
              height={450}
              className="w-full h-40 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/api/placeholder/400/225" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              onClick={() => setField("featured_image", "")}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-36 border-2 border-dashed border-gray-300 dark:border-[#374151] rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-[#6B7280] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all bg-gray-50 dark:bg-[#0A0F1E] group"
          >
            <Upload className="h-7 w-7 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Click to upload image</span>
            <span className="text-xs text-gray-400">PNG, JPG, GIF, WebP up to 10MB</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

        <div className="border-t-2 border-gray-100 dark:border-[#1F2937] pt-3">
          <div className="flex gap-2 mb-2">
            <button onClick={() => { setSource("pexels"); setResults([]) }} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-colors ${source === "pexels" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white dark:bg-[#0A0F1E] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-[#F59E0B]"}`}>Pexels</button>
            <button onClick={() => { setSource("google"); setResults([]) }} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-colors ${source === "google" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white dark:bg-[#0A0F1E] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-[#F59E0B]"}`}>Google</button>
            <button onClick={() => { setSource("library"); setResults([]) }} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-colors ${source === "library" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white dark:bg-[#0A0F1E] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-[#F59E0B]"}`}><Library className="h-3 w-3" /> Library</button>
          </div>
          {source === "library" ? (
            <div className="space-y-3">
              <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 dark:border-[#374151] rounded-lg py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors">
                <Upload className="h-4 w-4" /> Upload to Media Library
                <input type="file" accept="image/*" className="hidden" onChange={handleLibraryUpload} />
              </label>
              {libraryLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : libraryItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No media yet. Upload an image or generate posts to fill the library.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {libraryItems.filter(i => i.mimetype?.startsWith("image/")).map((item) => (
                    <div key={item.id} className="relative group rounded-lg overflow-hidden border-2 border-gray-200 dark:border-[#1F2937]">
                      <button
                        onClick={() => setField("featured_image", item.url)}
                        title={item.name}
                        className="w-full block"
                      >
                        <NextImage src={item.url} alt={item.name} width={120} height={80} className="w-full h-16 object-cover" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${item.name}" from the media library?`)) deleteItem(item) }}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete from library"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (<>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${source === "pexels" ? "free stock photos" : "licensed web photos"}...`}
              onKeyDown={(e) => e.key === "Enter" && searchImages()}
              className="flex-1 bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
            />
            <button
              onClick={searchImages}
              disabled={searching}
              className="bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-300 dark:disabled:bg-[#374151] text-white px-3 py-2 rounded-lg transition-colors shadow-sm"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          {activeSource && results.length > 0 && (
            <p className="text-[10px] text-gray-400 dark:text-[#6B7280] mt-2">
              Photos from{" "}
              <span className="font-semibold text-gray-500 dark:text-gray-400">
                {activeSource === "google" ? "Google Custom Search" : activeSource === "wikimedia" ? "Wikimedia Commons (free license)" : "Pexels"}
              </span>
              {activeSource === "wikimedia" && " — hover a photo for its license"}
            </p>
          )}

          {searchError && !searching && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-2">{searchError}</p>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {results.slice(0, 6).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setField("featured_image", img.src)}
                  title={`${img.alt || ""}${img.license ? ` — ${img.license}` : ""}${img.link ? ` (${img.link})` : ""}`}
                  className="relative group rounded-lg overflow-hidden border-2 border-gray-200 dark:border-[#1F2937]"
                >
                  <NextImage src={img.src} alt={img.alt} width={120} height={80} className="w-full h-16 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  {img.license && (
                    <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/60 px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.license}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          </>)}
        </div>
      </div>
    </CollapsibleSection>
  )
}
