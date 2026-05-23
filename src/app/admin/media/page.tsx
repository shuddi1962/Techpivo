"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Trash2, FileText, Download } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function AdminMediaPage() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.storage.from("media").list().then(({ data }) => {
      if (data) setFiles(data)
      setLoading(false)
    })
  }, [])

  const uploadFiles = async (fileList: FileList) => {
    setUploading(true)
    await Promise.all(
      Array.from(fileList).map(async (file) => {
        const path = `${Date.now()}-${file.name}`
        await supabase.storage.from("media").upload(path, file)
      })
    )
    const { data } = await supabase.storage.from("media").list()
    if (data) setFiles(data)
    setUploading(false)
  }

  const deleteFile = async (name: string) => {
    if (!confirm("Delete this file?")) return
    await supabase.storage.from("media").remove([name])
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  const getUrl = (path: string) => {
    const { data } = supabase.storage.from("media").getPublicUrl(path)
    return data.publicUrl
  }

  const formatSize = (bytes: number | undefined) => {
    if (!bytes) return "?"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isImage = (f: any) => f.metadata?.mimetype?.startsWith("image/")

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Media Library</h1>
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      <Card
        className={`mb-6 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
        }}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drop files here or click Upload</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg font-medium">No files yet</p>
            <p className="text-sm text-muted-foreground">Upload your first file</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <Card key={file.name} className="overflow-hidden group">
              <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden">
                {isImage(file) ? (
                  <img
                    src={getUrl(file.name)}
                    alt={file.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={() => window.open(getUrl(file.name), "_blank")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={() => deleteFile(file.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
                <p className="text-xs text-muted-foreground">
                  {formatDate(file.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
