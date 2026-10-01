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
}

const FALLBACK = "/api/placeholder/400/225"

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
}: SafeImageProps) {
  const [error, setError] = useState(false)
  const imgSrc = error ? FALLBACK : (src || FALLBACK)
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
