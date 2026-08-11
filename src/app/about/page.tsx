import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("about")!.metaTitle,
  description: getSitePage("about")!.metaDescription,
};

export default function AboutPage() {
  return <PageShell slug="about" />;
}