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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Our Location</h2>
        <div className="border rounded-xl p-6 bg-card">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Techpivo Headquarters</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Building the future of technology publishing, one article at a time.
              Our team is distributed globally but we work together to bring you the
              best tech content.
            </p>
            <div className="space-y-2 text-sm">
              <p><strong>Address:</strong> Remote-First Team</p>
              <p><strong>Email:</strong> <a href="mailto:hello@techpivo.com" className="text-accent hover:underline">hello@techpivo.com</a></p>
              <p><strong>Support:</strong> <a href="mailto:support@techpivo.com" className="text-accent hover:underline">support@techpivo.com</a></p>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-base font-semibold mb-3">Get Directions</h4>
            <p className="text-sm text-muted-foreground mb-4">
              For in-person meetings or media inquiries, please contact us in advance
              to schedule a visit or virtual meeting.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Tecpivo+Headquarters"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-4 py-2 rounded-lg text-sm flex-1 text-center"
              >
                📍 View on Google Maps
              </a>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Tecpivo+Headquarters"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-4 py-2 rounded-lg text-sm flex-1 text-center"
              >
                🚗 Get Directions
              </a>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Techpivo operates as a remote-first company.
              For the best response, please use our contact form above or email us
              directly. We typically respond within 24 hours during business days.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}