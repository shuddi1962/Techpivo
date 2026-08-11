export type ToolCategory =
  | "developer"
  | "security"
  | "network"
  | "seo"
  | "image"
  | "pdf"
  | "calculator"
  | "ai";

export const TOOL_CATEGORIES: { value: ToolCategory; label: string }[] = [
  { value: "developer", label: "Developer" },
  { value: "security", label: "Security" },
  { value: "network", label: "Network" },
  { value: "seo", label: "SEO" },
  { value: "image", label: "Image" },
  { value: "pdf", label: "PDF" },
  { value: "calculator", label: "Calculators" },
  { value: "ai", label: "AI Writers" },
];

export const TOOL_CATEGORY_LABEL: Record<ToolCategory, string> = {
  developer: "Developer",
  security: "Security",
  network: "Network",
  seo: "SEO",
  image: "Image",
  pdf: "PDF",
  calculator: "Calculators",
  ai: "AI Writers",
};

export interface ToolMeta {
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  category: ToolCategory;
  keywords: string[];
  faq: { q: string; a: string }[];
  related: string[];
}

export const TOOL_META: Record<string, ToolMeta> = {
  "json-formatter": {
    slug: "json-formatter",
    name: "JSON Formatter & Validator",
    description: "Format, minify and validate JSON with syntax error details and document stats.",
    longDescription:
      "Paste any JSON payload to beautify it with 2/4-space indentation, minify it for transport, or validate it and get precise line/column error positions. Runs 100% in your browser — nothing is uploaded.",
    category: "developer",
    keywords: ["json formatter", "json beautify", "json validator", "json minify", "prettify json", "format json online"],
    faq: [
      { q: "Is my JSON data uploaded anywhere?", a: "No. The formatter runs entirely in your browser using the native JSON engine. Your data never leaves your device." },
      { q: "Why does it say my JSON is invalid?", a: "The validator uses JavaScript's strict JSON parser. Common causes: trailing commas, single quotes, comments, or missing quotes around keys." },
      { q: "Can I format large JSON files?", a: "Yes, as long as your browser tab can hold the file in memory. Files up to tens of MB are handled easily." },
    ],
    related: ["csv-json", "regex-tester", "base64-encoder", "jwt-decoder"],
  },
  "csv-json": {
    slug: "csv-json",
    name: "CSV to JSON Converter",
    description: "Convert CSV to JSON and JSON to CSV with delimiter and quote support.",
    longDescription:
      "Convert comma/semicolon/tab-separated data into clean JSON arrays, or turn JSON back into CSV. Handles quoted fields and custom delimiters.",
    category: "developer",
    keywords: ["csv to json", "json to csv", "csv converter", "csv parser", "convert csv", "csv to json online"],
    faq: [
      { q: "Does it handle quoted fields with commas?", a: "Yes. The parser respects double-quoted fields, so commas inside quotes are preserved correctly." },
      { q: "Can I change the delimiter?", a: "Yes — choose comma, semicolon, tab, or pipe before converting." },
    ],
    related: ["json-formatter", "text-case", "regex-tester"],
  },
  "regex-tester": {
    slug: "regex-tester",
    name: "Regex Tester",
    description: "Test regular expressions with live match highlighting, groups and flags.",
    longDescription:
      "Write a pattern, pick flags (g, i, m, s), and see every match highlighted live with capture groups and a full match list. Includes a replace preview.",
    category: "developer",
    keywords: ["regex tester", "regex online", "regular expression tester", "regex builder", "regex matcher", "test regex"],
    faq: [
      { q: "Which regex flavor is used?", a: "JavaScript (ECMAScript) regex, including lookahead, lookbehind and named groups." },
      { q: "Why is my pattern not matching?", a: "Make sure the flags match your intent — 'g' for all matches, 'i' for case-insensitive, 'm' for multi-line." },
    ],
    related: ["json-formatter", "text-case", "word-counter"],
  },
  "base64-encoder": {
    slug: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode text or files to Base64 with URL-safe and Unicode support.",
    longDescription:
      "Encode any text or binary file to Base64 right in your browser. Handles Unicode correctly and offers URL-safe output for JWTs and query strings.",
    category: "developer",
    keywords: ["base64 encode", "base64 encoder", "base64 converter", "encode base64", "base64 string", "base64url"],
    faq: [
      { q: "Does it work with emoji and Unicode?", a: "Yes. Text is encoded from UTF-8 bytes, so emoji and non-Latin scripts are preserved." },
      { q: "What is URL-safe Base64?", a: "It replaces + and / with - and _ so the output can be used safely in URLs and JWTs." },
    ],
    related: ["base64-decoder", "jwt-decoder", "url-encoder", "hash-generator"],
  },
  "base64-decoder": {
    slug: "base64-decoder",
    name: "Base64 Decoder",
    description: "Decode Base64 strings back to text or files with Unicode support.",
    longDescription:
      "Decode Base64 strings (including URL-safe variants) back to readable text, or download the decoded result as a binary file.",
    category: "developer",
    keywords: ["base64 decode", "base64 decoder", "decode base64", "base64 to text", "base64 file"],
    faq: [
      { q: "Why do I see garbled characters?", a: "The decoded bytes may not be valid UTF-8. Switch the output to binary and download the file instead." },
      { q: "Can it decode URL-safe Base64?", a: "Yes, both standard and URL-safe alphabets are accepted automatically." },
    ],
    related: ["base64-encoder", "jwt-decoder", "url-decoder"],
  },
  "url-encoder": {
    slug: "url-encoder",
    name: "URL Encoder",
    description: "Percent-encode URL strings for query parameters and paths.",
    longDescription:
      "Encode a URL or query string so it can be safely embedded in links, redirects and API calls. Choose between encodeURIComponent and encodeURI behavior.",
    category: "developer",
    keywords: ["url encode", "url encoder", "percent encoding", "encode url online", "url encoding tool"],
    faq: [
      { q: "What is the difference between the two modes?", a: "Component mode encodes everything including / and ? (for query values); standard mode preserves URL structure characters." },
    ],
    related: ["url-decoder", "base64-encoder", "slug-generator"],
  },
  "url-decoder": {
    slug: "url-decoder",
    name: "URL Decoder",
    description: "Decode percent-encoded URLs and query strings instantly.",
    longDescription:
      "Decode percent-encoded URLs, query strings and form payloads back to readable text with one click.",
    category: "developer",
    keywords: ["url decode", "url decoder", "percent decoding", "decode url online", "urldecode"],
    faq: [{ q: "What does it handle?", a: "All percent-encoded sequences (%20, %E2%82%AC, etc.) plus plus-sign decoding for query values." }],
    related: ["url-encoder", "base64-decoder"],
  },
  "hash-generator": {
    slug: "hash-generator",
    name: "Hash Generator",
    description: "Generate SHA-1, SHA-256, SHA-384 and SHA-512 hashes from text or files.",
    longDescription:
      "Compute cryptographic hashes from text or any file using the Web Crypto API. Ideal for checksums, integrity checks and password verification workflows.",
    category: "developer",
    keywords: ["sha256 generator", "hash generator", "sha512", "sha1 hash", "checksum generator", "hash online"],
    faq: [
      { q: "Why is there no MD5?", a: "Browsers do not expose MD5 in the Web Crypto API, and MD5 is cryptographically broken. SHA-256 is the recommended replacement." },
      { q: "Are hashes computed locally?", a: "Yes — everything runs in your browser via Web Crypto, so data never leaves your device." },
    ],
    related: ["uuid-generator", "random-string", "password-generator"],
  },
  "uuid-generator": {
    slug: "uuid-generator",
    name: "UUID Generator",
    description: "Generate RFC 4122 v4 UUIDs in bulk with one-click copy.",
    longDescription:
      "Generate cryptographically-random version 4 UUIDs — one at a time or up to 100 at once — for IDs, fixtures, request tracing and database keys.",
    category: "developer",
    keywords: ["uuid generator", "uuid v4", "guid generator", "generate uuid", "uuid online", "random uuid"],
    faq: [
      { q: "Are the UUIDs truly random?", a: "Yes. They are generated with crypto.randomUUID() (v4), backed by the operating system's cryptographically secure RNG." },
    ],
    related: ["random-string", "random-number", "hash-generator"],
  },
  "jwt-decoder": {
    slug: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode JWT headers and payloads locally — no data leaves your browser.",
    longDescription:
      "Paste any JWT to instantly decode its header and payload into readable JSON with an expiry/validity check. Safe for inspecting real tokens because decoding happens locally.",
    category: "developer",
    keywords: ["jwt decoder", "decode jwt", "jwt.io alternative", "jwt token decoder", "json web token decode"],
    faq: [
      { q: "Do you see my token?", a: "No. Decoding is 100% local — the token never leaves your browser." },
      { q: "Does it verify the signature?", a: "No. It only decodes header and payload. Signature verification requires the secret, which the tool deliberately never asks for." },
    ],
    related: ["base64-decoder", "json-formatter", "base64-encoder"],
  },
  "unix-timestamp": {
    slug: "unix-timestamp",
    name: "Unix Timestamp Converter",
    description: "Convert Unix timestamps to human dates and back, in any timezone.",
    longDescription:
      "Convert Unix seconds/milliseconds to local dates and ISO strings, or generate the current timestamp with one click. Includes 'now' buttons for seconds and milliseconds.",
    category: "developer",
    keywords: ["unix timestamp", "timestamp converter", "epoch converter", "unix time", "epoch time online"],
    faq: [{ q: "Seconds or milliseconds?", a: "Both are detected automatically — timestamps below 100 billion are treated as seconds, otherwise as milliseconds." }],
    related: ["date-calculator", "cron-generator"],
  },
  "cron-generator": {
    slug: "cron-generator",
    name: "Cron Generator",
    description: "Build cron expressions from presets or custom fields with validation.",
    longDescription:
      "Create cron expressions for Vercel, Supabase, Linux and CI systems. Pick a common preset or set minute/hour/day-of-month/month/day-of-week fields manually.",
    category: "developer",
    keywords: ["cron generator", "cron expression", "crontab generator", "cron builder", "cron schedule"],
    faq: [{ q: "Is this cron valid for Supabase/Vercel?", a: "Yes — the standard 5-field cron format is generated, which Supabase pg_cron, Vercel Cron and Linux crontab all accept." }],
    related: ["unix-timestamp", "date-calculator"],
  },
  "lorem-ipsum": {
    slug: "lorem-ipsum",
    name: "Lorem Ipsum Generator",
    description: "Generate lorem ipsum paragraphs, sentences and words for mockups.",
    longDescription:
      "Generate placeholder text for designs, layouts and dummy content — choose paragraphs, sentences or words, copy with one click.",
    category: "developer",
    keywords: ["lorem ipsum", "lorem generator", "placeholder text", "dummy text generator"],
    faq: [{ q: "Is lorem ipsum needed for SEO?", a: "No — never use placeholder text on live pages. It is for design mockups and wireframes only." }],
    related: ["word-counter", "text-case"],
  },
  "markdown-preview": {
    slug: "markdown-preview",
    name: "Markdown Preview",
    description: "Write Markdown and preview rendered HTML side by side.",
    longDescription:
      "A lightweight, safe Markdown renderer with headings, lists, links, code, tables, blockquotes and images. Perfect for README drafts and article drafts.",
    category: "developer",
    keywords: ["markdown preview", "markdown editor", "md preview", "markdown online"],
    faq: [{ q: "Is the renderer safe?", a: "Yes — raw HTML is escaped and links are sanitized, so previews cannot execute scripts." }],
    related: ["word-counter", "json-formatter"],
  },
  "text-case": {
    slug: "text-case",
    name: "Text Case Converter",
    description: "Convert text to uppercase, lowercase, title, camelCase, snake_case and more.",
    longDescription:
      "Transform any text between 10 case styles: upper, lower, title, sentence, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE and dot.case.",
    category: "developer",
    keywords: ["case converter", "text case", "camel case converter", "snake case", "kebab case", "title case"],
    faq: [{ q: "Can I convert variable names?", a: "Yes — camelCase, PascalCase, snake_case and kebab-case modes are built for exactly that." }],
    related: ["slug-generator", "word-counter", "regex-tester"],
  },
  "slug-generator": {
    slug: "slug-generator",
    name: "Slug Generator",
    description: "Turn any title or phrase into a clean URL slug.",
    longDescription:
      "Generate SEO-friendly URL slugs from headlines, product names or sentences — lowercase, hyphenated, diacritics stripped.",
    category: "developer",
    keywords: ["slug generator", "url slug", "permalink generator", "seo slug", "make slug"],
    faq: [{ q: "What gets stripped?", a: "Accents (é→e), punctuation and symbols are removed; spaces become hyphens." }],
    related: ["text-case", "meta-tag-generator", "url-encoder"],
  },
  "password-generator": {
    slug: "password-generator",
    name: "Password Generator",
    description: "Generate strong random passwords with a live strength meter.",
    longDescription:
      "Create secure passwords with configurable length and character sets (upper, lower, digits, symbols, exclude-ambiguous). A live entropy-based strength meter shows how strong each result is.",
    category: "security",
    keywords: ["password generator", "random password", "strong password generator", "secure password"],
    faq: [
      { q: "How is the password created?", a: "Using crypto.getRandomValues(), the same cryptographically secure source browsers use for TLS." },
      { q: "Are passwords stored?", a: "No. They are generated locally and never sent or stored anywhere." },
    ],
    related: ["password-strength", "random-string", "hash-generator"],
  },
  "password-strength": {
    slug: "password-strength",
    name: "Password Strength Checker",
    description: "Analyze password strength with entropy, character sets and crack-time estimates.",
    longDescription:
      "Paste a password to see its length, character-set diversity, estimated entropy and an honest crack-time estimate for offline attacks.",
    category: "security",
    keywords: ["password strength", "password checker", "password entropy", "is my password strong"],
    faq: [{ q: "Should I paste real passwords here?", a: "This tool runs 100% in your browser and nothing is sent anywhere — but as a rule, never paste real credentials into any tool." }],
    related: ["password-generator", "email-validator"],
  },
  "random-string": {
    slug: "random-string",
    name: "Random String Generator",
    description: "Generate random strings with custom length and character sets.",
    longDescription:
      "Generate tokens, codes and test strings from letters, digits or custom charsets, in bulk, using a cryptographically secure RNG.",
    category: "security",
    keywords: ["random string generator", "random token", "random text generator", "alphanumeric generator"],
    faq: [{ q: "What is it useful for?", a: "API test tokens, coupon codes, invite codes, salt values and fixture data." }],
    related: ["random-number", "uuid-generator", "password-generator"],
  },
  "random-number": {
    slug: "random-number",
    name: "Random Number Generator",
    description: "Generate random numbers between any range, one or many at a time.",
    longDescription:
      "Generate cryptographically-random integers (and optional decimals) between a minimum and maximum — single values or a whole list.",
    category: "security",
    keywords: ["random number generator", "random integer", "random number between", "random picker"],
    faq: [{ q: "Can it pick a winner?", a: "Yes — set the range to your list size (1 to N) and generate once to pick a random index." }],
    related: ["random-string", "uuid-generator"],
  },
  "email-validator": {
    slug: "email-validator",
    name: "Email Validator",
    description: "Validate email format, spot typos and check disposable domains.",
    longDescription:
      "Check an email address against a strict format rule, flag common disposable/temporary domains, and warn about frequent typos like gmail.con.",
    category: "security",
    keywords: ["email validator", "email checker", "validate email", "email format check"],
    faq: [{ q: "Does it verify the mailbox exists?", a: "No — format, typos and disposable domains are checked locally. Verifying a mailbox actually exists requires a server-side SMTP check." }],
    related: ["password-strength", "text-case"],
  },
  "credit-card-validator": {
    slug: "credit-card-validator",
    name: "Credit Card Validator",
    description: "Validate card numbers with the Luhn algorithm and detect the brand.",
    longDescription:
      "Check any card number against the Luhn checksum and detect the brand (Visa, Mastercard, Amex, Discover, JCB, Diners). Format validation only — no card data ever leaves the browser.",
    category: "security",
    keywords: ["credit card validator", "luhn algorithm", "card number checker", "credit card format"],
    faq: [{ q: "Is this a real check?", a: "It validates structure via the Luhn algorithm — it does not and cannot know whether a card is active or has funds." }],
    related: ["random-string", "email-validator"],
  },
  "ip-lookup": {
    slug: "ip-lookup",
    name: "IP Address Analyzer",
    description: "Analyze IPv4/IPv6 addresses — class, range, public/private, subnet details.",
    longDescription:
      "Paste any IPv4 or IPv6 address to see its type (public/private/loopback/link-local), class, binary representation, and CIDR network details. No server involved — everything is computed locally.",
    category: "network",
    keywords: ["ip lookup", "ip address analyzer", "ipv4 ipv6", "ipv4 classes", "what is my ip"],
    faq: [{ q: "Does it geolocate me?", a: "No — IP analysis is purely mathematical. Geolocation requires a third-party database and is not included." }],
    related: ["dns-checker"],
  },
  "dns-checker": {
    slug: "dns-checker",
    name: "DNS Lookup",
    description: "Look up A, AAAA, MX, TXT, NS, CNAME and SOA records via Cloudflare DNS.",
    longDescription:
      "Query real DNS records (A, AAAA, MX, TXT, NS, CNAME, SOA) for any domain using Cloudflare's public DNS-over-HTTPS service. Results include TTLs and answer counts.",
    category: "network",
    keywords: ["dns lookup", "dns checker", "mx lookup", "dns records", "check dns", "txt records"],
    faq: [
      { q: "How fresh are the results?", a: "Queries go to Cloudflare's live DNS-over-HTTPS endpoint (1.1.1.1), so results reflect current authoritative data." },
      { q: "Does it work for any domain?", a: "Yes — any publicly resolvable domain works. Private/internal DNS names will not." },
    ],
    related: ["ip-lookup"],
  },
  "meta-tag-generator": {
    slug: "meta-tag-generator",
    name: "Meta Tag Generator",
    description: "Generate title, description, Open Graph and Twitter meta tags with preview.",
    longDescription:
      "Fill in your page title, description and URL to instantly generate complete meta tags including Open Graph and Twitter Card tags, ready to copy into your HTML head.",
    category: "seo",
    keywords: ["meta tag generator", "meta tags", "seo meta generator", "og tags", "open graph generator"],
    faq: [{ q: "What title length is best?", a: "Keep titles under 60 characters and descriptions under 160 so Google does not truncate them." }],
    related: ["serp-preview", "schema-generator", "slug-generator"],
  },
  "schema-generator": {
    slug: "schema-generator",
    name: "Schema Markup Generator",
    description: "Generate JSON-LD structured data for Article, FAQ, Product, Organization and Event.",
    longDescription:
      "Build valid JSON-LD schema through simple forms — Article, FAQPage, Product, Organization, Event — and copy the output for your page head. Validated against the JSON format.",
    category: "seo",
    keywords: ["schema generator", "json ld generator", "structured data generator", "faq schema", "schema markup"],
    faq: [{ q: "Is the output valid JSON-LD?", a: "Yes — output is generated as strict JSON and can be pasted directly into a script tag or validated at validator.schema.org." }],
    related: ["meta-tag-generator", "json-formatter"],
  },
  "robots-txt-generator": {
    slug: "robots-txt-generator",
    name: "Robots.txt Generator",
    description: "Generate robots.txt rules with user agents, paths and sitemap lines.",
    longDescription:
      "Build a clean robots.txt file: pick user agents, add Allow/Disallow rules, set a sitemap URL — with live preview and copy.",
    category: "seo",
    keywords: ["robots txt generator", "robots.txt", "robots generator", "disallow generator"],
    faq: [{ q: "What does Disallow / mean?", a: "It blocks the selected user agent from crawling the whole site. Most sites use selective rules instead." }],
    related: ["sitemap-generator", "meta-tag-generator"],
  },
  "sitemap-generator": {
    slug: "sitemap-generator",
    name: "Sitemap Generator",
    description: "Generate an XML sitemap from a list of URLs with priority and frequency.",
    longDescription:
      "Paste your URLs (one per line) to generate a valid XML sitemap with lastmod, changefreq and priority options — ready for Search Console.",
    category: "seo",
    keywords: ["sitemap generator", "xml sitemap", "sitemap.xml", "sitemap online"],
    faq: [{ q: "Do I need a sitemap?", a: "Yes — sitemaps help Google discover and prioritize your pages, especially new or deep content." }],
    related: ["robots-txt-generator", "slug-generator"],
  },
  "keyword-density": {
    slug: "keyword-density",
    name: "Keyword Density Checker",
    description: "Find top keywords in text with counts and density percentages.",
    longDescription:
      "Paste any text to see its most frequent keywords, count, and density percentage (words vs occurrences), with a stop-word filter.",
    category: "seo",
    keywords: ["keyword density checker", "keyword density", "keyword frequency", "keyword analyzer"],
    faq: [{ q: "What density should I target?", a: "There is no magic number. Use keywords naturally; forcing density above ~2-3% reads poorly and can hurt quality." }],
    related: ["word-counter", "readability-checker", "meta-tag-generator"],
  },
  "readability-checker": {
    slug: "readability-checker",
    name: "Readability Checker",
    description: "Score text with Flesch Reading Ease and grade-level formulas.",
    longDescription:
      "Analyze any text for Flesch Reading Ease, Flesch-Kincaid Grade Level, sentence/word averages and passive-voice hints — the same stats editors use.",
    category: "seo",
    keywords: ["readability checker", "flesch reading ease", "readability score", "reading level checker"],
    faq: [{ q: "What is a good score?", a: "Flesch Reading Ease of 60-70 (plain English) suits a general tech audience; tutorials can target 70+." }],
    related: ["word-counter", "keyword-density"],
  },
  "serp-preview": {
    slug: "serp-preview",
    name: "SERP Preview",
    description: "Preview how your title and description appear in Google search results.",
    longDescription:
      "See exactly how your page will render on Google — title, URL and description with realistic truncation at 60/160 characters.",
    category: "seo",
    keywords: ["serp preview", "google serp", "search result preview", "title preview", "meta preview"],
    faq: [{ q: "Why is my title cut off?", a: "Google truncates titles around 60 characters (600px). Shorten it or move the brand to the end." }],
    related: ["meta-tag-generator", "keyword-density"],
  },
  "word-counter": {
    slug: "word-counter",
    name: "Word Counter",
    description: "Count words, characters, sentences, paragraphs and reading time.",
    longDescription:
      "Count words, characters (with/without spaces), sentences, paragraphs, unique words and estimated reading time as you type.",
    category: "seo",
    keywords: ["word counter", "character counter", "word count", "character count", "reading time"],
    faq: [{ q: "Is the reading time estimate accurate?", a: "It uses the standard 200 words-per-minute average, which is a solid baseline." }],
    related: ["readability-checker", "keyword-density", "text-case"],
  },
  "image-compressor": {
    slug: "image-compressor",
    name: "Image Compressor",
    description: "Compress and resize images in the browser with quality control.",
    longDescription:
      "Drag in a PNG/JPG/WebP and download a smaller compressed version. Set output quality, resize by percentage or exact dimensions — all in your browser.",
    category: "image",
    keywords: ["image compressor", "compress image", "image optimizer", "resize image online"],
    faq: [
      { q: "Where does my image go?", a: "Nowhere — compression happens entirely in your browser via the Canvas API." },
      { q: "What quality should I use?", a: "80-85% is a good balance between size and quality for photos; 90%+ for graphics that need crisp text." },
    ],
    related: ["image-resizer", "webp-converter"],
  },
  "image-resizer": {
    slug: "image-resizer",
    name: "Image Resizer",
    description: "Resize images to exact dimensions or percentage, with format selection.",
    longDescription:
      "Resize any image to exact pixel dimensions or a percentage, keep or ignore aspect ratio, and export as PNG, JPG or WebP.",
    category: "image",
    keywords: ["image resizer", "resize image", "resize image online", "image dimensions"],
    faq: [{ q: "Can I resize without losing quality?", a: "Upscaling is not recommended (quality loss); downscaling is safe. Keep aspect ratio on for photos." }],
    related: ["image-compressor", "webp-converter"],
  },
  "webp-converter": {
    slug: "webp-converter",
    name: "WebP Converter",
    description: "Convert PNG and JPG images to WebP with quality slider.",
    longDescription:
      "Convert images to the modern WebP format with a quality slider and instant size comparison. WebP is ~25-35% smaller than JPG at equal quality.",
    category: "image",
    keywords: ["webp converter", "convert to webp", "webp online", "jpg to webp", "png to webp"],
    faq: [{ q: "Why WebP?", a: "WebP is supported by all modern browsers and typically 25-35% smaller than JPG at the same quality — a fast Core Web Vitals win." }],
    related: ["image-compressor", "image-resizer"],
  },
  "image-upscaler": {
    slug: "image-upscaler",
    name: "Image Upscaler",
    description: "Upscale images 2-8x in your browser with no upload.",
    longDescription:
      "Enlarge images 2x, 3x, 4x or 8x using high-quality multi-step canvas resampling. Best for logos, screenshots and illustrations — export as PNG, JPG or WebP, entirely on your device.",
    category: "image",
    keywords: ["image upscaler", "upscale image", "enlarge image", "image enhancer", "2x upscale", "4k upscale"],
    faq: [
      { q: "Does upscaling improve quality?", a: "It enlarges pixels with smooth interpolation — edges look cleaner, but genuine detail that doesn't exist in the source cannot be created." },
      { q: "Is there a size limit?", a: "Results are capped at 8192px or 80 megapixels to keep your browser responsive." },
      { q: "Is AI needed for better results?", a: "AI super-resolution can add detail that basic upscaling cannot, but it requires a server. This tool is instant, private and free." },
    ],
    related: ["image-compressor", "image-resizer", "webp-converter"],
  },
  "color-picker": {
    slug: "color-picker",
    name: "Color Picker & Palette",
    description: "Pick colors, convert HEX/RGB/HSL and generate shade palettes.",
    longDescription:
      "Pick any color with a live picker, convert between HEX, RGB and HSL, and generate a full shade palette with contrast checks against white and black text.",
    category: "image",
    keywords: ["color picker", "color converter", "hex to rgb", "color palette generator", "hsl converter"],
    faq: [{ q: "How do I use the palette?", a: "Pick a base color — the tool instantly generates 10 lighter/darker shades, each with copyable hex codes." }],
    related: ["image-compressor"],
  },
  "merge-pdf": {
    slug: "merge-pdf",
    name: "Merge PDF",
    description: "Combine multiple PDF files into one, in your browser.",
    longDescription:
      "Drag in two or more PDFs, reorder them, and download a single merged PDF. Files are processed locally with pdf-lib — they never leave your device.",
    category: "pdf",
    keywords: ["merge pdf", "combine pdf", "join pdf", "pdf merger online"],
    faq: [{ q: "Is it really private?", a: "Yes — merging runs in your browser using the pdf-lib library. Your documents are never uploaded." }],
    related: ["split-pdf", "compress-pdf"],
  },
  "split-pdf": {
    slug: "split-pdf",
    name: "Split PDF",
    description: "Extract pages or page ranges from a PDF file.",
    longDescription:
      "Extract a single page or a range of pages (e.g. 1-5, 8, 10-12) from any PDF and download the result as a new PDF — all locally in your browser.",
    category: "pdf",
    keywords: ["split pdf", "extract pdf pages", "pdf page extractor", "split pdf online"],
    faq: [{ q: "Can I extract non-contiguous pages?", a: "Yes — enter comma-separated ranges like '1-3, 7, 9-10' and only those pages are kept." }],
    related: ["merge-pdf", "compress-pdf"],
  },
  "compress-pdf": {
    slug: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce PDF file size by re-encoding pages in your browser.",
    longDescription:
      "Compress a PDF by re-encoding its pages (images downsampled, streams flattened) and download the smaller version. Great before emailing or uploading large documents.",
    category: "pdf",
    keywords: ["compress pdf", "pdf compressor", "reduce pdf size", "shrink pdf online"],
    faq: [{ q: "How much smaller will it get?", a: "Depends on content — scan-heavy PDFs can shrink 40-70%; text-only PDFs barely shrink since text streams are already compact." }],
    related: ["merge-pdf", "split-pdf"],
  },
  "percentage-calculator": {
    slug: "percentage-calculator",
    name: "Percentage Calculator",
    description: "Percentage of, percentage change and percentage increase/decrease.",
    longDescription:
      "Three calculations in one: X% of Y, percentage change between two values, and add/subtract a percentage from a value.",
    category: "calculator",
    keywords: ["percentage calculator", "percent calculator", "percentage change", "calculate percentage"],
    faq: [{ q: "How is percentage change calculated?", a: "(New - Old) / Old × 100 — negative results mean a decrease." }],
    related: ["loan-calculator", "bmi-calculator"],
  },
  "loan-calculator": {
    slug: "loan-calculator",
    name: "Loan Calculator",
    description: "Monthly payment, total interest and full amortization schedule.",
    longDescription:
      "Calculate monthly payments for any loan (amount, annual rate, term) with a full amortization table showing principal vs interest each month.",
    category: "calculator",
    keywords: ["loan calculator", "mortgage calculator", "amortization calculator", "monthly payment"],
    faq: [{ q: "What formula is used?", a: "The standard amortization formula (PMT). The table shows running balance and cumulative interest month by month." }],
    related: ["percentage-calculator", "date-calculator"],
  },
  "unit-converter": {
    slug: "unit-converter",
    name: "Unit Converter",
    description: "Length, weight, temperature, data, area, volume, time and speed conversion.",
    longDescription:
      "Convert between 8 unit families — length (m, km, ft, mi…), weight, temperature (°C/°F/K), data (B, KB, MB, GB…), area, volume, time and speed — with instant results.",
    category: "calculator",
    keywords: ["unit converter", "length converter", "kg to lbs", "cm to inches", "mb to gb", "temperature converter"],
    faq: [{ q: "Which units are included?", a: "Eight families with 5-12 units each — the conversions people actually look up, from cm↔inch to MB↔GB." }],
    related: ["percentage-calculator", "base-converter"],
  },
  "age-calculator": {
    slug: "age-calculator",
    name: "Age Calculator",
    description: "Exact age in years, months, days, plus days until your next birthday.",
    longDescription:
      "Enter a date of birth to get the precise age in years, months and days, along with total days alive and a countdown to the next birthday.",
    category: "calculator",
    keywords: ["age calculator", "how old am i", "birthday calculator", "age in days"],
    faq: [{ q: "Is it timezone-aware?", a: "It uses your local timezone for 'today', which is what you want for birthdays." }],
    related: ["date-calculator", "percentage-calculator"],
  },
  "date-calculator": {
    slug: "date-calculator",
    name: "Date Calculator",
    description: "Days between dates, add/subtract days from a date, weekday lookup.",
    longDescription:
      "Three date utilities in one: exact days between two dates, add or subtract days/months/years from a date, and find the weekday of any date.",
    category: "calculator",
    keywords: ["date calculator", "days between dates", "add days to date", "date difference", "what day is"],
    faq: [{ q: "Are both dates counted?", a: "The result is the number of full days between the dates (end − start), excluding the start day itself." }],
    related: ["age-calculator", "unix-timestamp"],
  },
  "base-converter": {
    slug: "base-converter",
    name: "Base Converter",
    description: "Convert between decimal, hex, binary and octal with ASCII view.",
    longDescription:
      "Convert numbers between decimal, hexadecimal, binary and octal instantly, plus an ASCII decoder for any hex or binary byte string.",
    category: "calculator",
    keywords: ["base converter", "hex to binary", "decimal to hex", "binary to decimal", "ascii converter"],
    faq: [{ q: "What about negative or large numbers?", a: "Values are processed as unsigned integers up to 2^53-1 — fine for everyday conversions." }],
    related: ["unit-converter", "random-number"],
  },
  "bmi-calculator": {
    slug: "bmi-calculator",
    name: "BMI Calculator",
    description: "Body Mass Index with healthy-range guidance.",
    longDescription:
      "Calculate your BMI from height and weight (metric or imperial) and see which of the five WHO categories it falls into, with a healthy-weight range for your height.",
    category: "calculator",
    keywords: ["bmi calculator", "body mass index", "bmi", "healthy weight"],
    faq: [{ q: "Is BMI accurate for athletes?", a: "BMI does not distinguish muscle from fat, so very muscular people may show as overweight. Use it as a rough guide only." }],
    related: ["percentage-calculator", "unit-converter"],
  },
  "excel-to-pdf": {
    slug: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert .xlsx, .xls, .csv and .tsv spreadsheets to a clean PDF.",
    longDescription:
      "Upload a spreadsheet and instantly get a formatted PDF with column-aware widths, header emphasis and automatic pagination. Supports multiple sheets (pick one) and runs 100% in your browser — your data never leaves your device.",
    category: "pdf",
    keywords: ["excel to pdf", "xlsx to pdf", "csv to pdf", "spreadsheet to pdf", "convert excel to pdf"],
    faq: [
      { q: "Is my spreadsheet uploaded?", a: "No. The conversion runs entirely in your browser using local file processing — nothing is sent to any server." },
      { q: "Which formats are supported?", a: ".xlsx, .xls, .csv and .tsv. Files with multiple sheets let you pick which sheet to convert." },
      { q: "Will large sheets be cut off?", a: "No — the PDF generator paginates automatically and widens landscape pages for sheets with many columns." },
    ],
    related: ["pdf-to-excel", "merge-pdf", "split-pdf"],
  },
  "pdf-to-excel": {
    slug: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Extract text from a PDF into table rows and export as .xlsx.",
    longDescription:
      "Extract text content from up to 200 pages of a PDF, group it into rows and columns by position, preview the result, and download a real .xlsx workbook — all locally.",
    category: "pdf",
    keywords: ["pdf to excel", "pdf to xlsx", "extract pdf text", "pdf table to excel", "convert pdf to spreadsheet"],
    faq: [
      { q: "Why does my scanned PDF show no text?", a: "Scanned documents are images. This tool extracts embedded text only; scanned PDFs need OCR software." },
      { q: "Will column layout be perfect?", a: "Text is grouped by position, which works well for tables and reports but may need minor cleanup in Excel for complex layouts." },
      { q: "What limits exist?", a: "The first 200 pages are processed and everything runs locally — no uploads." },
    ],
    related: ["excel-to-pdf", "split-pdf", "compress-pdf"],
  },
  "currency-converter": {
    slug: "currency-converter",
    name: "Currency Converter",
    description: "Live exchange rates for 160+ world currencies, auto-detecting your country.",
    longDescription:
      "Convert between 160+ world currencies with live daily rates — no key, no limits, no uploads. Your country is detected automatically and rates are cached so the converter works even offline.",
    category: "calculator",
    keywords: ["currency converter", "exchange rate", "usd to ngn", "live currency calculator", "money converter", "currency exchange"],
    faq: [
      { q: "Where do the rates come from?", a: "Live market rates updated daily from open exchange-rate data providers. No API key is needed and nothing is uploaded." },
      { q: "Can I convert to my local currency automatically?", a: "Yes — the tool detects your country from your IP and pre-selects your currency. You can switch manually anytime." },
      { q: "Why might my rate differ from my bank?", a: "Banks add margins and fees on top of mid-market rates. Use this for estimates and confirm final amounts with your provider." },
    ],
    related: ["loan-calculator", "unit-converter", "percentage-calculator"],
  },
  "ai-headline-generator": {
    slug: "ai-headline-generator",
    name: "Headline Generator",
    description: "Generate 10 SEO headline formulas from any topic instantly.",
    longDescription:
      "Enter a topic and instantly get 10 proven headline formulas (how-to, listicle, question, benefit, number-led, etc.) — rewritten for your topic in one click.",
    category: "ai",
    keywords: ["headline generator", "title generator", "blog title generator", "headline ideas"],
    faq: [{ q: "Are these AI-generated?", a: "Yes — headlines are produced by a formula-based generation engine that adapts proven headline patterns to your topic." }],
    related: ["ai-meta-description", "meta-tag-generator", "serp-preview"],
  },
  "ai-meta-description": {
    slug: "ai-meta-description",
    name: "Meta Description Generator",
    description: "Write 3 SEO meta descriptions from your content, ≤160 characters.",
    longDescription:
      "Paste your content or topic to get three ready-to-use meta descriptions, each kept within Google's 160-character limit with live counters.",
    category: "ai",
    keywords: ["meta description generator", "meta description writer", "seo description", "write meta description"],
    faq: [{ q: "Do I still need to edit them?", a: "Treat outputs as drafts — add your unique selling point or brand before publishing for best CTR." }],
    related: ["ai-headline-generator", "keyword-density", "meta-tag-generator"],
  },
  "ai-faq-generator": {
    slug: "ai-faq-generator",
    name: "FAQ Generator",
    description: "Generate 5 FAQ questions and answers from any topic.",
    longDescription:
      "Generate five natural question-and-answer pairs for any topic — useful for FAQ sections, FAQPage schema and article snippets.",
    category: "ai",
    keywords: ["faq generator", "faq questions", "faq schema", "questions and answers generator"],
    faq: [{ q: "Can I use these in FAQPage schema?", a: "Yes — pair the output with the Schema Generator's FAQ mode for a full FAQPage JSON-LD block." }],
    related: ["schema-generator", "ai-headline-generator"],
  },
  "ai-prompt-generator": {
    slug: "ai-prompt-generator",
    name: "Prompt Generator",
    description: "Build structured AI prompts with role, task, format and constraints.",
    longDescription:
      "Assemble high-quality prompts for ChatGPT, Claude, Gemini or any LLM — choose a role, describe the task, set constraints and output format, and copy the finished prompt.",
    category: "ai",
    keywords: ["prompt generator", "ai prompt builder", "prompt template", "prompt engineering"],
    faq: [{ q: "What makes a good prompt?", a: "Clear role, specific task, explicit constraints, desired output format, and an example when possible — this tool structures all of those." }],
    related: ["ai-headline-generator", "ai-text-humanizer"],
  },
  "ai-text-humanizer": {
    slug: "ai-text-humanizer",
    name: "Text Humanizer",
    description: "Rewrite AI-sounding text: remove clichés, vary openings, add contractions.",
    longDescription:
      "Paste AI-generated text and apply real linguistic transforms — strip filler phrases, replace robotic openers, use contractions, and get a before/after word count.",
    category: "ai",
    keywords: ["text humanizer", "ai text rewriter", "humanize ai text", "ai writing fix"],
    faq: [{ q: "Is this a magic detector-beater?", a: "No — it applies genuine style improvements (filler removal, sentence variety). Good writing is about clarity, not fooling detectors." }],
    related: ["word-counter", "text-case", "ai-prompt-generator"],
  },
};

export const TOOL_SLUGS = Object.keys(TOOL_META);

export const TOOL_BY_CATEGORY = TOOL_SLUGS.reduce<Record<ToolCategory, ToolMeta[]>>(
  (acc, slug) => {
    const meta = TOOL_META[slug];
    acc[meta.category].push(meta);
    return acc;
  },
  { developer: [], security: [], network: [], seo: [], image: [], pdf: [], calculator: [], ai: [] }
);

export function getToolMeta(slug: string): ToolMeta | undefined {
  return TOOL_META[slug];
}
