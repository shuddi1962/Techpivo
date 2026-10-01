/**
 * TechPivo Intelligence — template-based social drafts (pure, no AI calls).
 * Drafts are assembled from STORED opportunity evidence (keyword, gaps,
 * coverage, community question). They are starting points for the editor —
 * never auto-published, never containing invented statistics.
 */

export interface SocialDrafts {
  hook: string;
  x_post: string;
  linkedin_post: string;
  discussion_prompt: string;
  poll_question: string;
  short_video_script: string[];
  cta: string;
}

export function buildSocialDrafts(input: {
  keyword: string;
  intent?: string | null;
  gapSummary?: string | null;
  communityQuestion?: string | null;
}): SocialDrafts {
  const kw = input.keyword.trim();
  const gap = (input.gapSummary ?? "").trim().slice(0, 140);
  const cta = "Read the full breakdown on TechPivo — link in bio.";
  return {
    hook: `Everyone searches "${kw}" — but most answers miss the point. Here's what actually matters:`,
    x_post: `"${kw}" — what most guides get wrong (and what we tested). Thread below. ${cta}`,
    linkedin_post: `We looked into "${kw}"${gap ? ` — ${gap}` : ""}. Our take: original testing beats rewritten summaries. Full analysis on TechPivo. What's your experience?`,
    discussion_prompt: input.communityQuestion ?? `What is the biggest problem you have with "${kw}"? Tell us — your answers shape our research.`,
    poll_question: `What's hardest about "${kw}": getting started, finding current info, or trusting the answers?`,
    short_video_script: [
      `Hook (0-3s): "${kw}" — stop reading generic guides.`,
      "Point (3-20s): the one gap every top result has.",
      `Proof (20-40s): what TechPivo tested and found.`,
      `CTA (40-60s): ${cta}`,
    ],
    cta,
  };
}
