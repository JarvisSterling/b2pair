-- Add company_size to companies table so organizers can pre-fill it
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS company_size text CHECK (company_size IN ('1-10', '11-50', '51-200', '201-1000', '1000+'));
