import type { SVGProps } from "react"

type Props = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 28, children, ...props }: Props & { children: React.ReactNode }) {
  return <svg viewBox="0 0 28 28" width={size} height={size} fill="none" {...props}>{children}</svg>
}

export function XLogo(props: Props) {
  return (
    <Base {...props}>
      <path d="M20.743 2h4.031l-8.804 10.06L26 26h-8.107l-6.35-8.3L4.413 26H.38l9.413-10.758L0 2h8.308l5.739 7.587L20.743 2Zm-1.414 21.562h2.234L6.665 4.344H4.267l15.062 19.218Z" fill="#000" />
    </Base>
  )
}

export function FacebookLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#1877F2" />
      <path d="M18.5 11.5h-2.5v-2a1 1 0 0 1 1-1h1.5V5.5h-2.5a3.5 3.5 0 0 0-3.5 3.5v2.5H10V14h2.5v8.5h3.5V14H18l.5-2.5Z" fill="#fff" />
    </Base>
  )
}

export function YouTubeLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="6" fill="#FF0000" />
      <path d="M22.2 9.2a1.9 1.9 0 0 1 1.1 1.1C24 12 24 14 24 14s0 2-.7 3.7a1.9 1.9 0 0 1-1.1 1.1C20.5 19.5 14 19.5 14 19.5s-6.5 0-8.2-.7a1.9 1.9 0 0 1-1.1-1.1C4 16 4 14 4 14s0-2 .7-3.7a1.9 1.9 0 0 1 1.1-1.1C7.5 8.5 14 8.5 14 8.5s6.5 0 8.2.7ZM12.5 11.5v5l5-2.5-5-2.5Z" fill="#fff" />
    </Base>
  )
}

export function TelegramLogo(props: Props) {
  return (
    <Base {...props}>
      <circle cx="14" cy="14" r="12" fill="#0088CC" />
      <path d="M6.5 13.3c3.5-1.5 5.8-2.5 7-3 3.3-1.4 4-1.6 4.5-1.6.1 0 .4 0 .6.2.2.2.2.4.2.5 0 .2-.3 1.8-.6 3.3-.4 2-1 4.2-1 4.2s-.1.3-.4.4c-.2.1-.4 0-.6-.1-.9-.7-3-2-4.2-2.7l-.3-.2c-.5-.3-1-.7-.4-1.2.2-.3 1-1 2-1.9l4-3.7c.2-.2.3-.5 0-.4l-5.1 3.2c-.5.3-1 .5-1.5.3l-4-1.3s-.5-.2-.4-.5c0-.2.4-.4.9-.6Z" fill="#fff" />
    </Base>
  )
}

export function LinkedInLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#0A66C2" />
      <path d="M8.5 11h-3v10h3V11ZM7 8.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM15.5 12.5h-3V21h3v-4.5a2 2 0 0 1 1.5-2.2c.3-.1.7-.1 1 0s.7.2 1 .5c.2.3.3.6.4 1 .1.4.1.8.1 1.2V21h3v-4.8c0-1.2-.2-2.2-.6-3a3 3 0 0 0-2.2-1.5 2.9 2.9 0 0 0-3.2 1.7v-1Z" fill="#fff" />
    </Base>
  )
}

export function RedditLogo(props: Props) {
  return (
    <Base {...props}>
      <circle cx="14" cy="14" r="12" fill="#FF4500" />
      <circle cx="10.5" cy="13.5" r="1.5" fill="#fff" />
      <circle cx="17.5" cy="13.5" r="1.5" fill="#fff" />
      <path d="M14 19c-2.2 0-3.5-1-3.5-1s.8.8 3.5.8 3.5-.8 3.5-.8-.1.5-.7.7c-.4.1-1.7.3-2.8.3Z" fill="#fff" />
      <path d="M14 17.5c-2.2 0-4-1-4-1s.9.8 4 .8 4-.8 4-.8-1.8 1-4 1Z" fill="#fff" opacity=".5" />
      <circle cx="14" cy="20" r="1" fill="#fff" />
    </Base>
  )
}

export function WhatsAppLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="6" fill="#25D366" />
      <path d="M14 5.5a8.5 8.5 0 0 0-3.7 16.1l-1.1 3.4 3.6-1.1A8.5 8.5 0 1 0 14 5.5Zm3.7 11.8c-.2.5-.7.9-1.2 1-.3 0-.6.2-1.9-.4-1-.5-2-1.4-2.7-2.4-.4-.5-.7-1-.9-1.6-.2-.6 0-1 .2-1.3.2-.2.4-.5.5-.7.2-.2.3-.4.4-.6.1-.2 0-.4 0-.6-.2-.5-.5-1-1-1.4l-.4-.4c-.2-.2-.5-.3-.8-.3s-.5 0-.8.1c-.3.2-.7.5-1 1-.3.5-.5 1-.5 1.7 0 .5.1 1 .3 1.5.2.5.5 1 .8 1.5.4.6.9 1.2 1.5 1.8.6.5 1.2 1 1.9 1.3.6.3 1.2.5 1.8.6.4.1.7.1 1 .1s.5-.1.8-.3c.2-.1.4-.3.6-.5.2-.2.3-.5.4-.8.1-.2.1-.5 0-.7Z" fill="#fff" />
    </Base>
  )
}

export function MediumLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#000" />
      <path d="M6.5 9.5c0-.2-.1-.5-.3-.6l-2-2.5V6h6.2l4.8 10.6L19.8 6H25.5v.4l-1.7 1.7c-.2.1-.2.3-.2.5v11.8c0 .2 0 .4.2.5l1.7 1.7v.4h-8.5v-.4l1.8-1.7c.1-.1.1-.3.1-.5V9.6l-5 12.7h-.7L8 9.6v8.7c0 .3.1.6.3.8l2.4 3v.4H5v-.4l2.3-3c.2-.2.3-.5.3-.8l-.1-8.8Z" fill="#fff" />
    </Base>
  )
}

