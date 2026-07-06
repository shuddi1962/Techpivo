import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { PHProvider } from "@/components/posthog-provider"
import { GoogleCMP } from "@/components/cookies/GoogleCMP"
import { CookieConsentBanner } from "@/components/cookies/cookie-consent-banner"
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
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: { url: '/favicon.svg', sizes: '180x180', type: 'image/svg+xml' },
    shortcut: '/favicon.ico',
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
    images: [
      { url: `${SITE_URL}/favicon.svg`, width: 120, height: 120, alt: SITE_NAME },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Tech, decoded. Fast.",
    images: `${SITE_URL}/favicon.svg`,
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
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
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
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-5QPM5TQ5');
            `,
          }}
        />
        <meta name="msvalidate.01" content="CBDA61642FC28CFA7E5EEF624A35DECC" />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5QPM5TQ5" height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: "Techpivo",
              url: SITE_URL,
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/favicon.svg`,
                width: 120,
                height: 120,
                caption: "Techpivo logo",
              },
              image: `${SITE_URL}/favicon.svg`,
              description: "Tech, decoded. Fast.",
              sameAs: [
                "https://twitter.com/techpivo",
                "https://facebook.com/techpivo",
                "https://linkedin.com/company/techpivo",
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
              "@id": `${SITE_URL}/#website`,
              name: "Techpivo",
              alternateName: `${SITE_NAME} — ${SITE_TAGLINE}`,
              url: SITE_URL,
              description: "Tech, decoded. Fast.",
              publisher: { "@id": `${SITE_URL}/#organization` },
              inLanguage: "en-US",
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
        <GoogleCMP />
        <CookieConsentBanner />
      </body>
    </html>
  )
}
