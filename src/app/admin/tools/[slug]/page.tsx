"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Braces, FileJson, Binary, Link2, Hash, Key, Shield, Lock,
  Type, Globe, Search, FileText, Image, Minimize2, Palette,
  Calculator, Clock, ArrowLeft, Copy, Check, RefreshCw
} from "lucide-react"

const TOOLS: Record<string, { name: string; icon: any; color: string; category: string }> = {
  "json-formatter": { name: "JSON Formatter", icon: Braces, color: "text-blue-500", category: "Developer" },
  "json-validator": { name: "JSON Validator", icon: FileJson, color: "text-green-500", category: "Developer" },
  "base64-encoder": { name: "Base64 Encoder", icon: Binary, color: "text-purple-500", category: "Developer" },
  "url-encoder": { name: "URL Encoder", icon: Link2, color: "text-cyan-500", category: "Developer" },
  "hash-generator": { name: "Hash Generator", icon: Hash, color: "text-red-500", category: "Security" },
  "password-generator": { name: "Password Generator", icon: Key, color: "text-amber-500", category: "Security" },
  "password-strength": { name: "Password Strength", icon: Shield, color: "text-green-500", category: "Security" },
  "email-validator": { name: "Email Validator", icon: Lock, color: "text-pink-500", category: "Security" },
  "word-counter": { name: "Word Counter", icon: Type, color: "text-orange-500", category: "SEO" },
  "slug-generator": { name: "Slug Generator", icon: Globe, color: "text-blue-500", category: "SEO" },
  "meta-tag-generator": { name: "Meta Tag Generator", icon: Search, color: "text-green-500", category: "SEO" },
  "readability-checker": { name: "Readability Checker", icon: FileText, color: "text-purple-500", category: "SEO" },
  "image-compressor": { name: "Image Compressor", icon: Image, color: "text-cyan-500", category: "Image" },
  "image-resizer": { name: "Image Resizer", icon: Minimize2, color: "text-pink-500", category: "Image" },
  "color-picker": { name: "Color Picker", icon: Palette, color: "text-amber-500", category: "Image" },
  "unit-converter": { name: "Unit Converter", icon: Calculator, color: "text-green-500", category: "Calculator" },
  "percentage-calculator": { name: "Percentage Calculator", icon: Calculator, color: "text-blue-500", category: "Calculator" },
  "date-calculator": { name: "Date Calculator", icon: Clock, color: "text-purple-500", category: "Calculator" },
}

function JsonFormatterTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const format = () => {
    setError("")
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, 2))
    } catch (e: any) {
      setError(e.message)
      setOutput("")
    }
  }
  return (
    <div className="space-y-3">
      <textarea className="w-full h-40 p-3 font-mono text-sm border rounded-lg bg-muted/30" placeholder="Paste JSON here..." value={input} onChange={e => setInput(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={format} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Format JSON</button>
        <button onClick={() => { setInput(""); setOutput(""); setError("") }} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">Clear</button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {output && <textarea className="w-full h-40 p-3 font-mono text-sm border rounded-lg bg-muted/30" readOnly value={output} />}
    </div>
  )
}

function JsonValidatorTool() {
  const [input, setInput] = useState("")
  const [result, setResult] = useState<{ valid: boolean; msg: string } | null>(null)
  const validate = () => {
    try {
      JSON.parse(input)
      setResult({ valid: true, msg: "Valid JSON" })
    } catch (e: any) {
      setResult({ valid: false, msg: e.message })
    }
  }
  return (
    <div className="space-y-3">
      <textarea className="w-full h-40 p-3 font-mono text-sm border rounded-lg bg-muted/30" placeholder="Paste JSON to validate..." value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={validate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Validate JSON</button>
      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.valid ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
          {result.msg}
        </div>
      )}
    </div>
  )
}

