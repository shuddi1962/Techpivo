"use client"

import { useState } from "react"

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  priority?: boolean
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
  loading,
  style,
  wrapperClassName,
}: SafeImageProps) {
  const [error, setError] = useState(false)
  const imgSrc = error ? FALLBACK : (src || FALLBACK)

  const img = (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={priority ? undefined : (loading || "lazy")}
      decoding="async"
      onError={() => setError(true)}
      style={{
        ...style,
        ...(fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : {}),
      }}
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
