ALTER TABLE public.events ADD COLUMN plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.events ADD COLUMN expires_at timestamptz;
UPDATE public.events SET plan = 'premium', expires_at = COALESCE(created_at, now()) + interval '6 months';
ALTER TABLE public.events ADD CONSTRAINT events_plan_check CHECK (plan IN ('free','basic','premium','exclusive'));