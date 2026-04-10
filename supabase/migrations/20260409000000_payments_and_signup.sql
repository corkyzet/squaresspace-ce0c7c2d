-- Add who_will_pay and collected_by to entrants for incoming payments & signup form
ALTER TABLE public.entrants ADD COLUMN IF NOT EXISTS who_will_pay TEXT;
ALTER TABLE public.entrants ADD COLUMN IF NOT EXISTS collected_by TEXT;

-- Update payments status constraint to support paid/unpaid
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'unpaid', 'refunded'));
