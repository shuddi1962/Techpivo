"use client"

import { useState } from "react"
import Image from "next/image"

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  priority?: boolean
  fetchPriority?: "high" | "low" | "auto"
  sizes?: string
  loading?: "lazy" | "eager"
  style?: React.CSSProperties
  wrapperClassName?: string
  /** Max pixel width to request from hosts that support width params (default 800). */
  maxWidth?: number
}

const FALLBACK = "/api/placeholder/400/225"

/**
 * Shrink remote originals at the URL level. With `images.unoptimized` (Vercel
 * 402 workaround) Next.js serves remote files byte-for-byte, so a 3-5MB
 * Pexels original ships to every phone — the entire "Improve image delivery"
 * PageSpeed number. Pexels and Supabase storage both support width params,
 * so request a display-sized variant instead of the original.
 */
function optimizeSrc(src: string, width: number): string {
  try {
    const u = new URL(src)
    if (u.hostname === "images.pexels.com") {
      u.searchParams.set("auto", "compress")
      u.searchParams.set("cs", "tinysrgb")
      u.searchParams.set("w", String(width))
      return u.toString()
    }
    if (u.hostname.endsWith(".supabase.co") && u.pathname.includes("/storage/v1/object/")) {
      u.searchParams.set("width", String(width))
      u.searchParams.set("quality", "75")
      return u.toString()
    }
  } catch {
    // Relative URLs, data:/blob: URLs — leave untouched.
  }
  return src
}

export function SafeImage({
  src,
  alt,
  className,
  fill,
  priority,
  fetchPriority,
  sizes,
  loading,
  style,
  wrapperClassName,
  maxWidth = 800,
}: SafeImageProps) {
  const [error, setError] = useState(false)
  const rawSrc = error ? FALLBACK : (src || FALLBACK)
  const imgSrc = error ? FALLBACK : optimizeSrc(rawSrc, maxWidth)
  const eager = priority || loading === "eager"

  const img = (
    <Image
      src={imgSrc}
      alt={alt}
      className={className}
      // LCP image must be eager + high fetch-priority; everything else lazy.
      // (SafeImage previously ignored `priority` and always lazy-loaded,
      // delaying LCP by a full round-trip.)
      loading={eager ? "eager" : loading || "lazy"}
      priority={priority}
      fetchPriority={fetchPriority || (priority ? "high" : "auto")}
      // Responsive sizes so the browser picks a small variant instead of the
      // full original (fixes "Improve image delivery" on PageSpeed).
      sizes={sizes || (fill ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "(max-width: 640px) 100vw, 800px")}
      decoding="async"
      onError={() => setError(true)}
      style={style}
      referrerPolicy="no-referrer"
      {...(fill ? { fill: true } : { width: 800, height: 450 })}
    />
  )

  if (fill) {
    return (
      <div className={wrapperClassName || "relative w-full h-full"}>
        {img}
      </div>
    )
  }

  return img
}
