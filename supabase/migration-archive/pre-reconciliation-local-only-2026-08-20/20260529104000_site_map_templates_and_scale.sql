set client_min_messages = warning;

alter table if exists public.site_maps
  add column if not exists scale_unit text default 'meters';

insert into public.map_templates (name, description, category, template_data, is_public)
values
  (
    'Festival Layout',
    'Starter layout with stage, vendor row, and entry checkpoint.',
    'festival',
    '{
      "elements": [
        { "name": "Main Stage", "element_type": "main-stage", "x": 480, "y": 120, "width": 260, "height": 180, "rotation": 0, "color": "#9333ea", "stroke_color": "#7e22ce", "stroke_width": 2 },
        { "name": "Vendor Row", "element_type": "vendor-booth-10x10", "x": 220, "y": 460, "width": 520, "height": 80, "rotation": 0, "color": "#fb923c", "stroke_color": "#ea580c", "stroke_width": 2 },
        { "name": "Entry", "element_type": "security-checkpoint", "x": 520, "y": 760, "width": 180, "height": 80, "rotation": 0, "color": "#60a5fa", "stroke_color": "#2563eb", "stroke_width": 2 }
      ]
    }'::jsonb,
    true
  ),
  (
    'Concert Venue',
    'Indoor concert starter layout with stage and seating area.',
    'concert',
    '{
      "elements": [
        { "name": "Stage", "element_type": "main-stage", "x": 420, "y": 100, "width": 360, "height": 180, "rotation": 0, "color": "#9333ea", "stroke_color": "#7e22ce", "stroke_width": 2 },
        { "name": "GA Floor", "element_type": "custom", "x": 300, "y": 320, "width": 600, "height": 480, "rotation": 0, "color": "#1f2937", "stroke_color": "#64748b", "stroke_width": 2 }
      ]
    }'::jsonb,
    true
  ),
  (
    'Corporate Event',
    'Starter layout with booths and central networking area.',
    'corporate',
    '{
      "elements": [
        { "name": "Reception", "element_type": "check-in-tent", "x": 520, "y": 120, "width": 200, "height": 90, "rotation": 0, "color": "#0ea5e9", "stroke_color": "#0369a1", "stroke_width": 2 },
        { "name": "Booths", "element_type": "vendor-booth-10x10", "x": 240, "y": 320, "width": 720, "height": 260, "rotation": 0, "color": "#22c55e", "stroke_color": "#15803d", "stroke_width": 2 }
      ]
    }'::jsonb,
    true
  ),
  (
    'Wedding Venue',
    'Starter layout with ceremony, dining, and dance floor.',
    'wedding',
    '{
      "elements": [
        { "name": "Ceremony", "element_type": "custom", "x": 360, "y": 130, "width": 480, "height": 180, "rotation": 0, "color": "#f9a8d4", "stroke_color": "#db2777", "stroke_width": 2 },
        { "name": "Dining", "element_type": "rectangular-table", "x": 300, "y": 360, "width": 560, "height": 260, "rotation": 0, "color": "#f59e0b", "stroke_color": "#b45309", "stroke_width": 2 }
      ]
    }'::jsonb,
    true
  ),
  (
    'Sports Event',
    'Starter layout with field, stands, and concessions.',
    'sports',
    '{
      "elements": [
        { "name": "Field", "element_type": "custom", "x": 240, "y": 160, "width": 720, "height": 420, "rotation": 0, "color": "#16a34a", "stroke_color": "#166534", "stroke_width": 2 },
        { "name": "Concessions", "element_type": "food-truck", "x": 480, "y": 640, "width": 220, "height": 120, "rotation": 0, "color": "#f97316", "stroke_color": "#c2410c", "stroke_width": 2 }
      ]
    }'::jsonb,
    true
  )
on conflict do nothing;
