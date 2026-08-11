import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("disclaimer")!.metaTitle,
  description: getSitePage("disclaimer")!.metaDescription,
};

export default function DisclaimerPage() {
  return <PageShell slug="disclaimer" />;
}