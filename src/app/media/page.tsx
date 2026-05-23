"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Image, Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminMediaPage() {
  const [files, setFiles] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.storage.from("media").list().then(({ data }) => {
      if (data) setFiles(data)
    })
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Media Library</h1>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag and drop files or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 10MB</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
        {files.map((file: any) => (
          <Card key={file.name} className="group">
            <CardContent className="p-2">
              <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs truncate mt-1">{file.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
