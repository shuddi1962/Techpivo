/**
 * Shared search utilities for the Viral Growth Engine
 */

import { slugify } from "./utils";

export interface SearchResult {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    featured_image: string;
    category: string;
    tags: string[];
    author: string;
    published_at: string;
    reading_time: number;
    views: number;
    score?: number;
}

export interface TrendingItem {
    id: string;
    title: string;
    slug: string;
    score: number;
    views_today: number;
    views_week: number;
    category: string;
    trending_since: string;
    tags: string[];
}

export interface RelatedItem {
    id: string;
    title: string;
    slug: string;
    score: number;
    reason: string;
}

export interface SearchFilters {
    category?: string;
    tags?: string[];
    content_type?: string;
    date_range?: "today" | "week" | "month" | "all";
    sort_by?: "relevance" | "views" | "published" | "quality";
}

export function normalizeQuery(query: string): string {
    return query
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function generateQuerySuggestions(query: string, popularTerms: string[]): string[] {
    const normalized = normalizeQuery(query);
    const suggestions: string[] = [];

    if (!normalized) return suggestions;

    const words = normalized.split(" ");
    
    for (const term of popularTerms) {
        if (term.toLowerCase().includes(normalized) || normalized.includes(term.toLowerCase())) {
            if (!suggestions.includes(term)) {
                suggestions.push(term);
            }
        }
    }

    if (words.length >= 2) {
        const twoWord = `${words[0]} ${words[1]}`;
        suggestions.push(twoWord);
    }

    suggestions.push(normalized);
    return suggestions.slice(0, 5);
}

export function calculateViralScore(
    views: number,
    viewsYesterday: number,
    viewsWeekAgo: number,
    shares: number,
    comments: number,
    ageHours: number
): number {
    if (ageHours === 0) return 100;

    const velocity = viewsYesterday / Math.max(1, ageHours);
    const weekGrowth = viewsWeekAgo > 0 ? views / viewsWeekAgo : 1;
    const engagement = (shares * 2 + comments) / Math.max(1, views);

    const score = Math.min(
        100,
        Math.round(
            (velocity / 100) * 30 +
            Math.min(weekGrowth * 20, 30) +
            engagement * 40 +
            (views > 1000 ? 10 : 0)
        )
    );

    return Math.max(0, score);
}

export function calculateRelatedityScore(
    postTags: string[],
    postContent: string,
    candidateTags: string[],
    candidateContent: string
): number {
    const postTagSet = new Set(postTags.map((t) => t.toLowerCase()));
    const candidateTagSet = new Set(candidateTags.map((t) => t.toLowerCase()));

    let tagOverlap = 0;
    for (const tag of postTagSet) {
        if (candidateTagSet.has(tag)) tagOverlap++;
    }

    const tagScore = postTagSet.size > 0 ? (tagOverlap / postTagSet.size) * 0.4 : 0;
    const keywordScore = calculateKeywordSimilarity(postContent, candidateContent) * 0.6;

    return Math.round((tagScore + keywordScore) * 100);
}

function calculateKeywordSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().replace(/<[^>]*>/g, "").split(/\s+/).filter((w) => w.length > 3));
    const words2 = new Set(text2.toLowerCase().replace(/<[^>]*>/g, "").split(/\s+/).filter((w) => w.length > 3));

    if (words1.size === 0 || words2.size === 0) return 0;

    let common = 0;
    for (const w of words1) {
        if (words2.has(w)) common++;
    }

    return common / Math.sqrt(words1.size * words2.size);
}

export function buildSearchQuery(
    query: string,
    filters: SearchFilters,
    page: number = 1,
    perPage: number = 20
): { query: string; filters: string[]; offset: number; limit: number } {
    const normalized = normalizeQuery(query);
    const filtersStr: string[] = [];

    if (filters.category) filtersStr.push(`category.eq.${filters.category}`);
    if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach((tag) => filtersStr.push(`tags.cs.{${tag}}`));
    }
    if (filters.content_type) filtersStr.push(`content_type.eq.${filters.content_type}`);
    if (filters.date_range && filters.date_range !== "all") {
        const now = new Date();
        let startDate: Date;
        switch (filters.date_range) {
            case "today": startDate = new Date(now.getHours() === 0 ? now : now); break;
            case "week": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case "month": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            default: startDate = new Date(0);
        }
        filtersStr.push(`published_at.gte.${startDate.toISOString()}`);
    }

    return {
        query: normalized,
        filters: filtersStr,
        offset: (page - 1) * perPage,
        limit: perPage,
    };
}

export function extractKeywordsFromQuery(query: string): string[] {
    return normalizeQuery(query)
        .split(" ")
        .filter((w) => w.length >= 2)
        .slice(0, 5);
}

export function shouldShowAd(resultIndex: number): boolean {
    return resultIndex > 0 && resultIndex % 5 === 0;
}