import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("terms-of-use")!.metaTitle,
  description: getSitePage("terms-of-use")!.metaDescription,
};

export default function TermsOfUsePage() {
  return <PageShell slug="terms-of-use" />;
}