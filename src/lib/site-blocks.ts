export interface SiteBlockDef {
  blockKey: string;
  label: string;
  description: string;
  mode: "banner" | "intro" | "text" | "links";
  contentMd: string;
}

export const SITE_BLOCKS: SiteBlockDef[] = [
  {
    blockKey: "header-banner",
    label: "Header Announcement Banner",
    description: "Shown as a strip at the very top of every page, above the header. Keep it to one short line.",
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