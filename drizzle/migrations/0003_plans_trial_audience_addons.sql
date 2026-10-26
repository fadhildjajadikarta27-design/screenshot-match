ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_plan_check;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS audience_size text NOT NULL DEFAULT 's';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS addons text[] NOT NULL DEFAULT '{}';
UPDATE public.events SET plan = 'trial' WHERE plan = 'free';
ALTER TABLE public.events ALTER COLUMN plan SET DEFAULT 'trial';
ALTER TABLE public.events ADD CONSTRAINT events_plan_check CHECK (plan IN ('trial','basic','premium','exclusive'));
ALTER TABLE public.events ADD CONSTRAINT events_audience_check CHECK (audience_size IN ('s','m','l','xl','xxl'));