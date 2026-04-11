-- Migration 032: Add extension_of to pass_requests
-- Re-defining the column to support pass extensions after it was accidentally deleted locally.

ALTER TABLE public.pass_requests ADD COLUMN IF NOT EXISTS extension_of UUID REFERENCES public.passes(id);

COMMENT ON COLUMN public.pass_requests.extension_of IS 'Self-reference to the pass id that this request is trying to extend.';
