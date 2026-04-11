-- Enable Supabase Realtime for targeted tables
-- We drop the existing publication table additions and accurately inject them

-- Note: supabase_realtime publication is created by default in Supabase.
-- If it doesn't exist, we skip.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        -- Safely add pass_requests
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE pass_requests;
        EXCEPTION WHEN duplicate_object THEN
            -- Ignore if already added
        END;

        -- Safely add passes
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE passes;
        EXCEPTION WHEN duplicate_object THEN
            -- Ignore if already added
        END;
    END IF;
END $$;
