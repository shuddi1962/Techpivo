import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { PHProvider } from "@/components/posthog-provider"
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/constants"
import "./globals.css"

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: "Techpivo - Tech, decoded. Fast. Your source for the latest in tech news, web development, programming, cybersecurity, AI, gadgets, and tutorials.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"),
  icons: {
    icon: '/favicon.svg',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "",
  },
  referrer: "strict-origin-when-cross-origin",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Tech, decoded. Fast.",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Tech, decoded. Fast.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Techpivo",
              url: SITE_URL,
              logo: `${SITE_URL}/favicon.svg`,
              sameAs: [
                "https://twitter.com/techpivo",
                "https://facebook.com/techpivo",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Techpivo",
              url: SITE_URL,
              description: "Tech, decoded. Fast.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <PHProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </PHProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
