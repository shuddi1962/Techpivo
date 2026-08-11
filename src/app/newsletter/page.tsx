import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import NewsletterSubscribe from "@/components/forms/newsletter-subscribe";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("newsletter")!.metaTitle,
  description: getSitePage("newsletter")!.metaDescription,
};

export default function NewsletterPage() {
  return (
    <PageShell slug="newsletter">
      <NewsletterSubscribe />
    </PageShell>
  );
}