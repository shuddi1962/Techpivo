import type { Metadata, Viewport } from "next"
import Script from "next/script"
import dynamic from "next/dynamic"
import { DM_Sans, Syne } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { DeferredPostHog } from "@/components/deferred-posthog"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/constants"
import { JsonLd } from "@/components/ui/jsonld"
import { organizationSchema, websiteSchema } from "@/lib/jsonld"
import "./globals.css"

// Self-hosted fonts (no render-blocking Google Fonts @import / stylesheet).
// display:swap keeps text visible during load (fixes "Render-blocking requests").
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
  preload: true,
})
const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-syne",
  preload: false,
})

// Deferred client-only widgets: excluded from the initial bundle so the
// homepage LCP path ships less JS (fixes "Reduce unused JavaScript" / TBT).
// Each loads after hydration and renders nothing until needed.
// (PostHog rides an extra idle gate via DeferredPostHog — its ~100KB chunk
// only downloads once the browser is idle, never contending with LCP.)
const PageViewTracker = dynamic(
  () => import("@/components/post/page-view-tracker").then((m) => m.PageViewTracker),
  { ssr: false },
)
const GoogleCMP = dynamic(
  () => import("@/components/cookies/GoogleCMP").then((m) => m.GoogleCMP),
  { ssr: false },
)
const CookieConsentBanner = dynamic(
  () => import("@/components/cookies/cookie-consent-banner").then((m) => m.CookieConsentBanner),
  { ssr: false },
)
const PopupAd = dynamic(
  () => import("@/components/ads/popup-ad").then((m) => m.PopupAd),
  { ssr: false },
)

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
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "",
  },
  referrer: "strict-origin-when-cross-origin",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Techpivo delivers expert tech news, programming tutorials, cybersecurity guides, AI insights, gadget reviews, and developer tools. Stay ahead with in-depth tech coverage.",
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Techpivo - Tech, decoded. Fast.",
    images: [`${SITE_URL}/og-home.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${syne.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <>
            <meta name="google-adsense-account" content={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID} />
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
              crossOrigin="anonymous"
            />
          </>
        )}
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
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
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
        <Script
          id="google-tag-manager"
          strategy="lazyOnload"
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
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5QPM5TQ5" title="Google Tag Manager" height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
        </noscript>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <DeferredPostHog>
            <LayoutWrapper>{children}</LayoutWrapper>
          </DeferredPostHog>
        </ThemeProvider>
        <PageViewTracker />
        <GoogleCMP />
        <CookieConsentBanner />
        <PopupAd />
      </body>
    </html>
  )
}
