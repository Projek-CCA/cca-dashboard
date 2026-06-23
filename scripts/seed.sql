-- CCA Dashboard Seed Data
-- Run this in your Supabase SQL Editor AFTER applying supabase/schema.sql
-- WARNING: This creates sample data for development purposes.
-- Delete or modify before production use.

-- ============================================================
-- STEP 1: Create an admin user via Supabase Auth first.
-- Then insert their profile here.
-- ============================================================

-- Create clients (from existing mock data)
INSERT INTO clients (name, company_name, hub_name)
VALUES
  ('Munif Isa', 'Sixma', 'Munif Isa Hub'),
  ('UCMI', 'UCMI', 'UCMI Hub')
ON CONFLICT DO NOTHING;

-- Sample content items (from existing mock data)
-- NOTE: Replace id values with actual gen_random_uuid() output if you need stable references
INSERT INTO content_items (slug, title, client_id, category, status, post_date, duration, brief, hook, caption)
SELECT * FROM (VALUES
  ('content-scaling-mistakes', '3 mistakes business owners make before scaling', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Educational Content', 'Pending Client Approval'::content_status, '2026-01-12'::date, '01:48', 'A short educational video explaining the common mistakes business owners make before scaling their team and operations.', 'Pending', 'Draft needed after client approval.'),
  ('new-year-clarity', 'New year business clarity post', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Thought Leadership', 'Posted'::content_status, '2026-01-01'::date, NULL, 'New year clarity reminder.', NULL, NULL),
  ('founder-focus', 'Founder lesson: focus before scale', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Educational Content', 'Posted'::content_status, '2026-01-03'::date, NULL, 'Founder lesson.', NULL, NULL),
  ('teams-momentum', 'Why most teams lose momentum', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Educational Content', 'Pending Client Approval'::content_status, '2026-01-05'::date, NULL, 'Momentum lesson.', NULL, NULL),
  ('office-broll', 'Content shoot: office B-roll', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Shoot', 'Shoot'::content_status, '2026-01-06'::date, NULL, 'Office B-roll capture.', NULL, NULL),
  ('sales-process', 'Sales process mini lesson', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Educational Content', 'Editing'::content_status, '2026-01-08'::date, NULL, 'Sales process lesson.', NULL, NULL),
  ('simple-sop-win', 'Client story: simple SOP win', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Case Study', 'Pending Client Approval'::content_status, '2026-01-09'::date, NULL, 'Client story.', NULL, NULL),
  ('morning-reminder', 'Morning reminder reel', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Reel', 'Ready to Post'::content_status, '2026-01-11'::date, NULL, 'Morning reminder.', NULL, NULL),
  ('hiring-clarity', 'Hiring without clarity', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Educational Content', 'Amendments Requested'::content_status, '2026-01-14'::date, NULL, 'Hiring lesson.', NULL, NULL),
  ('weekly-carousel', 'Weekly educational carousel', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Carousel', 'Ready to Post'::content_status, '2026-01-15'::date, NULL, 'Weekly carousel.', NULL, NULL),
  ('leadership-myth', 'Leadership myth short', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Short', 'Pending QC'::content_status, '2026-01-16'::date, '1:18', 'Leadership myth short.', NULL, NULL),
  ('weekend-trust', 'Weekend trust builder', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Reel', 'Ready to Post'::content_status, '2026-01-18'::date, NULL, 'Trust builder.', NULL, NULL),
  ('business-blindspot', 'Business owner blindspot', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Educational Content', 'Editing'::content_status, '2026-01-19'::date, NULL, 'Blindspot content.', NULL, NULL),
  ('team-angle-shoot', 'Content shoot: team angle', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Shoot', 'Shoot'::content_status, '2026-01-20'::date, NULL, 'Team angle shoot.', NULL, NULL),
  ('delegate-better', 'How to delegate better', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Educational Content', 'Ready to Post'::content_status, '2026-01-22'::date, NULL, 'Delegation lesson.', NULL, NULL),
  ('before-after-system', 'Before/after system post', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Case Study', 'Editing'::content_status, '2026-01-23'::date, NULL, 'Before/after system.', NULL, NULL),
  ('monthly-recap', 'Monthly lesson recap', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Recap', 'Idea'::content_status, '2026-01-26'::date, NULL, 'Monthly recap.', NULL, NULL),
  ('founder-quote', 'Founder quote short', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'Short', 'Idea'::content_status, '2026-01-28'::date, NULL, 'Founder quote.', NULL, NULL),
  ('end-month-cta', 'End-month CTA video', (SELECT id FROM clients WHERE name = 'Munif Isa' LIMIT 1), 'CTA', 'Idea'::content_status, '2026-01-30'::date, NULL, 'End of month CTA.', NULL, NULL)
) AS v(slug, title, client_id, category, status, post_date, duration, brief, hook, caption)
WHERE NOT EXISTS (SELECT 1 FROM content_items c WHERE c.slug = v.slug);
