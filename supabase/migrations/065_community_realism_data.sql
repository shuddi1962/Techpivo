-- 065_community_realism_data.sql
-- Make the seeded community feel REAL: realistic vote rows (up/down), views,
-- topic followers, reply counts consistency. Idempotent + whole-file re-runnable.
-- forum_votes is UNIQUE (user_id, post_id) / (user_id, reply_id) — one vote
-- per user per target (matches UI toggle-off). Applied live 2026-08-15.

-- ── 1. Realistic post votes (ON CONFLICT on the real unique keys) ─────
INSERT INTO forum_votes (user_id, post_id, reply_id, vote_type, created_at)
SELECT v.user_id, v.post_id, NULL, v.vote_type, v.created_at
FROM (VALUES
  -- "Best password manager for a small team?" (0ee3790b)
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, '0ee3790b-794d-4923-8763-6bd259ce7bc9'::uuid, 1,  now() - interval '12 days'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, '0ee3790b-794d-4923-8763-6bd259ce7bc9'::uuid, 1,  now() - interval '11 days'),
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, '0ee3790b-794d-4923-8763-6bd259ce7bc9'::uuid, 1,  now() - interval '10 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, '0ee3790b-794d-4923-8763-6bd259ce7bc9'::uuid, -1, now() - interval '8 days'),
  -- "Showcase: I finally automated my whole home setup" (74c58608) — popular
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, '74c58608-81cc-4b28-a3ed-0603d6d57564'::uuid, 1, now() - interval '6 days'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, '74c58608-81cc-4b28-a3ed-0603d6d57564'::uuid, 1, now() - interval '6 days'),
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, '74c58608-81cc-4b28-a3ed-0603d6d57564'::uuid, 1, now() - interval '5 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, '74c58608-81cc-4b28-a3ed-0603d6d57564'::uuid, 1, now() - interval '5 days'),
  -- "What JavaScript framework should a beginner learn in 2026?" (8c48d8dd)
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, '8c48d8dd-6d9e-42c6-8387-6e012d6dcbff'::uuid, 1, now() - interval '4 days'),
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, '8c48d8dd-6d9e-42c6-8387-6e012d6dcbff'::uuid, 1, now() - interval '3 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, '8c48d8dd-6d9e-42c6-8387-6e012d6dcbff'::uuid, 1, now() - interval '3 days'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, '8c48d8dd-6d9e-42c6-8387-6e012d6dcbff'::uuid, -1, now() - interval '2 days'),
  -- "How do you structure CSS for a large Next.js project?" (745469c2)
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, '745469c2-eea8-4d9f-8ec6-0486481843ab'::uuid, 1, now() - interval '3 days'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, '745469c2-eea8-4d9f-8ec6-0486481843ab'::uuid, 1, now() - interval '2 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, '745469c2-eea8-4d9f-8ec6-0486481843ab'::uuid, -1, now() - interval '2 days'),
  -- "GPT vs. Claude: Which AI Model Excels at Coding Tasks?" (ba098c64)
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, 'ba098c64-913f-4e22-a787-bb0488e72dd4'::uuid, 1, now() - interval '1 day'),
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, 'ba098c64-913f-4e22-a787-bb0488e72dd4'::uuid, 1, now() - interval '1 day'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, 'ba098c64-913f-4e22-a787-bb0488e72dd4'::uuid, 1, now() - interval '1 day'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, 'ba098c64-913f-4e22-a787-bb0488e72dd4'::uuid, -1, now() - interval '12 hours')
) AS v(user_id, post_id, vote_type, created_at)
ON CONFLICT (user_id, post_id) DO NOTHING;

-- ── 2. Realistic reply votes ──────────────────────────────────────────
INSERT INTO forum_votes (user_id, post_id, reply_id, vote_type, created_at)
SELECT v.user_id, NULL, v.reply_id, v.vote_type, v.created_at
FROM (VALUES
  -- React answer (821683a5)
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, '821683a5-2fe2-4877-b9d3-a08457ae4c54'::uuid, 1, now() - interval '3 days'),
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, '821683a5-2fe2-4877-b9d3-a08457ae4c54'::uuid, 1, now() - interval '3 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, '821683a5-2fe2-4877-b9d3-a08457ae4c54'::uuid, 1, now() - interval '2 days'),
  -- fundamentals reply (85ea5d14)
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, '85ea5d14-ec87-42a9-8567-54380ba252f2'::uuid, 1, now() - interval '2 days'),
  -- Bitwarden answer (d46fbad0) — most helpful
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, 'd46fbad0-87f2-405b-bfe8-177c22e3136b'::uuid, 1, now() - interval '9 days'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, 'd46fbad0-87f2-405b-bfe8-177c22e3136b'::uuid, 1, now() - interval '8 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, 'd46fbad0-87f2-405b-bfe8-177c22e3136b'::uuid, 1, now() - interval '7 days'),
  -- CSS tokens answer (7e790088)
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, '7e790088-3232-489a-a329-07eee8592260'::uuid, 1, now() - interval '2 days'),
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, '7e790088-3232-489a-a329-07eee8592260'::uuid, 1, now() - interval '1 day'),
  -- homelab remote-access reply (f24cfecc)
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, 'f24cfecc-fe80-4d81-80eb-fc96d9c6bc17'::uuid, 1, now() - interval '5 days')
) AS v(user_id, reply_id, vote_type, created_at)
ON CONFLICT (user_id, reply_id) DO NOTHING;

