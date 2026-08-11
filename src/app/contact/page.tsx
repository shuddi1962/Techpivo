import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import ContactForm from "@/components/forms/contact-form";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("contact")!.metaTitle,
  description: getSitePage("contact")!.metaDescription,
};

export default function ContactPage() {
  return (
    <PageShell slug="contact">
      <ContactForm />
    </PageShell>
  );
}