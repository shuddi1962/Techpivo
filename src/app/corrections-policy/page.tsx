import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("corrections-policy")!.metaTitle,
  description: getSitePage("corrections-policy")!.metaDescription,
};

export default function CorrectionsPolicyPage() {
  return <PageShell slug="corrections-policy" />;
}
