"use client"

import { useState } from "react"
import { ArrowLeft, Copy, Check, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function JsonFormatterPage() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const format = (indent: number) => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, indent))
      setError("")
    } catch (e: any) {
      setError(e.message)
      setOutput("")
    }
  }

  const minify = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError("")
    } catch (e: any) {
      setError(e.message)
      setOutput("")
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tools" className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">JSON Formatter</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Format, validate, and beautify JSON data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Input JSON</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={20}
            placeholder='{"key": "value"}'
            className="w-full px-4 py-3 text-sm font-mono bg-gray-50 dark:bg-[#1F2937] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent resize-none"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={() => format(2)} className="px-4 py-2 text-sm font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors">Format (2 spaces)</button>
            <button onClick={() => format(4)} className="px-4 py-2 text-sm font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors">Format (4 spaces)</button>
            <button onClick={minify} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg transition-colors">Minify</button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Output</label>
            {output && (
              <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#F59E0B]">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            rows={20}
            className="w-full px-4 py-3 text-sm font-mono bg-gray-50 dark:bg-[#1F2937] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white resize-none"
          />
          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-700 dark:text-red-400">{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
