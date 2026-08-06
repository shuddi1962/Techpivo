"use client"

import { useState } from "react"
import Image from "next/image"

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
    <Image
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading || "lazy"}
      onError={() => setError(true)}
      style={style}
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
