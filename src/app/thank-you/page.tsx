import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";

export const metadata: Metadata = {
  title: "Thank You — Techpivo",
  description: "Thank you for reaching out to Techpivo. We've received your message and will respond shortly.",
};

export default function ThankYouPage() {
  return (
    <PageShell slug="thank-you">
      <div className="min-h-screen flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-4xl font-bold mb-6">
            Message Sent Successfully
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            We've received your message and will get back to you as soon as possible.
          </p>
          <div className="space-y-4 max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">
              What would you like to do next?
            </p>
            <div className="flex gap-3 w-full justify-center">
              <a
                href="/"
                className="flex-1 btn-secondary px-6 py-2 rounded-lg"
              >
                Return to Home
              </a>
              <a
                href="/contact"
                className="flex-1 btn-primary px-6 py-2 rounded-lg"
              >
                Send Another Message
              </a>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}