ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS voice_style text default 'conversational',
ADD COLUMN IF NOT EXISTS voice_examples text[],
ADD COLUMN IF NOT EXISTS voice_topics text[],
ADD COLUMN IF NOT EXISTS voice_avoid text,
ADD COLUMN IF NOT EXISTS voice_setup_complete boolean default false,
ADD COLUMN IF NOT EXISTS display_name text;
