function titleTokens(value: string): string[] {
  const tokens = value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 3);
  const grams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) grams.push(`${tokens[i]} ${tokens[i + 1]}`);
  if (grams.length === 0 && tokens.length > 0) grams.push(tokens[0]);
  return grams;
}

/** Jaccard similarity between two title token sets (0..1). */
export function titleSimilarity(a: string, b: string): number {
  const ga = titleTokens(a);
  const gb = titleTokens(b);
  if (ga.length === 0 || gb.length === 0) return 0;
  const union = new Set([...ga, ...gb]);
  const inter = new Set(ga.filter(g => gb.includes(g)));
  return inter.size / union.size;
}
