"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Lightbulb, Loader2 } from "lucide-react"

export default function AdminSuggestPage() {
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const generateSuggestions = async () => {
    if (!keyword) return
    setLoading(true)
    try {
      const res = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate 10 blog post title ideas about "${keyword}" for a tech blog called Blizine. Return only the titles, one per line, no numbering.`,
        }),
      })
      const data = await res.json()
      if (data.content) {
        const lines = data.content.split("\n").filter((l: string) => l.trim())
        setSuggestions(lines.slice(0, 10))
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Content Suggestions</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-amber" />
            AI-Powered Topic Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter a keyword or topic..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && generateSuggestions()}
            />
            <Button onClick={generateSuggestions} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
              Generate Ideas
            </Button>
          </div>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Suggested Titles</h2>
          {suggestions.map((title, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-2xl font-black text-muted-foreground/30 w-8">{i + 1}</span>
                <p className="font-medium flex-1">{title}</p>
                <Badge variant="secondary" className="shrink-0">AI Generated</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
