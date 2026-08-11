import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("privacy-policy")!.metaTitle,
  description: getSitePage("privacy-policy")!.metaDescription,
};

export default function PrivacyPolicyPage() {
  return <PageShell slug="privacy-policy" />;
}