-- ── 3. Recompute vote counts from real rows (canonical RPC path) ──────
SELECT public.update_post_vote_count(id) FROM forum_posts;
SELECT public.update_reply_vote_count(id) FROM forum_replies;

-- ── 4. Realistic view counts (increment_views adds on top later) ──────
UPDATE forum_posts SET view_count = CASE id
  WHEN '0ee3790b-794d-4923-8763-6bd259ce7bc9' THEN 148
  WHEN '74c58608-81cc-4b28-a3ed-0603d6d57564' THEN 231
  WHEN '8c48d8dd-6d9e-42c6-8387-6e012d6dcbff' THEN 312
  WHEN '745469c2-eea8-4d9f-8ec6-0486481843ab' THEN 97
  WHEN 'ba098c64-913f-4e22-a787-bb0488e72dd4' THEN 402
  ELSE view_count END
WHERE id IN ('0ee3790b-794d-4923-8763-6bd259ce7bc9','74c58608-81cc-4b28-a3ed-0603d6d57564','8c48d8dd-6d9e-42c6-8387-6e012d6dcbff','745469c2-eea8-4d9f-8ec6-0486481843ab','ba098c64-913f-4e22-a787-bb0488e72dd4');

-- ── 5. Topic followers (PK user_id+topic_id — ON CONFLICT safe) ───────
INSERT INTO topic_follows (user_id, topic_id, created_at)
SELECT f.user_id, f.topic_id, f.created_at
FROM (VALUES
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, '4b855360-d363-4373-bac8-c149f627b60b'::uuid, now() - interval '20 days'),
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, '7664e3a8-9bff-4761-86da-651be0bb5015'::uuid, now() - interval '18 days'),
  ('3916aa7d-197c-47f8-bdf3-cd6b6f910a37'::uuid, 'a99d67ea-a93d-4eda-9c25-e8dedfdc1f5a'::uuid, now() - interval '15 days'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, 'a99d67ea-a93d-4eda-9c25-e8dedfdc1f5a'::uuid, now() - interval '22 days'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, 'dccdcc24-0225-49bf-99f4-359f9866c4ea'::uuid, now() - interval '19 days'),
  ('9ebcf7eb-96a2-44a2-b193-7ffe870dbda5'::uuid, 'ee7d0fa3-bd0e-493c-b3df-f9bc13c5ec55'::uuid, now() - interval '12 days'),
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, 'f71a08f9-f59e-4cbf-9a0a-9192e29dd71a'::uuid, now() - interval '25 days'),
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, '4b855360-d363-4373-bac8-c149f627b60b'::uuid, now() - interval '21 days'),
  ('fe1ede95-0a79-44e4-9af7-167a127fe362'::uuid, 'a658ab58-051f-4e60-9b3f-4c98869c46dd'::uuid, now() - interval '14 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, 'e377e8ba-1c01-455d-8666-ef6daa4471ca'::uuid, now() - interval '16 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, 'b712916e-cc01-4d44-b29f-a3ea4d63f368'::uuid, now() - interval '13 days'),
  ('22eb4839-2b6f-4486-b27c-845865f580b7'::uuid, '50165563-3a0f-4cc6-a859-35a90e39a2b0'::uuid, now() - interval '10 days')
) AS f(user_id, topic_id, created_at)
ON CONFLICT (user_id, topic_id) DO NOTHING;

-- ── 6. last_reply_at consistency (drives forum sorting) ───────────────
UPDATE forum_posts p
SET last_reply_at = sub.max_at
FROM (SELECT post_id, MAX(created_at) AS max_at FROM forum_replies GROUP BY post_id) sub
WHERE sub.post_id = p.id AND p.last_reply_at IS DISTINCT FROM sub.max_at;
