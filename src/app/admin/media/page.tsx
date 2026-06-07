"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Trash2, FileText, Download, Copy, Check, Search, Image, File, FileArchive, X, Loader2 } from "lucide-react"

type MediaFile = {
  name: string
  id: string
  created_at: string
  updated_at: string
  metadata: {
    mimetype: string
    size: number
    cacheControl: string
  } | null
  uploadProgress?: number
}

type FileType = "all" | "images" | "documents" | "other"

const FILE_TYPE_LABELS: Record<FileType, string> = {
  all: "All",
  images: "Images",
  documents: "Documents",
  other: "Other",
}

function getFileType(file: MediaFile): FileType {
  const mime = file.metadata?.mimetype || ""
  if (mime.startsWith("image/")) return "images"
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text") || mime.includes("sheet") || mime.includes("presentation")) return "documents"
  return "other"
}

function getFileIcon(file: MediaFile) {
  const type = getFileType(file)
  if (type === "images") return Image
  if (type === "documents") return File
  return FileArchive
}

export default function AdminMediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch] = useState("")
  const [fileTypeFilter, setFileTypeFilter] = useState<FileType>("all")
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const loadFiles = useCallback(async () => {
    const allFiles: MediaFile[] = []
    let offset = 0
    const limit = 100
    while (true) {
      const { data, error } = await supabase.storage.from("media").list("", { limit, offset })
      if (error) break
      if (!data || data.length === 0) break
      allFiles.push(...data as MediaFile[])
      if (data.length < limit) break
      offset += limit
    }
    setFiles(allFiles)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const uploadFiles = async (fileList: FileList) => {
    setUploading(true)
    setUploadError(null)
    const uploads: { name: string; path: string }[] = []

    for (const file of Array.from(fileList)) {
      const path = `${Date.now()}-${file.name}`
      uploads.push({ name: file.name, path })

      const optimistic: MediaFile = {
        name: path,
        id: path,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          mimetype: file.type,
          size: file.size,
          cacheControl: "",
        },
        uploadProgress: 0,
      }
      setFiles((prev) => [optimistic, ...prev])

      const { error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      })

      setFiles((prev) =>
        prev.map((f) =>
          f.name === path ? { ...f, uploadProgress: error ? undefined : 100 } : f
        )
      )

      if (error) {
        setUploadError(`${file.name}: ${error.message}`)
        setFiles((prev) => prev.filter((f) => f.name !== path))
      }
    }

    await loadFiles()
    setUploading(false)
  }

  const deleteFile = async (name: string) => {
    if (!confirm("Delete this file?")) return
    setFiles((prev) => prev.filter((f) => f.name !== name))
    const { error } = await supabase.storage.from("media").remove([name])
    if (error) {
      console.error("Delete error:", error)
      await loadFiles()
    }
  }

  const getUrl = (path: string) => {
    const { data } = supabase.storage.from("media").getPublicUrl(path)
    return data.publicUrl
  }

  const copyUrl = async (name: string) => {
    const url = getUrl(name)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedIndex(name)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      const el = document.createElement("textarea")
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopiedIndex(name)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  const formatSize = (bytes: number | undefined) => {
    if (!bytes) return "?"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isImage = (f: MediaFile) => f.metadata?.mimetype?.startsWith("image/")

  const filteredFiles = files.filter((file) => {
    if (search && !file.name.toLowerCase().includes(search.toLowerCase())) return false
    if (fileTypeFilter !== "all" && getFileType(file) !== fileTypeFilter) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Media Library</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""}</span>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt,.svg"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(Object.entries(FILE_TYPE_LABELS) as [FileType, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFileTypeFilter(key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                fileTypeFilter === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={dropInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt,.svg"
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      <Card
        className={`mb-6 border-dashed transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"}`}
        onClick={() => dropInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
        }}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : "Drop files here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground/60">Images, videos, PDF, DOC, ZIP, SVG (max 10 MB)</p>
          </div>
        </CardContent>
      </Card>

      {uploadError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <div className="aspect-video bg-muted animate-pulse" />
              <CardContent className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            {search || fileTypeFilter !== "all" ? (
              <>
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-lg font-medium">No files match your search</p>
                <p className="text-sm text-muted-foreground">Try a different filter or search term</p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-lg font-medium">No files yet</p>
                <p className="text-sm text-muted-foreground">Upload your first file</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file)
            const isUploading = file.uploadProgress !== undefined && file.uploadProgress < 100
            return (
              <Card key={file.name} className={`overflow-hidden group ${isUploading ? "opacity-60" : ""}`}>
                <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden">
                  {isImage(file) && !isUploading ? (
                    <img
                      src={getUrl(file.name)}
                      alt={file.name}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="h-10 w-10 text-muted-foreground/50" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {!isUploading && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-white hover:bg-white/20"
                        onClick={() => window.open(getUrl(file.name), "_blank")}
                        title="Open"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-white hover:bg-white/20"
                        onClick={() => copyUrl(file.name)}
                        title="Copy URL"
                      >
                        {copiedIndex === file.name ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-white hover:bg-white/20"
                        onClick={() => deleteFile(file.name)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatSize(file.metadata?.size)}
                    </span>
                    {file.metadata?.mimetype && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {file.metadata.mimetype.split("/").pop()}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                    {copiedIndex === file.name && (
                      <span className="text-xs text-green-500">Copied!</span>
                    )}
                    {isUploading && (
                      <span className="text-xs text-primary">Uploading...</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
