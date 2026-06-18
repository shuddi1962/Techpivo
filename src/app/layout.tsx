import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { PHProvider } from "@/components/posthog-provider"
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: "Techpivo - Tech, decoded. Fast. Your source for the latest in tech news, web development, programming, cybersecurity, AI, gadgets, and tutorials.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"),
  icons: {
    icon: '/icon.svg',
  },
  verification: {
    google: '75MCSV7iG7JdKa_i1Tt0ceqqQ4Jl-W33sjbIMnrlMQ4',
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Tech, decoded. Fast.",
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
        <script src="https://www.googletagmanager.com/gtag/js?id=G-YX3H076JBM" async />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-YX3H076JBM');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Techpivo",
              url: "https://techpivo.com",
              logo: "https://techpivo.com/icon.svg",
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
              url: "https://techpivo.com",
              description: "Tech, decoded. Fast.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://techpivo.com/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <PHProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </PHProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
