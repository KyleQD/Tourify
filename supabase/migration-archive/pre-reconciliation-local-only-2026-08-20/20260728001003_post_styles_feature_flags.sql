-- Insert post style feature flags (all disabled by default)
INSERT INTO public.feature_flags (key, name, description, enabled, rollout_percentage)
VALUES
  ('post_styles_read',          'Post Styles: Read',          'Enable styled post rendering for readers',          false, 0),
  ('post_styles_write',         'Post Styles: Write',         'Enable styled post creation/publication',           false, 0),
  ('post_styles_editor',        'Post Styles: Editor UI',     'Enable composer Style control and settings panel',  false, 0),
  ('post_styles_all_templates', 'Post Styles: All Templates', 'Unlock all 19 EPK templates for post styling',      false, 0)
ON CONFLICT (key) DO NOTHING;
