-- Expand the notifications type check constraint to include new event types
-- Added: meeting_rescheduled, company_approved, company_rejected, company_live, contact_exchange

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'meeting_request',
    'meeting_rescheduled',
    'meeting_accepted',
    'meeting_declined',
    'meeting_reminder',
    'meeting_cancelled',
    'new_match',
    'new_message',
    'company_approved',
    'company_rejected',
    'company_live',
    'contact_exchange',
    'event_update',
    'registration_approved',
    'registration_rejected',
    'system'
  ));
