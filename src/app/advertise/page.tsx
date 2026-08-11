import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("advertise")!.metaTitle,
  description: getSitePage("advertise")!.metaDescription,
};

export default function AdvertisePage() {
  return <PageShell slug="advertise" />;
}