-- Required initial content copied from application defaults. Apply after schema.
-- Reruns preserve edited content. No collections, overrides or assets are seeded.
begin;

-- src/components/prism-fiber/ui/hero/prism-hero-content.ts
insert into public.hero_content (
  id, eyebrow, headline, idea_tagline, idea_description,
  iterate_tagline, iterate_description, solution_tagline, solution_description
) values (
  1, 'Product delivery', 'Ideas into products.',
  'Find the right problem.',
  'Align user needs, business goals, and technical reality.',
  'Make uncertainty testable.',
  'Test working ideas early and refine what matters.',
  'Ship with confidence.',
  'Deliver a coherent product built to evolve.'
) on conflict (id) do nothing;

-- src/components/about-cta/about-content.ts
insert into public.about_content (id, heading, biography) values (
  1, 'About me',
  'I bring ideas to life through thoughtful design and careful engineering. My work connects what people need with what technology can make possible. From early exploration to finished experiences, I turn complex problems into clear, useful interfaces. I care about the details that make digital products feel intuitive, accessible, and a pleasure to use.'
) on conflict (id) do nothing;

-- src/components/contact-conversation/social-profiles.ts
insert into public.social_content (id, github, linkedin, x) values (
  1, 'https://github.com/olawalethefirst',
  'https://www.linkedin.com/in/olawalethefirst', 'https://x.com/olawalethefirst'
) on conflict (id) do nothing;

-- src/cms/seo.ts: initialSeo().defaults; PostgreSQL generates the UUID.
insert into public.seo (path, title, description) values (
  '/', 'Portfolio', 'Interactive portfolio and publication previews.'
) on conflict (path) do nothing;

commit;
