-- =====================================================
-- MIGRATION 058: Community realism — images, real marketable events,
-- learning lessons, forum starter content, RSVP RPC
-- Applied live 2026-08-13 via Management API (batches).
-- Whole file is idempotent / re-runnable.
-- =====================================================

-- ---------- 1. image_url COLUMNS ----------
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE quizzes          ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE polls            ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE forum_categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE learning_paths   ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ---------- 2. SEED IMAGES (existing rows) ----------
UPDATE community_events SET image_url = 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE title LIKE 'Google I/O%' AND (image_url IS NULL OR image_url = '');
UPDATE community_events SET image_url = 'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE title LIKE 'Nairobi AI Meetup%' AND (image_url IS NULL OR image_url = '');
UPDATE community_events SET image_url = 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE title LIKE 'TechPivo Web Hackathon%' AND (image_url IS NULL OR image_url = '');

UPDATE quizzes SET image_url = 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE title LIKE 'JavaScript%' AND (image_url IS NULL OR image_url = '');
UPDATE quizzes SET image_url = 'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE title LIKE 'Cybersecurity%' AND (image_url IS NULL OR image_url = '');

UPDATE polls SET image_url = 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE title LIKE '%programming language%' AND (image_url IS NULL OR image_url = '');
UPDATE polls SET image_url = 'https://images.pexels.com/photos/159306/cloud-storage-google-drive-file-sync-159306.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE title LIKE '%back up%' AND (image_url IS NULL OR image_url = '');

UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'programming' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'cybersecurity' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'ai' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'gaming' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'linux' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'windows' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'hardware' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'career' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'webdev' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'mobile' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'networking' AND image_url IS NULL;
UPDATE forum_categories SET image_url = 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=400' WHERE slug = 'general' AND image_url IS NULL;

UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'python' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/5780122/pexels-photo-5780122.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'python-programming' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'web-development-fundamentals' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'javascript' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'cybersecurity-essentials' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'react' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'machine-learning-python' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/11035539/pexels-photo-11035539.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'nextjs' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'typescript' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'linux-administration' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'react-nextjs-mastery' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'python-data-science' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'cybersecurity' AND image_url IS NULL;
UPDATE learning_paths SET image_url = 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE slug = 'ai-machine-learning' AND image_url IS NULL;