function Base64Tool() {
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<"encode" | "decode">("encode")
  const [output, setOutput] = useState("")
  const process = () => {
    try {
      setOutput(mode === "encode" ? btoa(input) : atob(input))
    } catch {
      setOutput("Invalid input for base64 " + mode)
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setMode("encode")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === "encode" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Encode</button>
        <button onClick={() => setMode("decode")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === "decode" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Decode</button>
      </div>
      <textarea className="w-full h-32 p-3 font-mono text-sm border rounded-lg bg-muted/30" placeholder={mode === "encode" ? "Enter text to encode..." : "Enter base64 to decode..."} value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={process} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">{mode === "encode" ? "Encode" : "Decode"}</button>
      {output && <textarea className="w-full h-32 p-3 font-mono text-sm border rounded-lg bg-muted/30" readOnly value={output} />}
    </div>
  )
}

function UrlEncoderTool() {
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<"encode" | "decode">("encode")
  const [output, setOutput] = useState("")
  const process = () => {
    setOutput(mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input))
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setMode("encode")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === "encode" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Encode</button>
        <button onClick={() => setMode("decode")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === "decode" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Decode</button>
      </div>
      <input className="w-full p-3 text-sm border rounded-lg bg-muted/30" placeholder="Enter URL..." value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={process} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">{mode === "encode" ? "Encode" : "Decode"}</button>
      {output && <textarea className="w-full h-20 p-3 font-mono text-sm border rounded-lg bg-muted/30" readOnly value={output} />}
    </div>
  )
}

function HashGeneratorTool() {
  const [input, setInput] = useState("")
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const generate = async () => {
    const enc = new TextEncoder()
    const data = enc.encode(input)
    const [sha256, sha1, md5Array] = await Promise.all([
      crypto.subtle.digest("SHA-256", data),
      crypto.subtle.digest("SHA-1", data),
      crypto.subtle.digest("SHA-256", data.slice(0, Math.min(data.length, 64))),
    ])
    const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
    setOutputs({
      "SHA-256": toHex(sha256),
      "SHA-1": toHex(sha1),
      "SHA-256 (first 64 chars)": toHex(md5Array).slice(0, 32),
    })
  }
  return (
    <div className="space-y-3">
      <input className="w-full p-3 text-sm border rounded-lg bg-muted/30" placeholder="Enter text to hash..." value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={generate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Generate Hashes</button>
      {Object.entries(outputs).map(([algo, hash]) => (
        <div key={algo} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{algo}</p>
            <p className="text-xs font-mono truncate">{hash}</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(hash)} className="shrink-0 p-1 hover:bg-muted rounded"><Copy className="h-3 w-3" /></button>
        </div>
      ))}
    </div>
  )
}

function PasswordGeneratorTool() {
  const [length, setLength] = useState(16)
  const [includeUpper, setIncludeUpper] = useState(true)
  const [includeLower, setIncludeLower] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  const generate = () => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const lower = "abcdefghijklmnopqrstuvwxyz"
    const numbers = "0123456789"
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    let chars = ""
    if (includeUpper) chars += upper
    if (includeLower) chars += lower
    if (includeNumbers) chars += numbers
    if (includeSymbols) chars += symbols
    if (!chars) return
    let result = ""
    const array = new Uint32Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
    setPassword(result)
    setCopied(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm">Length: {length}</label>
          <input type="range" min={4} max={64} value={length} onChange={e => setLength(parseInt(e.target.value))} className="w-48" />
        </div>
        {["Include Uppercase", "Include Lowercase", "Include Numbers", "Include Symbols"].map((label, i) => {
          const checked = [includeUpper, includeLower, includeNumbers, includeSymbols][i]
          const setter = [setIncludeUpper, setIncludeLower, setIncludeNumbers, setIncludeSymbols][i]
          return (
            <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={checked} onChange={() => setter(!checked)} className="rounded" />
              {label}
            </label>
          )
        })}
      </div>
      <button onClick={generate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Generate Password</button>
      {password && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
          <span className="font-mono text-sm flex-1 break-all">{password}</span>
          <button onClick={copy} className="shrink-0 p-1 hover:bg-muted rounded">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  )
}

function PasswordStrengthTool() {
  const [password, setPassword] = useState("")
  const strength = useMemo(() => {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"]
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500", "bg-emerald-500"]
    return { score, label: labels[score] || "Very Weak", color: colors[score] || "bg-red-500", pct: (score / 6) * 100 }
  }, [password])
  return (
    <div className="space-y-3">
      <input type="password" className="w-full p-3 text-sm border rounded-lg bg-muted/30" placeholder="Enter password..." value={password} onChange={e => setPassword(e.target.value)} />
      {password && (
        <div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
          </div>
          <p className="text-sm mt-1 font-medium">{strength.label}</p>
        </div>
      )}
    </div>
  )
}

function EmailValidatorTool() {
  const [email, setEmail] = useState("")
  const [result, setResult] = useState<{ valid: boolean; msg: string } | null>(null)
  const validate = () => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const valid = re.test(email)
    setResult({
      valid,
      msg: valid ? `"${email}" is a valid email address format` : `"${email}" is not a valid email address format`,
    })
  }
  return (
    <div className="space-y-3">
      <input className="w-full p-3 text-sm border rounded-lg bg-muted/30" placeholder="Enter email address..." value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={validate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Validate</button>
      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.valid ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
          {result.msg}
        </div>
      )}
    </div>
  )
}

function WordCounterTool() {
  const [text, setText] = useState("")
  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const chars = text.length
    const charsNoSpace = text.replace(/\s/g, "").length
    const sentences = text.trim() ? text.split(/[.!?]+/).filter(Boolean).length : 0
    const lines = text ? text.split("\n").length : 0
    return { words, chars, charsNoSpace, sentences, lines }
  }, [text])
  return (
    <div className="space-y-3">
      <textarea className="w-full h-40 p-3 text-sm border rounded-lg bg-muted/30" placeholder="Type or paste text here..." value={text} onChange={e => setText(e.target.value)} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{stats.words}</p><p className="text-xs text-muted-foreground">Words</p></div>
        <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{stats.chars}</p><p className="text-xs text-muted-foreground">Characters</p></div>
        <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{stats.charsNoSpace}</p><p className="text-xs text-muted-foreground">No Space</p></div>
        <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{stats.sentences}</p><p className="text-xs text-muted-foreground">Sentences</p></div>
        <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{stats.lines}</p><p className="text-xs text-muted-foreground">Lines</p></div>
      </div>
    </div>
  )
}

