import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("cookies-policy")!.metaTitle,
  description: getSitePage("cookies-policy")!.metaDescription,
};

export default function CookiesPolicyPage() {
  return <PageShell slug="cookies-policy" />;
}