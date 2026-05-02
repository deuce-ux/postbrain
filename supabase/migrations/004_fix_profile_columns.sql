ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS project_description text,
ADD COLUMN IF NOT EXISTS content_topics text[],
ADD COLUMN IF NOT EXISTS voice_style text DEFAULT 'conversational',
ADD COLUMN IF NOT EXISTS voice_examples text[],
ADD COLUMN IF NOT EXISTS voice_dna jsonb,
ADD COLUMN IF NOT EXISTS voice_setup_complete boolean DEFAULT false;
