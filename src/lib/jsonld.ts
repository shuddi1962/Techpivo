import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/constants"

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.svg`,
      width: 120,
      height: 120,
    },
    image: `${SITE_URL}/favicon.svg`,
    description: SITE_TAGLINE,
    sameAs: [
      "https://x.com/Techpivo",
      "https://facebook.com/Techpivo",
      "https://ng.linkedin.com/in/techpivo-hub-5a1554416",
    ],
  }
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: `${SITE_NAME} — ${SITE_TAGLINE}`,
    url: SITE_URL,
    description: SITE_TAGLINE,
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
  }
}

export function breadcrumbSchema(items: { name: string; url?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  }
}

export function articleSchema(post: any) {
  return {
    "@context": "https://schema.org",
    "@type": post.schema_type || "Article",
    headline: post.title,
    description: post.seo_description || post.excerpt || post.content?.replace(/<[^>]+>/g, "").slice(0, 155),
    image: post.featured_image || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: {
      "@type": "Person",
      name: post.author?.full_name || post.author?.username || SITE_NAME,
      ...(post.author?.username ? { url: `${SITE_URL}/author/${post.author.username}` } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/${post.slug}`,
    },
  }
}

export function faqPageSchema(faqs: { question: string; answer: string }[]) {
  if (!faqs?.length) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

export function collectionPageSchema(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    name,
    description,
    url,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    breadcrumb: { "@id": `${url}#breadcrumb` },
  }
}

export function profilePageSchema(author: any) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: author.created_at || undefined,
    dateModified: author.updated_at || undefined,
    mainEntity: {
      "@type": "Person",
      name: author.full_name,
      description: author.bio || undefined,
      image: author.avatar_url || undefined,
      url: `${SITE_URL}/author/${author.username}`,
      sameAs: [].filter(Boolean) as string[],
    },
  }
}

export function softwareApplicationSchema(tool: { name: string; description: string; url: string; image?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    url: tool.url,
    ...(tool.image ? { image: tool.image } : {}),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }
}

export function itemListSchema(items: { url: string; name: string; position: number }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      url: item.url,
      name: item.name,
    })),
  }
}

export function eventSchema(event: {
  name: string
  description?: string | null
  startDate: string
  endDate?: string | null
  location?: string | null
  url?: string | null
  image?: string
  eventStatus?: string
  eventAttendanceMode?: string
}) {
  const status = event.eventStatus || "https://schema.org/EventScheduled"
  const mode = event.eventAttendanceMode || (event.location
    ? "https://schema.org/OfflineEventAttendanceMode"
    : "https://schema.org/OnlineEventAttendanceMode")

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.startDate,
    eventStatus: status,
    eventAttendanceMode: mode,
  }

  if (event.description) schema.description = event.description
  if (event.endDate) schema.endDate = event.endDate
  if (event.image) schema.image = event.image
  if (event.url) schema.url = event.url

  if (event.location) {
    schema.location = {
      "@type": "Place",
      name: event.location,
      address: { "@type": "PostalAddress", addressLocality: event.location },
    }
  } else {
    schema.location = {
      "@type": "VirtualLocation",
      url: event.url || SITE_URL,
    }
  }

  schema.organizer = { "@type": "Organization", name: SITE_NAME, url: SITE_URL }

  return schema
}

export function eventListSchema(events: { name: string; startDate: string; url?: string | null }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.map((event, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: event.name,
        startDate: event.startDate,
        ...(event.url ? { url: event.url } : {}),
      },
    })),
  }
}

export function courseSchema(course: {
  name: string
  description: string
  url: string
  providerName?: string
  image?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.name,
    description: course.description,
    url: course.url,
    ...(course.image ? { image: course.image } : {}),
    provider: {
      "@type": "Organization",
      name: course.providerName || SITE_NAME,
      sameAs: SITE_URL,
    },
  }
}

export function courseListSchema(courses: { name: string; description: string; url: string; image?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: courses.map((course, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: course.name,
        description: course.description,
        url: course.url,
        ...(course.image ? { image: course.image } : {}),
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          sameAs: SITE_URL,
        },
      },
    })),
  }
}

export function productSchema(product: {
  name: string
  description: string
  brand: string
  price: string
  priceCurrency?: string
  priceValidUntil?: string
  url: string
  image?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    ...(product.image ? { image: product.image } : {}),
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.priceCurrency || "USD",
      ...(product.priceValidUntil ? { priceValidUntil: product.priceValidUntil } : {}),
      availability: "https://schema.org/InStock",
      url: product.url,
    },
  }
}

export function videoObjectSchema(video: {
  name: string
  description: string
  thumbnailUrl: string
  uploadDate: string
  duration?: string
  contentUrl?: string
  embedUrl?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    ...(video.duration ? { duration: video.duration } : {}),
    ...(video.contentUrl ? { contentUrl: video.contentUrl } : {}),
    ...(video.embedUrl ? { embedUrl: video.embedUrl } : {}),
  }
}
