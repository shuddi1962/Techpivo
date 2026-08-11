export interface SitePageDef {
  slug: string;
  label: string;
  path: string;
  icon: string;
  hero: {
    title: string;
    subtitle: string;
    emoji?: string;
    updatedLine?: string;
  };
  contentMd: string;
  metaTitle: string;
  metaDescription: string;
}

export const SITE_PAGES: SitePageDef[] = [
  {
    slug: "about",
    label: "About Us",
    path: "/about",
    icon: "🏢",
    hero: {
      title: "About Techpivo",
      subtitle: "Your trusted destination for technology news, expert reviews, and in-depth analysis since 2024.",
    },
    contentMd: `## Our Mission

At Techpivo, we believe that understanding technology is essential for everyone. Our mission is to demystify complex tech topics and deliver accurate, timely, and actionable information to our readers.

We are committed to journalistic integrity, editorial independence, and the highest standards of accuracy. Every article undergoes rigorous fact-checking and review before publication.

## Editorial Standards

### Fact-Checking

Every story is verified against multiple authoritative sources before publication. Corrections are promptly issued when errors are identified.

### Independence

Our editorial team operates independently of advertisers and sponsors. Sponsored content is clearly labelled to maintain transparency.

### Diversity & Inclusion

We strive to represent diverse perspectives in our coverage and ensure our content is accessible to a global audience.

### Privacy Respect

We minimize data collection and never sell personal information. See our [Privacy Policy](/privacy-policy) for details.

## Our Team

Techpivo is powered by a global network of experienced journalists, technology experts, and content creators who share a passion for innovation. Our team brings decades of combined experience from leading technology publications and the software industry.

## Get in Touch

Have a tip, question, or feedback? We would love to hear from you.

[Contact Us](/contact)`,
    metaTitle: "About Us – Techpivo",
    metaDescription: "Techpivo is your trusted source for breaking tech news, in-depth reviews, and expert analysis on AI, cybersecurity, gadgets, and digital innovation.",
  },
  {
    slug: "contact",
    label: "Contact Us",
    path: "/contact",
    icon: "✉️",
    hero: {
      title: "Contact Us",
      subtitle: "We value your feedback and inquiries. Here is how you can reach the right team.",
    },
    contentMd: `## Reach the Right Team

### 📰 Editorial Inquiries

For story tips, press releases, corrections, or content suggestions.

[editorial@techpivo.com](mailto:editorial@techpivo.com)

### 📢 Advertising & Partnerships

Interested in advertising or partnership opportunities?

[ads@techpivo.com](mailto:ads@techpivo.com)

### 🔒 Privacy & Legal

For privacy-related requests or legal inquiries.

[legal@techpivo.com](mailto:legal@techpivo.com)

### 💬 General Feedback

Something on your mind? We read every message.

[hello@techpivo.com](mailto:hello@techpivo.com)

## Send Us a Message

Fill in the form below and we will get back to you as soon as possible.

You can also write to us at: **Techpivo Media, 123 Innovation Drive, San Francisco, CA 94105**`,
    metaTitle: "Contact Us – Techpivo",
    metaDescription: "Get in touch with Techpivo — editorial, advertising, privacy and general inquiries. We usually respond within 48 hours.",
  },
  {
    slug: "privacy-policy",
    label: "Privacy Policy",
    path: "/privacy-policy",
    icon: "🔒",
    hero: {
      title: "Privacy Policy",
      subtitle: "How Techpivo collects, uses, and protects your personal information.",
      updatedLine: "Last updated: May 27, 2026",
    },
    contentMd: `## 1. Introduction

Techpivo ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.

## 2. Information We Collect

### Personal Data

We may collect personally identifiable information such as your name and email address when you:

- Subscribe to our newsletter
- Submit a contact form
- Leave a comment
- Create an account

### Non-Personal Data

We automatically collect certain information when you visit our site, including browser type, pages visited, referral source, IP address (anonymized), and device type.

## 3. Cookies & Tracking

We use cookies and similar tracking technologies to enhance your experience, analyze traffic, and serve personalized ads. You can control preferences through browser settings.

## 4. Google AdSense

We use Google AdSense to display ads. Google and its partners use cookies to serve personalized ads. You can opt out via [Google's Ads Settings](https://www.google.com/settings/ads).

## 5. How We Use Your Info

- To operate and maintain our website
- To send newsletters (with consent)
- To respond to inquiries
- To analyze usage patterns
- To serve targeted ads
- To comply with legal obligations

## 6. Data Sharing

We do not sell your personal information. We may share data with service providers, advertising partners, and legal authorities when required.

## 7. Data Retention

We retain your personal data only as long as necessary. Newsletter subscribers can unsubscribe anytime, and we will delete your data upon request.

## 8. Your Rights

- Right to Access
- Right to Rectification
- Right to Erasure ("Right to be Forgotten")
- Right to Restrict Processing
- Right to Data Portability
- Right to Object

To exercise these rights, contact us at [privacy@techpivo.com](mailto:privacy@techpivo.com).

## 9. Third-Party Links

Our site may contain links to third-party websites. We are not responsible for their privacy practices.

## 10. Children's Privacy

Our services are not directed to individuals under 13. We do not knowingly collect personal information from children.

## 11. Changes to Policy

We may update this policy. Changes will be posted with an updated "Last updated" date.

## 12. Contact Us

If you have any questions about this Privacy Policy, please reach out.

[privacy@techpivo.com](mailto:privacy@techpivo.com)`,
    metaTitle: "Privacy Policy – Techpivo",
    metaDescription: "Techpivo's Privacy Policy explains how we collect, use, and protect your personal information in compliance with GDPR, CCPA, and Google AdSense policies.",
  },
  {
    slug: "terms-of-use",
    label: "Terms of Use",
    path: "/terms-of-use",
    icon: "📜",
    hero: {
      title: "Terms of Use",
      subtitle: "The rules and guidelines governing your use of Techpivo.",
      updatedLine: "Last updated: May 27, 2026",
    },
    contentMd: `## 1. Acceptance of Terms

By accessing or using Techpivo ("the Site"), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, you must not use the Site.

## 2. Intellectual Property Rights

All content published on Techpivo, including articles, images, graphics, logos, and code, is the property of Techpivo or its content providers. You may not:

- Republish material from Techpivo without attribution
- Sell, rent, or sub-license content from Techpivo
- Reproduce, duplicate, or copy content for commercial purposes
- Redistribute content unless expressly made available

## 3. User Conduct

- Provide accurate information
- Not use the Site for unlawful purposes
- Not disrupt site security
- Not post harmful content
- Respect other users

## 4. User-Generated Content

By submitting comments or content, you grant us a non-exclusive, royalty-free license. We reserve the right to moderate or remove content that violates our policies.

## 5. Affiliate Disclosure

Techpivo participates in affiliate marketing programs. We may earn commissions on purchases through links on our site at no additional cost to you.

## 6. Disclaimer

Information on Techpivo is for general informational purposes only. We make no warranties about completeness, accuracy, or reliability of the information.

## 7. Limitation of Liability

Techpivo shall not be liable for any damages arising from the use or inability to use our Site.

## 8. External Links

Our Site may contain links to third-party websites. We assume no responsibility for their content or practices.

## 9. Changes to Terms

We reserve the right to modify these terms. Changes are effective immediately upon posting.

## 10. Governing Law

These terms shall be governed by the laws of the United States and the State of California.

## 11. Contact

For questions about these Terms of Use, please contact us.

[legal@techpivo.com](mailto:legal@techpivo.com)`,
    metaTitle: "Terms of Use – Techpivo",
    metaDescription: "Techpivo's Terms of Use governing access to and use of our website, content, and services.",
  },
  {
    slug: "cookies-policy",
    label: "Cookies Policy",
    path: "/cookies-policy",
    icon: "🍪",
    hero: {
      title: "Cookies Policy",
      subtitle: "How Techpivo uses cookies and similar tracking technologies to improve your experience.",
      updatedLine: "Last updated: May 27, 2026",
    },
    contentMd: `## What Are Cookies?

Cookies are small text files stored on your device when you visit a website. They help websites remember preferences, understand usage, and deliver relevant content. By continuing to use Techpivo, you consent to cookie use as described here.

## Types of Cookies

- **Essential Cookies** — Required for the website to function correctly.
- **Analytics Cookies** — Help us understand how visitors use the site.
- **Advertising Cookies** — Power personalized ads from our advertising partners.
- **Preference Cookies** — Remember your settings and choices.

## Third-Party Cookies

We work with Google AdSense, Google Analytics, and social media platforms that may set their own cookies.

## Manage Cookies

Control cookies via browser settings, opt out of personalized ads at [Google's Ads Settings](https://www.google.com/settings/ads), or use cookie consent tools.

## GDPR Compliance

For EEA users, we comply with GDPR. We obtain consent before placing non-essential cookies. See our [Privacy Policy](/privacy-policy).

## Updates

We may update this policy to reflect changes in technology, regulation, or data practices.

## Have Questions About Cookies?

If you have any questions about our use of cookies, please contact us.

[Contact Us](/contact)`,
    metaTitle: "Cookies Policy – Techpivo",
    metaDescription: "Techpivo's Cookies Policy explains how we use cookies and similar technologies to enhance your experience, analyze traffic, and serve personalized ads.",
  },
  {
    slug: "disclaimer",
    label: "Disclaimer",
    path: "/disclaimer",
    icon: "⚖️",
    hero: {
      title: "Disclaimer",
      subtitle: "Transparency matters. Everything you need to know about our affiliate relationships, advertising practices, and more.",
      updatedLine: "Last updated: May 27, 2026",
    },
    contentMd: `## Affiliate Disclosure

Techpivo participates in affiliate marketing programs. When you click on links and make a purchase, we may earn a commission at no extra cost to you. This never influences our editorial coverage.

## Advertising Disclosure

Techpivo displays ads from third-party networks including Google AdSense. Ads are clearly distinguished from editorial content. See our [Cookies Policy](/cookies-policy).

## Paid Content

Sponsored content is clearly labeled. Our editorial team maintains full control to ensure it meets our quality standards.

## Payment Processing

Payments are handled by third-party processors. Techpivo does not store or process your full payment details.

## Cookies & Tracking

We use cookies to enhance your experience. By using our site, you consent to cookie use per our [Cookies Policy](/cookies-policy).

## No Professional Advice

Content on Techpivo is for informational purposes only. It does not constitute financial, legal, medical, or technical advice.

## Accuracy

While we strive for accuracy, we make no warranties about completeness or reliability of information. Use at your own risk.

## External Links

Our site may contain links to external websites. Inclusion does not imply endorsement by Techpivo.

## Updates

We reserve the right to update this Disclaimer. Changes are effective immediately upon posting.

## Questions About Our Disclaimers?

Please reach out to us with any questions or concerns.

[Contact Us](/contact)`,
    metaTitle: "Disclaimer – Techpivo",
    metaDescription: "Techpivo's Disclaimer covering affiliate relationships, advertising, paid content, and professional advice.",
  },
  {
    slug: "write-for-us",
    label: "Write For Us",
    path: "/write-for-us",
    icon: "✍️",
    hero: {
      title: "Write For Us",
      subtitle: "Share your expertise with thousands of tech enthusiasts. We welcome contributions from writers, developers, and industry professionals.",
    },
    contentMd: `## Submission Guidelines

### Original Content

All submissions must be original and not published elsewhere. We use plagiarism detection tools.

### Length

Articles should be 1,000–2,500 words. Well-researched pieces with data and examples perform best.

### Tone & Style

Professional yet accessible. Avoid overly promotional language. Write for a knowledgeable but general tech audience.

### Formatting

Use clear headings, bullet points, and short paragraphs. Include at least one featured image (1200x630px).

### Citations

Cite all sources with hyperlinks. Fact-check all claims and statistics before submitting.

### Author Bio

Include a short bio (2-3 sentences) and a headshot. You may include one link to your personal site or LinkedIn.

## Topics We Cover

- Artificial Intelligence
- Machine Learning
- Cybersecurity
- Cloud Computing
- DevOps
- Web Development
- Mobile Apps
- Gadgets & Hardware
- Startups
- Digital Business
- Programming Languages
- Open Source
- Tech Reviews
- Tutorials & How-Tos
- Tech Industry Analysis

## Our Process

1. **Pitch Your Idea** — Send a short outline (2-3 paragraphs) to our editorial team.
2. **Get Approved** — We review your pitch and confirm within 3-5 business days.
3. **Write & Submit** — Write your article following our guidelines and submit via email.
4. **Review & Publish** — Our editors review for quality, accuracy, and SEO. We publish within 7 days of approval.

## Ready to Contribute?

Send your pitch or complete article to our editorial team and we will review it within 3-5 business days.

[Send via Email](mailto:editorial@techpivo.com)

[Contact Us Instead](/contact)

We typically respond within 48 hours. All submissions are treated confidentially.`,
    metaTitle: "Write For Us – Techpivo",
    metaDescription: "Contribute to Techpivo. We welcome guest posts, expert insights, and original research on technology, AI, cybersecurity, and digital innovation.",
  },
  {
    slug: "advertise",
    label: "Advertise",
    path: "/advertise",
    icon: "📢",
    hero: {
      title: "Reach the Tech Audience That Builds, Buys & Decides",
      subtitle: "Developers, IT professionals and gadget buyers read Techpivo every day. Run your campaign on your terms — set your own budget and bid, and track every impression, click and naira spent in real time.",
    },
    contentMd: `🚀 **Launch takes minutes** — campaigns are reviewed and approved within 24 hours.

[Start Your Campaign](/account/ads/new) · [Talk to Our Ads Team](mailto:ads@techpivo.com)

---

## An Audience That Matters

Techpivo serves readers who research before they buy — from hosting and developer tools to laptops and security software.

- **Developers & Programmers** — Tutorials on Python, JavaScript, web development and AI tooling.
- **IT & Network Professionals** — Networking, infrastructure and enterprise technology content.
- **Gadget Buyers** — Reviews, comparisons and buying guides for phones and laptops.
- **Learners & Enthusiasts** — Guides on AI, cybersecurity and career skills in technology.

## Ad Formats for Every Goal

Browse the full inventory of ad spaces — with minimum bids and real-time delivery stats — inside your account.

- **Leaderboard Banner** (728 × 90) — High-visibility banner above article content.
- **Rectangle / Sidebar** (300 × 250) — Mid-page rectangle on articles & categories.
- **In-Content** (336 × 280) — Inline within articles, between paragraphs.
- **Video Ads** — Motion ads on video-capable placements.

[See all ad spaces & minimum bids](/account/ads/new)

## How It Works

Everything happens in your account — from setup to real-time reporting.

1. **Create your campaign** — Sign in, open My Ads and pick an ad space — every placement shows its minimum bid.
2. **Set budget & bid** — Choose CPM or CPC, set your own bid and daily budget, pick your audience and duration.
3. **Upload or AI-generate creative** — Upload a banner or video — or let our AI write your headline and copy in one click.
4. **Approved, live & tracked** — We approve within 24 hours. Watch impressions, clicks, CTR and spend update in real time.

## Why Advertisers Choose Techpivo

- **You set the price** — Auction-based bidding, Google Ads style. You choose your bid and daily budget — there are no fixed rate cards.
- **Only pay for what delivers** — You're charged against actual impressions or clicks, capped at your daily budget. No hidden fees.
- **Real-time analytics** — Live impressions, clicks, CTR and spend on every campaign, with a 14-day performance chart in your account.
- **Measurable results** — See which placements deliver and which creative works — then pause, tweak and resume anytime.
- **Full control** — Pause or resume your campaign whenever you like. Change direction without waiting for us.
- **Reviewed by humans** — Every campaign is reviewed within 24 hours to protect your brand and our readers.

## Every Naira, Tracked

From the moment your campaign goes live, Techpivo records each impression and click on the placement. Your account shows:

- Live impressions, clicks, CTR and spend on every campaign
- A 14-day daily delivery chart so you can spot what works
- Pause / resume controls with no penalty or re-approval
- Campaign status at every step — pending, approved, live, paused

[Create Your First Campaign](/account/ads/new)

## Frequently Asked Questions

**Where do I create a campaign?**
Sign in and go to your account — My Ads. There you'll find the full inventory of ad spaces with their minimum bids, plus the campaign builder. It only takes a few minutes.

**How does bidding work?**
Each ad space has a minimum bid (CPM — per 1,000 impressions — or CPC — per click). You set a bid at or above that floor, plus a daily budget that covers it. Higher bids win more delivery; you only pay for what actually serves, up to your daily cap.

**When do I pay?**
No payment is collected when you submit. Our team reviews your campaign and confirms it before we arrange payment — usually within 24 hours.

**Which currencies do you support?**
We support NGN, USD, EUR, GBP, GHS, KES, ZAR, CAD, AUD and INR. Minimum bids are converted live at published rates when you set up your campaign.

**Can I run video ads?**
Yes. Ad spaces marked VIDEO support video creatives (MP4/WebM, max 30s recommended). Upload the video URL and an optional poster image.

**What targeting options are available?**
You can target by country, device and interest (category). We apply it best-effort when your campaign goes live.

**Can I see my campaign performance?**
Every campaign tracks impressions, clicks, CTR and spend in real time — with a 14-day performance chart in your account, plus Pause/Resume whenever you like.

**What if my creative is rejected?**
We'll send you the reason and you can fix and resubmit. Common issues: low-res images, misleading claims or off-topic content.

## Launch Your Campaign in Minutes

Sign in, pick your ad space, set your budget and bid — our team approves within 24 hours and your results are live from day one.

[Start Your Campaign](/account/ads/new) · [ads@techpivo.com](mailto:ads@techpivo.com)

Already have an account? [Open My Ads](/account/ads)`,
    metaTitle: "Advertise on Techpivo – Self-Serve Tech Ads Marketplace",
    metaDescription: "Reach developers, IT professionals and gadget buyers. Launch a self-serve ad campaign in minutes — set your budget, bid CPM or CPC, and track impressions, clicks and spend in real time.",
  },
  {
    slug: "newsletter",
    label: "Newsletter",
    path: "/newsletter",
    icon: "📬",
    hero: {
      title: "Newsletter",
      subtitle: "Stay ahead of the curve. Get the latest tech news, expert analysis, and exclusive content delivered straight to your inbox every week.",
    },
    contentMd: `## Subscribe to Our Newsletter

Join 8,000+ subscribers who stay informed with Techpivo. No spam, ever. Unsubscribe anytime.

## What to Expect

- **📰 Weekly Digest** — A curated roundup of the week's most important tech stories.
- **🔍 Exclusive Analysis** — In-depth breakdowns of trends and events you won't find anywhere else.
- **🎁 Subscriber Perks** — Early access to content, special offers, and community invites.

## Recent Editions

| Date | Edition |
|------|---------|
| May 20, 2026 | The AI Revolution Accelerates |
| May 13, 2026 | Cybersecurity Threats to Watch |
| May 6, 2026 | Cloud Computing Trends for 2026 |
| April 29, 2026 | Gadget Roundup: Summer Edition |

## What Subscribers Say

> "Techpivo's newsletter is the first thing I read every Monday morning. The curation is outstanding." — Alex K., Software Engineer

> "I've been subscribed for 6 months and the quality has been consistently excellent." — Maria S., Product Manager`,
    metaTitle: "Newsletter – Techpivo",
    metaDescription: "Subscribe to Techpivo's newsletter — the latest tech news, expert analysis, tutorials and exclusive content delivered to your inbox every week.",
  },
];

export const PAGE_SLUGS = SITE_PAGES.map((p) => p.slug);

export function getSitePage(slug: string): SitePageDef | undefined {
  return SITE_PAGES.find((p) => p.slug === slug);
}

export function getSitePageByPath(path: string): SitePageDef | undefined {
  return SITE_PAGES.find((p) => p.path === path);
}