-- ---------- 3. REAL MARKETABLE UPCOMING EVENTS (2026-08-13 today) ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'IFA Berlin 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, max_participants, is_published, image_url)
    VALUES ('IFA Berlin 2026', 'The world''s largest consumer electronics and home appliances trade show. AI-powered devices, laptops, TVs and more with hands-on coverage from TechPivo.', 'conference', 'Berlin, Germany', 'https://www.ifa-berlin.com', '2026-09-04 09:00:00+00', '2026-09-08 18:00:00+00', false, 250000, true, 'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'Samsung Galaxy Unpacked — September 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, max_participants, is_published, image_url)
    VALUES ('Samsung Galaxy Unpacked — September 2026', 'Samsung''s next Galaxy Unpacked showcase: new flagship phones, wearables, and AI features announced live.', 'launch', NULL, 'https://www.samsung.com/global/galaxy/events/', '2026-09-09 16:00:00+00', '2026-09-09 18:00:00+00', true, NULL, true, 'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'Apple iPhone Launch Event — Fall 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, is_published, image_url)
    VALUES ('Apple iPhone Launch Event — Fall 2026', 'Apple''s September keynote expected to unveil the next iPhone generation plus new Apple Watch and software updates.', 'launch', NULL, 'https://www.apple.com/apple-events/', '2026-09-09 17:00:00+00', '2026-09-09 19:00:00+00', true, true, 'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'Meta Connect 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, is_published, image_url)
    VALUES ('Meta Connect 2026', 'Meta''s developer conference focused on AR/VR headsets, AI assistants, and the metaverse roadmap.', 'conference', NULL, 'https://www.meta.com/connect/', '2026-09-30 17:00:00+00', '2026-10-01 21:00:00+00', true, true, 'https://images.pexels.com/photos/1867755/pexels-photo-1867755.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'TechCrunch Disrupt 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, max_participants, is_published, image_url)
    VALUES ('TechCrunch Disrupt 2026', 'Startups, investors and tech leaders come together for pitch competitions, panels and product launches.', 'conference', 'San Francisco, USA', 'https://techcrunch.com/events/tc-disrupt-2026/', '2026-10-13 09:00:00+00', '2026-10-15 20:00:00+00', false, 12000, true, 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'Web Summit Lisbon 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, max_participants, is_published, image_url)
    VALUES ('Web Summit Lisbon 2026', 'One of the world''s largest technology conferences with 70,000+ attendees, startups and speakers.', 'conference', 'Lisbon, Portugal', 'https://websummit.com/', '2026-11-02 09:00:00+00', '2026-11-05 20:00:00+00', false, 70000, true, 'https://images.pexels.com/photos/2833037/pexels-photo-2833037.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'Microsoft Ignite 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, max_participants, is_published, image_url)
    VALUES ('Microsoft Ignite 2026', 'Microsoft''s flagship IT-pro and developer conference: Azure, Microsoft 365, security, and AI platform announcements.', 'conference', 'Chicago, IL, USA', 'https://ignite.microsoft.com', '2026-11-17 08:00:00+00', '2026-11-20 18:00:00+00', false, 50000, true, 'https://images.pexels.com/photos/3184639/pexels-photo-3184639.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'Africa Tech Festival 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, max_participants, is_published, image_url)
    VALUES ('Africa Tech Festival 2026', 'Africa''s largest tech and telecoms event connecting innovators, investors and policymakers across the continent.', 'conference', 'Cape Town, South Africa', 'https://africatechfestival.com/', '2026-11-10 08:00:00+00', '2026-11-13 18:00:00+00', false, 15000, true, 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'AWS re:Invent 2026') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, max_participants, is_published, image_url)
    VALUES ('AWS re:Invent 2026', 'Amazon''s flagship cloud conference: new AWS services, AI/ML announcements, deep-dive sessions and certification opportunities.', 'conference', 'Las Vegas, USA', 'https://reinvent.awsevents.com/', '2026-11-30 15:00:00+00', '2026-12-04 23:00:00+00', false, 60000, true, 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM community_events WHERE title = 'CES 2027') THEN
    INSERT INTO community_events (title, description, event_type, location, url, start_date, end_date, is_virtual, is_published, image_url)
    VALUES ('CES 2027', 'The Consumer Electronics Show returns to Las Vegas — the global stage for innovation where next year''s gadgets are revealed.', 'conference', 'Las Vegas, NV, USA', 'https://www.ces.tech', '2027-01-07 09:00:00+00', '2027-01-10 18:00:00+00', false, true, 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg');
  END IF;
END $$;

-- ---------- 4. LEARNING PATH LESSONS (content for detail pages) ----------
DO $$
DECLARE pid UUID;
BEGIN
  SELECT id INTO pid FROM learning_paths WHERE slug = 'javascript' LIMIT 1;
  IF pid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learning_path_lessons WHERE path_id = pid AND title = 'Variables & Data Types') THEN
    INSERT INTO learning_path_lessons (path_id, title, description, article_slug, sort_order, duration_minutes) VALUES
      (pid, 'Variables & Data Types', 'Learn let, const, var and the core data types in JavaScript: strings, numbers, booleans, arrays and objects.', NULL, 1, 12),
      (pid, 'Functions & Scope', 'Understand function declarations, arrow functions, closures and how scoping works in JavaScript.', NULL, 2, 15),
      (pid, 'Arrays & Objects', 'Master array methods (map, filter, reduce) and working with objects and destructuring.', NULL, 3, 18),
      (pid, 'DOM Manipulation', 'Select and modify elements, handle events, and build interactive pages with the Document Object Model.', NULL, 4, 20),
      (pid, 'Async JavaScript', 'Promises, async/await, and fetching data from APIs with modern JavaScript patterns.', NULL, 5, 22);
    UPDATE learning_paths SET lesson_count = (SELECT count(*) FROM learning_path_lessons WHERE path_id = pid) WHERE id = pid;
  END IF;

  SELECT id INTO pid FROM learning_paths WHERE slug = 'python' LIMIT 1;
  IF pid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learning_path_lessons WHERE path_id = pid AND title = 'Getting Started with Python') THEN
    INSERT INTO learning_path_lessons (path_id, title, description, article_slug, sort_order, duration_minutes) VALUES
      (pid, 'Getting Started with Python', 'Install Python, run your first script and understand variables, comments and basic output.', NULL, 1, 10),
      (pid, 'Control Flow', 'if/else statements, for and while loops, and writing programs that make decisions.', NULL, 2, 15),
      (pid, 'Functions & Modules', 'Write reusable functions, import standard library modules and organise code into files.', NULL, 3, 18),
      (pid, 'Lists, Tuples & Dicts', 'Python''s core data structures: lists, tuples, dictionaries and sets with practical examples.', NULL, 4, 20),
      (pid, 'File Handling & Errors', 'Read and write files, handle exceptions gracefully, and write robust Python programs.', NULL, 5, 18);
    UPDATE learning_paths SET lesson_count = (SELECT count(*) FROM learning_path_lessons WHERE path_id = pid) WHERE id = pid;
  END IF;

  SELECT id INTO pid FROM learning_paths WHERE slug = 'cybersecurity-essentials' LIMIT 1;
  IF pid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learning_path_lessons WHERE path_id = pid AND title = 'Security Fundamentals') THEN
    INSERT INTO learning_path_lessons (path_id, title, description, article_slug, sort_order, duration_minutes) VALUES
      (pid, 'Security Fundamentals', 'The CIA triad (confidentiality, integrity, availability), threat models and security goals.', NULL, 1, 12),
      (pid, 'Network Security Basics', 'Firewalls, VLANs, VPNs and how traffic is protected across networks.', NULL, 2, 18),
      (pid, 'Authentication & Passwords', 'Hashing, salting, multi-factor authentication and password security best practices.', NULL, 3, 15),
      (pid, 'Web Application Security', 'OWASP Top 10: injection, XSS, CSRF and how to defend modern web apps.', NULL, 4, 22),
      (pid, 'Incident Response', 'Detect, contain, eradicate and recover from security incidents with a structured playbook.', NULL, 5, 20);
    UPDATE learning_paths SET lesson_count = (SELECT count(*) FROM learning_path_lessons WHERE path_id = pid) WHERE id = pid;
  END IF;

  SELECT id INTO pid FROM learning_paths WHERE slug = 'react' LIMIT 1;
  IF pid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learning_path_lessons WHERE path_id = pid AND title = 'React Components') THEN
    INSERT INTO learning_path_lessons (path_id, title, description, article_slug, sort_order, duration_minutes) VALUES
      (pid, 'React Components', 'Build reusable function components, props and the component model.', NULL, 1, 15),
      (pid, 'State & Events', 'useState, handling user events, and keeping UI in sync with application state.', NULL, 2, 18),
      (pid, 'Effects & Data Fetching', 'useEffect for side effects, fetching data from APIs and handling loading states.', NULL, 3, 20),
      (pid, 'React Router & Navigation', 'Multi-page experiences with React Router: routes, links, and dynamic segments.', NULL, 4, 16),
      (pid, 'Context & Custom Hooks', 'Share state across components with Context and extract logic into custom hooks.', NULL, 5, 22);
    UPDATE learning_paths SET lesson_count = (SELECT count(*) FROM learning_path_lessons WHERE path_id = pid) WHERE id = pid;
  END IF;

  SELECT id INTO pid FROM learning_paths WHERE slug = 'nextjs' LIMIT 1;
  IF pid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learning_path_lessons WHERE path_id = pid AND title = 'Pages & Routing') THEN
    INSERT INTO learning_path_lessons (path_id, title, description, article_slug, sort_order, duration_minutes) VALUES
      (pid, 'Pages & Routing', 'App Router fundamentals: pages, layouts, links and navigation in Next.js.', NULL, 1, 14),
      (pid, 'Server vs Client Components', 'Understand the server/client component model and when to use each.', NULL, 2, 16),
      (pid, 'Data Fetching', 'Server-side fetching, static generation and revalidation patterns.', NULL, 3, 20),
      (pid, 'API Routes', 'Build backend endpoints with Route Handlers, middleware and validation.', NULL, 4, 18),
      (pid, 'Deploy to Production', 'Environment variables, build optimizations and deploying Next.js to Vercel.', NULL, 5, 16);
    UPDATE learning_paths SET lesson_count = (SELECT count(*) FROM learning_path_lessons WHERE path_id = pid) WHERE id = pid;
  END IF;

  SELECT id INTO pid FROM learning_paths WHERE slug = 'linux-administration' LIMIT 1;
  IF pid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learning_path_lessons WHERE path_id = pid AND title = 'The Command Line') THEN
    INSERT INTO learning_path_lessons (path_id, title, description, article_slug, sort_order, duration_minutes) VALUES
      (pid, 'The Command Line', 'Navigate the shell: files, permissions, pipes and the tools you use daily.', NULL, 1, 16),
      (pid, 'Users & Permissions', 'Manage users, groups, sudo and file permission models.', NULL, 2, 18),
      (pid, 'Processes & Services', 'Monitor processes, manage services with systemd, and schedule tasks with cron.', NULL, 3, 20),
      (pid, 'Networking Essentials', 'Configure network interfaces, DNS, SSH and firewalls like ufw/nftables.', NULL, 4, 22),
      (pid, 'Security Hardening', 'Harden a Linux server: updates, fail2ban, SSH keys and audit basics.', NULL, 5, 24);
    UPDATE learning_paths SET lesson_count = (SELECT count(*) FROM learning_path_lessons WHERE path_id = pid) WHERE id = pid;
  END IF;
