import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateFull(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function readingTime(content: string) {
  const words = content.split(/\s+/).length
  const minutes = Math.ceil(words / 200)
  return Math.max(1, minutes)
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export function truncate(text: string, length: number) {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + "..."
}

export function generateExcerpt(content: string, maxLength = 160) {
  const stripped = content.replace(/<[^>]*>/g, "")
  return truncate(stripped, maxLength)
}
