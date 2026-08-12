export interface SiteBlockStyle {
  variant?: "ticker" | "blinkbg" | "solid";
  label?: string | null;
  blink?: boolean;
  speed?: "slow" | "normal" | "fast";
  align?: "left" | "center" | "right";
  bg?: string | null;
  text?: string | null;
}

export interface SiteBlockDef {
  blockKey: string;
  label: string;
  description: string;
  mode: "banner" | "intro" | "text" | "links";
  contentMd: string;
}

export const SITE_BLOCK_STYLE_DEFAULTS: SiteBlockStyle = {
  variant: "ticker",
  label: "NEW",
  blink: true,
  speed: "normal",
  align: "left",
  bg: null,
  text: null,
};

const VARIANTS = ["ticker", "blinkbg", "solid"];
const SPEEDS = ["slow", "normal", "fast"];
const ALIGNS = ["left", "center", "right"];
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

/** Coerce any raw value (DB jsonb / API body) into a safe SiteBlockStyle. */
export function normalizeBlockStyle(raw: unknown): SiteBlockStyle {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...SITE_BLOCK_STYLE_DEFAULTS };
  const s = raw as Record<string, any>;
  const out: SiteBlockStyle = { ...SITE_BLOCK_STYLE_DEFAULTS };
  if (typeof s.variant === "string" && VARIANTS.includes(s.variant)) out.variant = s.variant as SiteBlockStyle["variant"];
  if (typeof s.label === "string") out.label = s.label.slice(0, 24);
  if (s.label === null || s.label === "") out.label = null;
  if (typeof s.blink === "boolean") out.blink = s.blink;
  if (typeof s.speed === "string" && SPEEDS.includes(s.speed)) out.speed = s.speed as SiteBlockStyle["speed"];
  if (typeof s.align === "string" && ALIGNS.includes(s.align)) out.align = s.align as SiteBlockStyle["align"];
  if (typeof s.bg === "string" && HEX_RE.test(s.bg.trim())) out.bg = s.bg.trim();
  if (typeof s.text === "string" && HEX_RE.test(s.text.trim())) out.text = s.text.trim();
  return out;
}

/** Strip a style object down to DB-safe JSON (empty → null). */
export function sanitizeBlockStyle(v: unknown): Record<string, unknown> | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) return null;
  const s = v as Record<string, any>;
  const out: Record<string, unknown> = {};
  if (typeof s.variant === "string" && VARIANTS.includes(s.variant)) out.variant = s.variant;
  if (typeof s.label === "string") out.label = s.label.slice(0, 24);
  if (typeof s.blink === "boolean") out.blink = s.blink;
  if (typeof s.speed === "string" && SPEEDS.includes(s.speed)) out.speed = s.speed;
  if (typeof s.align === "string" && ALIGNS.includes(s.align)) out.align = s.align;
  if (typeof s.bg === "string" && HEX_RE.test(s.bg.trim())) out.bg = s.bg.trim();
  if (typeof s.text === "string" && HEX_RE.test(s.text.trim())) out.text = s.text.trim();
  return Object.keys(out).length ? out : null;
}

export const SITE_BLOCKS: SiteBlockDef[] = [
  {
    blockKey: "header-banner",
    label: "Header Announcement Banner",
    description: "Shown at the very top of every page, above the header. Scrolls like a news ticker — style options control the look.",
    mode: "banner",
    contentMd: "",
  },
  {
    blockKey: "home-intro",
    label: "Homepage Intro",
    description: "Shown on the homepage between the hero slider and the category tabs. Add a welcome message, highlights, or an image.",
    mode: "intro",
    contentMd: "",
  },
  {
    blockKey: "footer-about",
    label: "Footer About Text",
    description: "Short description of Techpivo shown in the footer link columns.",
    mode: "text",
    contentMd:
      "Techpivo delivers expert tech news, programming tutorials, cybersecurity guides, AI insights, gadget reviews and developer tools.",
  },
  {
    blockKey: "footer-links",
    label: "Footer Quick Links",
    description: "A list of links shown in the footer. One link per line: [Label](https://example.com)",
    mode: "links",
    contentMd:
      "[About Us](/about)\n[Contact](/contact)\n[Advertise](/advertise)\n[Write For Us](/write-for-us)\n[Newsletter](/newsletter)",
  },
];

export const BLOCK_KEYS = SITE_BLOCKS.map((b) => b.blockKey);

export function getSiteBlock(blockKey: string): SiteBlockDef | undefined {
  return SITE_BLOCKS.find((b) => b.blockKey === blockKey);
}