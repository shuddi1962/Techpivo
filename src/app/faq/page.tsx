import type { Metadata } from "next";
import PageShell from "@/components/pages/page-shell";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("faq")!.metaTitle,
  description: getSitePage("faq")!.metaDescription,
};

export default function FAQPage() {
  return (
    <PageShell slug="faq">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">
          Find answers to common questions about Techpivo, our platform, and how
          we help technology enthusiasts and professionals.
        </p>

        <div className="space-y-6">
          <div className="border rounded-xl p-6 bg-card">
            <h3 className="text-xl font-semibold mb-4">Getting Started</h3>
            <div className="space-y-3">
              <p className="font-medium">What is Techpivo?</p>
              <p className="text-sm text-muted-foreground">
                Techpivo is an AI-powered technology publishing platform that helps
                technology enthusiasts, developers, and professionals stay updated
                with the latest tech news, tutorials, and insights.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-medium">How do I create an account?</p>
              <p className="text-sm text-muted-foreground">
                Click the &ldquo;Sign Up&rdquo; button in the top navigation, enter your email,
                and follow the verification process to create your Techpivo account.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-medium">Is Techpivo free to use?</p>
              <p className="text-sm text-muted-foreground">
                Yes! Techpivo offers free access to articles, tools, community
                forums, and basic features. Premium features may be available
                through subscription plans.
              </p>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-card">
            <h3 className="text-xl font-semibold mb-4">Content & Features</h3>
            <div className="space-y-3">
              <p className="font-medium">What types of content does Techpivo offer?</p>
              <p className="text-sm text-muted-foreground">
                Techpivo provides breaking news, in-depth tutorials, product
                reviews, comparisons, opinion pieces, and evergreen guides across
                technology categories including AI, cybersecurity, programming,
                gadgets, and more.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-medium">How often is new content published?</p>
              <p className="text-sm text-muted-foreground">
                We publish new content daily, with breaking news updates as they
                happen and scheduled releases for tutorials and reviews.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-medium">Can I contribute content to Techpivo?</p>
              <p className="text-sm text-muted-foreground">
                Currently, content is created by our editorial team. We are working
                on a contributor program for expert contributors - stay tuned for
                updates!
              </p>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-card">
            <h3 className="text-xl font-semibold mb-4">Community & Engagement</h3>
            <div className="space-y-3">
              <p className="font-medium">How can I participate in the Techpivo community?</p>
              <p className="text-sm text-muted-foreground">
                Join our forums, participate in quizzes and polls, follow topics
                that interest you, and engage in discussions with fellow technology
                enthusiasts.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-medium">Do you offer newsletters?</p>
              <p className="text-sm text-muted-foreground">
                Yes! Subscribe to our weekly newsletter for curated tech news,
                exclusive analysis, and subscriber perks delivered to your inbox.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-medium">Are there mobile apps available?</p>
              <p className="text-sm text-muted-foreground">
                We are currently developing mobile apps for iOS and Android to
                enhance your Techpivo experience on the go. Check back for release
                announcements.
              </p>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-card">
            <h3 className="text-xl font-semibold mb-4">Support & Feedback</h3>
            <div className="space-y-3">
              <p className="font-medium">How do I contact Techpivo support?</p>
              <p className="text-sm text-muted-foreground">
                You can reach our support team through the contact form on our
                Contact Us page or email us directly at support@techpivo.com.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-medium">How do I report an error in an article?</p>
              <p className="text-sm text-muted-foreground">
                We appreciate your help maintaining accuracy! Use the &ldquo;Report
                Error&rdquo; link at the bottom of any article or visit our Corrections
                Policy page to submit feedback.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-medium">What is your privacy policy?</p>
              <p className="text-sm text-muted-foreground">
                Your privacy is important to us. Review our complete Privacy
                Policy to understand how we collect, use, and protect your data.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <a href="/contact" className="btn-primary px-6 py-3">
            Still have questions? Contact Us
          </a>
        </div>
      </div>
    </PageShell>
  );
}