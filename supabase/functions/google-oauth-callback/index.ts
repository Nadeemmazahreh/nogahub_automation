/**
 * google-oauth-callback — handles the Google OAuth 2.0 redirect after user consent.
 *
 * Flow:
 *   1. Google redirects to this function with ?code=...
 *   2. Exchange code for tokens (POST /token)
 *   3. Decode id_token to get the user's email
 *   4. Upsert {email, refresh_token, access_token, expiry} into v1_google_oauth_tokens
 *   5. 302-redirect to the app with ?google_connected=1
 *
 * Deploy with --no-verify-jwt (Google calls this unauthenticated).
 *
 * Required secrets:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REDIRECT_URI   (this function's URL)
 *   APP_URL                     (e.g. https://yourapp.com)
 *   SUPABASE_URL                (auto-provided)
 *   SUPABASE_SERVICE_ROLE_KEY   (auto-provided)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';

  if (error || !code) {
    console.error('OAuth error or missing code:', error);
    return Response.redirect(`${appUrl}/?google_error=${encodeURIComponent(error || 'missing_code')}`);
  }

  try {
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')!;

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.refresh_token) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
    }

    // Decode id_token (JWT) to get email — no sig verification needed (from Google's endpoint)
    const idPayload = JSON.parse(
      atob(tokenData.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    const email = idPayload.email;
    if (!email) throw new Error('Could not determine email from id_token');

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Store token — service role bypasses RLS on v1_google_oauth_tokens
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: dbError } = await admin.from('v1_google_oauth_tokens').upsert({
      email,
      refresh_token: tokenData.refresh_token,
      access_token: tokenData.access_token,
      access_token_expires_at: expiresAt,
      scope: tokenData.scope,
      connected_by_email: email,
    }, { onConflict: 'email' });

    if (dbError) throw new Error(`DB upsert failed: ${dbError.message}`);

    console.log(`Google Calendar connected for ${email}`);
    return Response.redirect(`${appUrl}/?google_connected=1`);
  } catch (err) {
    console.error('google-oauth-callback error:', err);
    return Response.redirect(`${appUrl}/?google_error=${encodeURIComponent((err as Error).message)}`);
  }
});
