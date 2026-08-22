import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("editorial-policy")!.metaTitle,
  description: getSitePage("editorial-policy")!.metaDescription,
};

export default function EditorialPolicyPage() {
  return <PageShell slug="editorial-policy" />;
}
