"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Loader2, TrendingUp, Search, X } from "lucide-react"

interface KeywordSuggestProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (value: string) => void
  placeholder?: string
  className?: string
  rightElement?: React.ReactNode
}

export function KeywordSuggest({
  value,
  onChange,
  onSelect,
  placeholder = "Type a keyword...",
  className = "",
  rightElement,
}: KeywordSuggestProps) {
  const [suggestions, setSuggestions] = useState<{ keyword: string; volume: string; trend: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are a keyword research tool. Given the partial query "${query}", suggest 8 related SEO keyword ideas. Return ONLY a JSON array of objects with fields: keyword (string), volume (string like "1.2K/mo" or "Low"), trend (string like "up", "down", "stable"). Example: [{"keyword":"best ${query} tools","volume":"2.4K/mo","trend":"up"}]. No markdown, no code fences, just raw JSON array.`,
        }),
      })
      const data = await res.json()
      const text = data.content || data.choices?.[0]?.message?.content || ""
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        setSuggestions(parsed.slice(0, 8))
        setShowDropdown(true)
        setSelectedIndex(-1)
      } else {
        setSuggestions([])
        setShowDropdown(false)
      }
    } catch {
      setSuggestions([])
      setShowDropdown(false)
    }
    setLoading(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex])
      } else if (value.trim()) {
        onSelect?.(value.trim())
        setShowDropdown(false)
        setSuggestions([])
      }
    }
  }

  const handleSelect = (item: { keyword: string }) => {
    onChange(item.keyword)
    onSelect?.(item.keyword)
    setShowDropdown(false)
    setSuggestions([])
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true) }}
          placeholder={placeholder}
          className={`w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent ${className}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-[#6366F1]" />
          </div>
        )}
        {rightElement && !loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 left-0 right-0 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
        >
          <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider border-b border-gray-100 dark:border-[#1F2937]">
            Keyword Suggestions
          </div>
          {suggestions.map((item, i) => (
            <button
              key={i}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-b border-gray-50 dark:border-[#1F2937] last:border-0 ${
                i === selectedIndex
                  ? "bg-[#6366F1]/10 dark:bg-[#6366F1]/20"
                  : "hover:bg-gray-50 dark:hover:bg-[#1a2235]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-900 dark:text-[#F9FAFB] truncate">
                  {item.keyword}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-[#6B7280] bg-gray-50 dark:bg-[#1F2937] px-2 py-0.5 rounded border border-gray-200 dark:border-[#374151]">
                  {item.volume}
                </span>
                {item.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                {item.trend === "down" && <TrendingUp className="h-3.5 w-3.5 text-red-500 rotate-180" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
