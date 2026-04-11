-- Migration: 032_add_extension_of_to_requests.sql
-- Description: Adds extension_of column to pass_requests to track which pass is being extended

ALTER TABLE public.pass_requests 
ADD COLUMN extension_of UUID REFERENCES public.passes(id) ON DELETE SET NULL;

CREATE INDEX idx_requests_extension_of ON public.pass_requests(extension_of);

-- Add comment for documentation
COMMENT ON COLUMN public.pass_requests.extension_of IS 'Points to the pass being extended by this request';