function SlugGeneratorTool() {
  const [input, setInput] = useState("")
  const [slug, setSlug] = useState("")
  const generate = () => {
    setSlug(input.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, ""))
  }
  return (
    <div className="space-y-3">
      <input className="w-full p-3 text-sm border rounded-lg bg-muted/30" placeholder="Enter title to slugify..." value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={generate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Generate Slug</button>
      {slug && (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <span className="font-mono text-sm">{slug}</span>
          <button onClick={() => navigator.clipboard.writeText(slug)} className="shrink-0 p-1 hover:bg-muted rounded"><Copy className="h-3 w-3" /></button>
        </div>
      )}
    </div>
  )
}

function MetaTagGeneratorTool() {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [keywords, setKeywords] = useState("")
  const [ogImage, setOgImage] = useState("")
  const [copied, setCopied] = useState(false)
  const metaTags = useMemo(() => {
    if (!title && !desc) return ""
    return `<title>${title || "Untitled"}</title>\n<meta name="description" content="${desc || ""}" />\n${keywords ? `<meta name="keywords" content="${keywords}" />\n` : ""}<meta property="og:title" content="${title || "Untitled"}" />\n<meta property="og:description" content="${desc || ""}" />\n${ogImage ? `<meta property="og:image" content="${ogImage}" />\n` : ""}<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="${title || "Untitled"}" />\n<meta name="twitter:description" content="${desc || ""}" />`
  }, [title, desc, keywords, ogImage])
  const copy = () => {
    navigator.clipboard.writeText(metaTags)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-3">
      <input className="w-full p-3 text-sm border rounded-lg bg-muted/30" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="w-full h-20 p-3 text-sm border rounded-lg bg-muted/30" placeholder="Meta description" value={desc} onChange={e => setDesc(e.target.value)} />
      <input className="w-full p-3 text-sm border rounded-lg bg-muted/30" placeholder="Keywords (comma separated)" value={keywords} onChange={e => setKeywords(e.target.value)} />
      <input className="w-full p-3 text-sm border rounded-lg bg-muted/30" placeholder="OG Image URL" value={ogImage} onChange={e => setOgImage(e.target.value)} />
      {metaTags && (
        <div className="relative">
          <textarea className="w-full h-40 p-3 font-mono text-xs border rounded-lg bg-muted/30" readOnly value={metaTags} />
          <button onClick={copy} className="absolute top-2 right-2 p-1.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90">{copied ? "Copied!" : "Copy"}</button>
        </div>
      )}
    </div>
  )
}

