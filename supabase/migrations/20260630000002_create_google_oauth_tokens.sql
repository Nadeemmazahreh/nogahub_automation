-- Google OAuth token storage for calendar sync
-- Stores refresh tokens for Google accounts that have authorized the app.
-- Only edge functions (service role) can read/write — no RLS policies for anon/authenticated.

CREATE TABLE public.v1_google_oauth_tokens (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                    TEXT        NOT NULL UNIQUE,
  refresh_token            TEXT        NOT NULL,
  access_token             TEXT,
  access_token_expires_at  TIMESTAMPTZ,
  scope                    TEXT,
  connected_by_email       TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_v1_google_oauth_tokens()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_v1_google_oauth_tokens
  BEFORE UPDATE ON public.v1_google_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v1_google_oauth_tokens();

-- RLS enabled but NO policies for anon/authenticated — only service role can access.
-- Edge functions use the service role key, so they bypass RLS entirely.
ALTER TABLE public.v1_google_oauth_tokens ENABLE ROW LEVEL SECURITY;
