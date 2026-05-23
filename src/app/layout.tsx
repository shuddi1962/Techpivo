import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { BreakingNews } from "@/components/layout/breaking-news"
import { Header } from "@/components/layout/header"
import { Nav } from "@/components/layout/nav"
import { Footer } from "@/components/layout/footer"
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: "Blizine - Tech, decoded. Fast. Your source for the latest in tech news, web development, programming, cybersecurity, AI, gadgets, and tutorials.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://blizine.com"),
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
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <BreakingNews />
          <Header />
          <Nav />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