function ReadabilityCheckerTool() {
  const [text, setText] = useState("")
  const score = useMemo(() => {
    if (!text.trim()) return null
    const words = text.trim().split(/\s+/).length
    const sentences = text.split(/[.!?]+/).filter(Boolean).length
    const syllables = text.toLowerCase().split(/[aeiou]/).length - 1
    if (sentences === 0) return null
    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
    return Math.round(Math.max(0, Math.min(100, score)))
  }, [text])
  const getLevel = (s: number | null) => {
    if (s === null) return { label: "", color: "bg-gray-300" }
    if (s >= 90) return { label: "Very Easy", color: "bg-green-500" }
    if (s >= 70) return { label: "Easy", color: "bg-green-400" }
    if (s >= 50) return { label: "Fairly Easy", color: "bg-blue-400" }
    if (s >= 30) return { label: "Standard", color: "bg-yellow-500" }
    if (s >= 10) return { label: "Fairly Difficult", color: "bg-orange-500" }
    return { label: "Very Difficult", color: "bg-red-500" }
  }
  const level = getLevel(score)
  return (
    <div className="space-y-3">
      <textarea className="w-full h-40 p-3 text-sm border rounded-lg bg-muted/30" placeholder="Paste content to check readability..." value={text} onChange={e => setText(e.target.value)} />
      {score !== null && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Score: {score}/100</span>
            <span className="text-sm">{level.label}</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div className={`h-full transition-all ${level.color}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function ImageCompressorTool() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [originalSize, setOriginalSize] = useState(0)
  const [compressedSize, setCompressedSize] = useState<number | null>(null)
  const compress = () => {
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          setCompressedSize(blob.size)
          setPreview(URL.createObjectURL(blob))
        }
      }, "image/jpeg", 0.8)
    }
    img.src = URL.createObjectURL(file)
  }
  return (
    <div className="space-y-3">
      <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setOriginalSize(f.size); setPreview(""); setCompressedSize(null) } }} className="text-sm" />
      {file && (
        <div>
          <p className="text-sm">Original: {(originalSize / 1024).toFixed(1)} KB</p>
          <button onClick={compress} className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Compress</button>
        </div>
      )}
      {compressedSize !== null && (
        <div>
          <p className="text-sm text-green-600">Compressed: {(compressedSize / 1024).toFixed(1)} KB (saved {((1 - compressedSize / originalSize) * 100).toFixed(0)}%)</p>
          {preview && <img src={preview} alt="Preview" className="mt-2 max-w-xs rounded-lg border" />}
        </div>
      )}
    </div>
  )
}

function ImageResizerTool() {
  const [file, setFile] = useState<File | null>(null)
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [result, setResult] = useState<string>("")
  const resize = () => {
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) setResult(URL.createObjectURL(blob))
      }, "image/png")
    }
    img.src = URL.createObjectURL(file)
  }
  return (
    <div className="space-y-3">
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm" />
      <div className="flex gap-3 items-center">
        <input type="number" value={width} onChange={e => setWidth(parseInt(e.target.value) || 0)} className="w-24 p-2 text-sm border rounded-lg bg-muted/30" placeholder="Width" />
        <span className="text-muted-foreground">×</span>
        <input type="number" value={height} onChange={e => setHeight(parseInt(e.target.value) || 0)} className="w-24 p-2 text-sm border rounded-lg bg-muted/30" placeholder="Height" />
        <button onClick={resize} disabled={!file} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Resize</button>
      </div>
      {result && <div className="max-w-xs border rounded-lg overflow-hidden"><img src={result} alt="Resized" /></div>}
    </div>
  )
}

function ColorPickerTool() {
  const [color, setColor] = useState("#6366f1")
  const [copied, setCopied] = useState(false)
  const copy = (val: string) => { navigator.clipboard.writeText(val); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const hexToRgb = (hex: string) => { const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16); return `rgb(${r}, ${g}, ${b})` }
  return (
    <div className="space-y-3">
      <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-20 rounded-lg cursor-pointer" />
      <div className="grid grid-cols-2 gap-2">
        {[color, hexToRgb(color)].map((val, i) => (
          <div key={i} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30 text-sm font-mono">
            <span>{val}</span>
            <button onClick={() => copy(val)} className="shrink-0 p-1 hover:bg-muted rounded">{copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function UnitConverterTool() {
  const [value, setValue] = useState("1")
  const [fromUnit, setFromUnit] = useState("km")
  const [toUnit, setToUnit] = useState("mi")
  const units: Record<string, number> = { km: 1, mi: 1.609344, m: 0.001, ft: 0.0003048, in: 0.0000254, cm: 0.00001, mm: 0.000001 }
  const result = useMemo(() => {
    const v = parseFloat(value)
    if (isNaN(v)) return ""
    const meters = v * (units[fromUnit] || 1)
    return (meters / (units[toUnit] || 1)).toFixed(4)
  }, [value, fromUnit, toUnit])
  return (
    <div className="space-y-3">
      <input type="number" className="w-full p-3 text-sm border rounded-lg bg-muted/30" value={value} onChange={e => setValue(e.target.value)} placeholder="Value" />
      <div className="flex gap-2">
        <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} className="flex-1 p-3 text-sm border rounded-lg bg-muted/30">
          {Object.keys(units).map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <span className="flex items-center text-muted-foreground">→</span>
        <select value={toUnit} onChange={e => setToUnit(e.target.value)} className="flex-1 p-3 text-sm border rounded-lg bg-muted/30">
          {Object.keys(units).map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {result && <div className="p-3 border rounded-lg bg-muted/30 text-lg font-bold text-center">{result}</div>}
    </div>
  )
}

function PercentageCalculatorTool() {
  const [a, setA] = useState("20")
  const [b, setB] = useState("100")
  const mode = useMemo(() => {
    if (!a || !b) return null
    const numA = parseFloat(a)
    const numB = parseFloat(b)
    return { pct: ((numA / numB) * 100).toFixed(2), of: ((numB * numA) / 100).toFixed(2), change: (((numB - numA) / numA) * 100).toFixed(2) }
  }, [a, b])
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input type="number" className="flex-1 p-3 text-sm border rounded-lg bg-muted/30" value={a} onChange={e => setA(e.target.value)} placeholder="Value A" />
        <input type="number" className="flex-1 p-3 text-sm border rounded-lg bg-muted/30" value={b} onChange={e => setB(e.target.value)} placeholder="Value B" />
      </div>
      {mode && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{mode.pct}%</p><p className="text-xs text-muted-foreground">A is % of B</p></div>
          <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{mode.of}</p><p className="text-xs text-muted-foreground">{a}% of B</p></div>
          <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{mode.change}%</p><p className="text-xs text-muted-foreground">Change</p></div>
        </div>
      )}
    </div>
  )
}

function DateCalculatorTool() {
  const [date1, setDate1] = useState(new Date().toISOString().slice(0, 10))
  const [date2, setDate2] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const diff = useMemo(() => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const ms = Math.abs(d2.getTime() - d1.getTime())
    return { days: Math.floor(ms / 86400000), hours: Math.floor(ms / 3600000), mins: Math.floor(ms / 60000) }
  }, [date1, date2])
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input type="date" className="flex-1 p-3 text-sm border rounded-lg bg-muted/30" value={date1} onChange={e => setDate1(e.target.value)} />
        <span className="flex items-center text-muted-foreground">→</span>
        <input type="date" className="flex-1 p-3 text-sm border rounded-lg bg-muted/30" value={date2} onChange={e => setDate2(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{diff.days}</p><p className="text-xs text-muted-foreground">Days</p></div>
        <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{diff.hours}</p><p className="text-xs text-muted-foreground">Hours</p></div>
        <div className="p-3 text-center bg-muted/30 rounded-lg"><p className="text-lg font-bold">{diff.mins}</p><p className="text-xs text-muted-foreground">Minutes</p></div>
      </div>
    </div>
  )
}

const TOOL_RENDERERS: Record<string, () => JSX.Element> = {
  "json-formatter": JsonFormatterTool,
  "json-validator": JsonValidatorTool,
  "base64-encoder": Base64Tool,
  "url-encoder": UrlEncoderTool,
  "hash-generator": HashGeneratorTool,
  "password-generator": PasswordGeneratorTool,
  "password-strength": PasswordStrengthTool,
  "email-validator": EmailValidatorTool,
  "word-counter": WordCounterTool,
  "slug-generator": SlugGeneratorTool,
  "meta-tag-generator": MetaTagGeneratorTool,
  "readability-checker": ReadabilityCheckerTool,
  "image-compressor": ImageCompressorTool,
  "image-resizer": ImageResizerTool,
  "color-picker": ColorPickerTool,
  "unit-converter": UnitConverterTool,
  "percentage-calculator": PercentageCalculatorTool,
  "date-calculator": DateCalculatorTool,
}

export default function ToolPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const tool = TOOLS[slug]
  const Renderer = TOOL_RENDERERS[slug]

  if (!tool) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Tool Not Found</h1>
        <p className="text-muted-foreground mt-2">The tool &quot;{slug}&quot; was not found</p>
        <Link href="/admin/tools" className="inline-flex items-center gap-1 mt-4 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Tools
        </Link>
      </div>
    )
  }

  const Icon = tool.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className={`p-2 rounded-lg bg-muted/30`}>
          <Icon className={`h-6 w-6 ${tool.color}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{tool.name}</h1>
          <p className="text-sm text-muted-foreground">{tool.category} Tool</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
        {Renderer ? <Renderer /> : <p className="text-sm text-muted-foreground">Tool implementation coming soon.</p>}
      </div>
    </div>
  )
}
