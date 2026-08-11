import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("write-for-us")!.metaTitle,
  description: getSitePage("write-for-us")!.metaDescription,
};

export default function WriteForUsPage() {
  return <PageShell slug="write-for-us" />;
}