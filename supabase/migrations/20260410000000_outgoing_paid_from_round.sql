-- Add paid_from (which admin paid it) and round to outgoing payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_from TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS round TEXT;