export function DevtoLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="6" fill="#0A0A0A" />
      <path d="M9 10.5c.3-.3.7-.5 1.2-.5h2c.5 0 1 .2 1.4.6.4.4.6.8.6 1.4v3c0 .5-.2 1-.6 1.4-.4.4-.9.6-1.4.6h-2c-.5 0-1-.2-1.2-.5V10.5Zm1.5 1v5c0 .2.1.3.3.3h.8c.2 0 .3-.1.4-.3v-5c0-.2-.1-.3-.4-.3h-.8c-.2 0-.3.1-.3.3Zm4.5 4.5V12l1.8-2.5h1.2v.3L17 12.5v.2h.4l1.3 3.2v.1h-1l-1-2.6-.3.1v2.5h-1Z" fill="#fff" />
    </Base>
  )
}

export function HashnodeLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#2962FF" />
      <circle cx="14" cy="14" r="8" fill="#fff" />
      <circle cx="14" cy="14" r="5" fill="#2962FF" />
    </Base>
  )
}

export function FlipboardLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#E12828" />
      <path d="M6 6h6v16H6V6Zm8 8h6v8h-6v-8Zm0-8h8v6h-8V6Z" fill="#fff" />
    </Base>
  )
}

export function BingLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#008373" />
      <path d="M8 6v16l4.5 2 7-4v-4l-3.5 2-3-2V8l3 2 3.5-2-7-4L8 6Z" fill="#fff" />
    </Base>
  )
}

export function PerplexityLogo(props: Props) {
  return (
    <Base {...props}>
      <circle cx="14" cy="14" r="12" fill="#1A3CFF" />
      <path d="M10 8h8l-2 2h-4l-2-2Zm0 0v12l4-4v-4l2 2v6l-6 6v-4l4-4-4-4v-6Z" fill="#fff" />
      <path d="M18 8v12l-4-4v-4l-2 2v6l4 4v-4l-2-2 4-4v-6Z" fill="#fff" opacity=".6" />
    </Base>
  )
}

export function GoogleNewsLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#4285F4" />
      <path d="M5 9h11v3H8v7H5V9Zm6 4h5v3h-5v-3Zm0 5h8v3h-8v-3ZM18 9h5v10h-5V9Z" fill="#fff" />
    </Base>
  )
}

export function ResendLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#000" />
      <path d="M6 8h16v2H6V8Zm0 5h16v2H6v-2Zm0 5h12v2H6v-2Z" fill="#fff" />
    </Base>
  )
}

export function IndexNowLogo(props: Props) {
  return (
    <Base {...props}>
      <circle cx="14" cy="14" r="12" fill="#F57C00" />
      <path d="M14 6l8 8-3 3-5-5-5 5-3-3 8-8Z" fill="#fff" />
      <path d="M14 11l5 5-3 3-2-2-2 2-3-3 5-5Z" fill="#fff" opacity=".6" />
    </Base>
  )
}

export function PexelsLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#05A081" />
      <path d="M10 6v16h3v-6h3a5 5 0 0 0 0-10h-6Zm3 3h3a2 2 0 1 1 0 4h-3V9Z" fill="#fff" />
    </Base>
  )
}

export function OpenRouterLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="6" fill="#FF6B35" />
      <circle cx="10" cy="10" r="3" fill="#fff" />
      <circle cx="18" cy="10" r="3" fill="#fff" opacity=".7" />
      <circle cx="14" cy="18" r="3" fill="#fff" opacity=".5" />
      <path d="M10 10l4 4m4-4l-4 4" stroke="#FF6B35" strokeWidth="1.5" />
    </Base>
  )
}

export function GoogleAIStudioLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#4285F4" />
      <path d="M14 6c-1.5 0-2.5.5-3.5 2C9 10 8 13 8 14s1 4 2.5 6c1 1.5 2 2 3.5 2s2.5-.5 3.5-2c1.5-2 2.5-5 2.5-6s-1-4-2.5-6c-1-1.5-2-2-3.5-2Z" fill="#fff" />
      <circle cx="14" cy="14" r="3" fill="#4285F4" />
    </Base>
  )
}

export function PinterestLogo(props: Props) {
  return (
    <Base {...props}>
      <rect width="28" height="28" rx="4" fill="#E60023" />
      <path d="M14 5a9 9 0 0 0-3.2 17.4 7.3 7.3 0 0 1 .2-2.2l1.2-5a2.6 2.6 0 0 1-.3-1.2c0-1.1.6-2 1.5-2s.8.7.8 1.5c0 .5-.2 1.1-.5 1.7-.2.6-.4 1.3-.4 2 0 1.2.7 2 1.7 2 2 0 3-2.7 3-5.5 0-2.8-2-4.7-4.6-4.7a4.9 4.9 0 0 0-5.2 5c0 1 .3 1.8 1 2.4.2.2.2.4.2.5l-.3 1.2c-.1.4-.4.5-.7.4-1.7-.7-2.6-2.7-2.6-4.5 0-3.2 2.8-6.6 7.5-6.6 4 0 6.7 2.9 6.7 6 0 4-2.3 6.5-5.5 6.5a2.8 2.8 0 0 1-2.4-1.2l-.6 2.5a9 9 0 0 1-1 2.2A9 9 0 1 0 14 5Z" fill="#fff" />
    </Base>
  )
}
