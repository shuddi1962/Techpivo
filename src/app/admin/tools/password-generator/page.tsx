"use client"

import { useState } from "react"
import { ArrowLeft, Copy, Check, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState(16)
  const [uppercase, setUppercase] = useState(true)
  const [lowercase, setLowercase] = useState(true)
  const [numbers, setNumbers] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  const generate = () => {
    let chars = ""
    if (uppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if (lowercase) chars += "abcdefghijklmnopqrstuvwxyz"
    if (numbers) chars += "0123456789"
    if (symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if (!chars) chars = "abcdefghijklmnopqrstuvwxyz"

    let result = ""
    const arr = new Uint32Array(length)
    crypto.getRandomValues(arr)
    for (let i = 0; i < length; i++) result += chars[arr[i] % chars.length]
    setPassword(result)
  }

  const copy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const strength = () => {
    let score = 0
    if (length >= 12) score++
    if (length >= 16) score++
    if (uppercase && lowercase) score++
    if (numbers) score++
    if (symbols) score++
    if (score <= 2) return { label: "Weak", color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" }
    if (score <= 3) return { label: "Fair", color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30" }
    if (score <= 4) return { label: "Strong", color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" }
    return { label: "Very Strong", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" }
  }

  const s = strength()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tools" className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password Generator</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Generate secure random passwords</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            value={password}
            readOnly
            placeholder="Click generate..."
            className="flex-1 px-4 py-3 text-lg font-mono bg-gray-50 dark:bg-[#1F2937] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white"
          />
          <button onClick={copy} className="p-3 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg border-2 border-gray-200 dark:border-[#374151]">
            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-400" />}
          </button>
        </div>

        {password && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${s.bg} ${s.color}`}>
            {s.label}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-1">
              <span>Length</span>
              <span className="font-semibold">{length}</span>
            </div>
            <input
              type="range"
              min={8} max={64}
              value={length}
              onChange={e => setLength(parseInt(e.target.value))}
              className="w-full accent-[#F59E0B]"
            />
          </div>

          {[
            { label: "Uppercase (A-Z)", value: uppercase, set: setUppercase },
            { label: "Lowercase (a-z)", value: lowercase, set: setLowercase },
            { label: "Numbers (0-9)", value: numbers, set: setNumbers },
            { label: "Symbols (!@#...)", value: symbols, set: setSymbols },
          ].map(opt => (
            <label key={opt.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
              <input
                type="checkbox"
                checked={opt.value}
                onChange={e => opt.set(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-[#F59E0B]"
              />
            </label>
          ))}
        </div>

        <button onClick={generate} className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg transition-colors">
          <RefreshCw className="h-4 w-4" />
          Generate Password
        </button>
      </div>
    </div>
  )
}
