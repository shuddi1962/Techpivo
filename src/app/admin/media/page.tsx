"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Upload, Trash2, FileText, Download, Copy, Check, Search, Image as ImageIcon, File, FileArchive, X, Loader2 } from "lucide-react"
import { useMediaLibrary, type LibraryFile } from "@/lib/use-media-library"

type FileType = "all" | "images" | "documents" | "other"

const FILE_TYPE_LABELS: Record<FileType, string> = {
  all: "All",
  images: "Images",
  documents: "Documents",
  other: "Other",
}

function getFileType(file: LibraryFile): FileType {
  const mime = file.mimetype || ""
  if (mime.startsWith("image/")) return "images"
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text") || mime.includes("sheet") || mime.includes("presentation")) return "documents"
  return "other"
}

function getFolder(path: string): string {
  const parts = path.split("/")
  return parts.length > 1 ? parts[0] : "(root)"
}

function getFileIcon(file: LibraryFile) {
  const type = getFileType(file)
  if (type === "images") return ImageIcon
  if (type === "documents") return File
  return FileArchive
}

export default function AdminMediaPage() {
  const { items, loading, uploadFiles, deleteItem } = useMediaLibrary()
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch] = useState("")
  const [fileTypeFilter, setFileTypeFilter] = useState<FileType>("all")
  const [folderFilter, setFolderFilter] = useState<string>("all")
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (fileList: FileList) => {
    setUploading(true)
    setUploadError(null)
    const results = await uploadFiles(fileList)
    if (fileList.length > 0 && results.length === 0) {
      setUploadError("Upload failed. Check file type and size limits.")
    }
    setUploading(false)
  }

  const handleDelete = async (file: LibraryFile) => {
    if (!confirm(`Delete "${file.name}"? This also removes it from the bucket.`)) return
    await deleteItem(file)
  }

  const formatSize = (bytes: number | null | undefined) => {
    if (!bytes) return "?"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isImage = (f: LibraryFile) => f.mimetype?.startsWith("image/")

  const folders = Array.from(new Set(items.map((f) => getFolder(f.path)))).sort()

  const filteredFiles = items.filter((file) => {
    if (search && !file.name.toLowerCase().includes(search.toLowerCase())) return false
    if (fileTypeFilter !== "all" && getFileType(file) !== fileTypeFilter) return false
    if (folderFilter !== "all" && getFolder(file.path) !== folderFilter) return false
    return true
  })

  const copyUrl = async (file: LibraryFile) => {
    try {
      await navigator.clipboard.writeText(file.url)
      setCopiedIndex(file.id)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      const el = document.createElement("textarea")
      el.value = file.url
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopiedIndex(file.id)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Media Library</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{items.length} file{items.length !== 1 ? "s" : ""} · live sync</span>
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
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
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
        {folders.length > 0 && (
          <div className="flex gap-1">
            {["all", ...folders].map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => setFolderFilter(folder)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  folderFilter === folder
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {folder}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        ref={dropInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt,.svg"
        className="hidden"
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      <Card
        className={`mb-6 border-dashed transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"}`}
        onClick={() => dropInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files)
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
            {search || fileTypeFilter !== "all" || folderFilter !== "all" ? (
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
            return (
              <Card key={file.id} className="overflow-hidden group">
                <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden">
                  {isImage(file) ? (
                    <Image
                      src={file.url}
                      alt={file.name}
                      width={800}
                      height={450}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="h-10 w-10 text-muted-foreground/50" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-white hover:bg-white/20"
                      onClick={() => window.open(file.url, "_blank")}
                      title="Open"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-white hover:bg-white/20"
                      onClick={() => copyUrl(file)}
                      title="Copy URL"
                    >
                      {copiedIndex === file.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-white hover:bg-white/20"
                      onClick={() => handleDelete(file)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm font-medium truncate" title={file.path}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatSize(file.size)}
                    </span>
                    {file.mimetype && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {file.mimetype.split("/").pop()}
                      </Badge>
                    )}
                    {getFolder(file.path) !== "(root)" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {getFolder(file.path)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                    {copiedIndex === file.id && (
                      <span className="text-xs text-green-500">Copied!</span>
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