END $$;

-- ---------- 5. FORUM STARTER TOPICS + REPLIES (make community alive) ----------
DO $$
DECLARE prog_id UUID; cyber_id UUID; webdev_id UUID; linux_id UUID; p1 UUID; p2 UUID; p3 UUID; p4 UUID;
BEGIN
  SELECT id INTO prog_id FROM forum_categories WHERE slug = 'programming' LIMIT 1;
  SELECT id INTO cyber_id FROM forum_categories WHERE slug = 'cybersecurity' LIMIT 1;
  SELECT id INTO webdev_id FROM forum_categories WHERE slug = 'webdev' LIMIT 1;
  SELECT id INTO linux_id FROM forum_categories WHERE slug = 'linux' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM forum_posts WHERE title = 'What JavaScript framework should a beginner learn in 2026?') AND prog_id IS NOT NULL THEN
    INSERT INTO forum_posts (category_id, author_id, title, content, tags, reply_count, vote_count, view_count, is_pinned, is_solved, last_reply_at)
    VALUES (prog_id, NULL, 'What JavaScript framework should a beginner learn in 2026?',
      'I''m comfortable with HTML, CSS and vanilla JavaScript. With the frontend landscape changing fast, should I start with React, Vue, or Svelte? I''d love to hear what the community recommends and why.',
      '["javascript","react","vue","career"]', 2, 3, 24, true, false, now() - interval '6 hours')
    RETURNING id INTO p1;

    INSERT INTO forum_replies (post_id, author_id, content, vote_count, is_accepted) VALUES
      (p1, NULL, 'React is still the safest choice for job opportunities and ecosystem size. Pair it with Next.js once you know the basics. Vue is a gentler learning curve though — great if you want results fast.', 2, true),
      (p1, NULL, 'Honestly, learning the fundamentals deeply matters more than the framework. Pick React for community support, but build things, not tutorials.', 1, false);
    UPDATE forum_posts SET last_reply_at = now() - interval '4 hours' WHERE id = p1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM forum_posts WHERE title = 'Best password manager for a small team?') AND cyber_id IS NOT NULL THEN
    INSERT INTO forum_posts (category_id, author_id, title, content, tags, reply_count, vote_count, view_count, is_pinned, is_solved, last_reply_at)
    VALUES (cyber_id, NULL, 'Best password manager for a small team?',
      'We''re a 6-person dev team and currently sharing passwords in a spreadsheet (I know!). We need something with shared vaults, MFA and good browser extensions. Recommendations and budget-friendly options welcome.',
      '["security","passwords","teams"]', 1, 2, 18, false, false, now() - interval '1 day')
    RETURNING id INTO p2;

    INSERT INTO forum_replies (post_id, author_id, content, vote_count, is_accepted) VALUES
      (p2, NULL, 'Bitwarden is open-source, affordable and has proper shared collections + MFA. For 6 people the Teams plan is very reasonable. 1Password is smoother but pricier. Avoid storing work creds in a spreadsheet — you already know why!', 2, false);
    UPDATE forum_posts SET last_reply_at = now() - interval '20 hours' WHERE id = p2;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM forum_posts WHERE title = 'How do you structure CSS for a large Next.js project?') AND webdev_id IS NOT NULL THEN
    INSERT INTO forum_posts (category_id, author_id, title, content, tags, reply_count, vote_count, view_count, is_pinned, is_solved, last_reply_at)
    VALUES (webdev_id, NULL, 'How do you structure CSS for a large Next.js project?',
      'With Tailwind + CSS modules + a few global styles, things get messy after 20 components. What conventions do you use to keep styles maintainable as the project grows?',
      '["nextjs","css","tailwind"]', 1, 1, 12, false, false, now() - interval '2 days')
    RETURNING id INTO p3;

    INSERT INTO forum_replies (post_id, author_id, content, vote_count, is_accepted) VALUES
      (p3, NULL, 'Establish a design-token-first approach: define spacing, color and radius tokens once, then components consume tokens, not raw values. Keep page-level styles with the page, and shared UI in a component library.', 1, false);
    UPDATE forum_posts SET last_reply_at = now() - interval '1 day' WHERE id = p3;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM forum_posts WHERE title = 'Showcase: I finally automated my whole home setup') AND linux_id IS NOT NULL THEN
    INSERT INTO forum_posts (category_id, author_id, title, content, tags, reply_count, vote_count, view_count, is_pinned, is_solved, last_reply_at)
    VALUES (linux_id, NULL, 'Showcase: I finally automated my whole home setup',
      'After months of tinkering I''ve got Home Assistant driving lights, climate, and security cams with a Pi cluster as the backbone. Happy to answer questions for anyone just getting started!',
      '["homelab","automation","linux"]', 1, 8, 47, false, false, now() - interval '3 days')
    RETURNING id INTO p4;

    INSERT INTO forum_replies (post_id, author_id, content, vote_count, is_accepted) VALUES
      (p4, NULL, 'That''s awesome. How are you handling remote access securely — WireGuard tunnel, reverse proxy, or something else?', 2, false);
    UPDATE forum_posts SET last_reply_at = now() - interval '2 days' WHERE id = p4;
  END IF;

  -- Maintain category post_count
  UPDATE forum_categories SET post_count = (SELECT count(*) FROM forum_posts WHERE category_id = forum_categories.id);
END $$;

-- ---------- 6. RSVP RPC (SECURITY DEFINER — RLS would block participant updates) ----------
CREATE OR REPLACE FUNCTION increment_event_rsvps(event_id UUID, delta INT DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE community_events
  SET current_participants = GREATEST(0, COALESCE(current_participants, 0) + delta)
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_event_rsvps(UUID, INT) TO anon, authenticated, service_role;

-- ---------- 7. increment_reply_count ALSO REFRESHES CATEGORY post_count ----------
CREATE OR REPLACE FUNCTION increment_reply_count(target_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_posts SET reply_count = COALESCE(reply_count, 0) + 1, last_reply_at = now() WHERE id = target_post_id;
  UPDATE forum_categories fc SET post_count = (SELECT count(*) FROM forum_posts fp WHERE fp.category_id = fc.id)
  WHERE fc.id = (SELECT category_id FROM forum_posts WHERE id = target_post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_reply_count(UUID) TO anon, authenticated, service_role;
