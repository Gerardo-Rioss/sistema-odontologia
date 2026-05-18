import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";
import type { OAuthTokenResponse } from "@/types/calendar";
import { calendarRepository } from "@/repositories/calendar.repository";

/**
 * OAuth2 callback endpoint — Google redirects here after user consent.
 *
 * GET /api/calendar/auth/callback
 * - Receives `code` and `state` from Google's authorization redirect.
 * - Validates CSRF `state` parameter (must be non-empty).
 * - Exchanges the authorization code for access + refresh tokens.
 * - Encrypts tokens and upserts the CalendarConnection for the user.
 * - Sets status to ACTIVE and redirects to the settings page.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denying consent
    if (error) {
      console.warn(`[CalendarCallback] Google OAuth denied: ${error}`);
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=denied", request.url)
      );
    }

    // Validate required parameters
    if (!code) {
      console.error("[CalendarCallback] Missing authorization code");
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error", request.url)
      );
    }

    // CSRF state verification
    if (!state) {
      console.error("[CalendarCallback] Missing state parameter — possible CSRF");
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error", request.url)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error(
        "[CalendarCallback] Missing Google OAuth environment variables"
      );
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error", request.url)
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    const tokenResponse = tokens as OAuthTokenResponse & {
      refresh_token?: string;
      expiry_date?: number;
    };

    if (!tokenResponse.access_token) {
      console.error("[CalendarCallback] No access token received from Google");
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error", request.url)
      );
    }

    // Determine expiry — Google returns expiry_date as ms timestamp
    const tokenExpiry = tokenResponse.expiry_date
      ? new Date(tokenResponse.expiry_date)
      : new Date(Date.now() + (tokenResponse.expires_in ?? 3600) * 1000);

    // Resolve the Google account email from the token info
    let googleEmail: string | null = null;
    try {
      const tokenInfo = await oauth2Client.getTokenInfo(
        tokenResponse.access_token
      );
      googleEmail = tokenInfo.email ?? null;
    } catch {
      console.warn(
        "[CalendarCallback] Could not resolve Google email from token info"
      );
    }

    // Ensure we have a refresh token (first authorization with prompt=consent)
    const refreshToken = tokenResponse.refresh_token;
    if (!refreshToken) {
      console.error(
        "[CalendarCallback] No refresh token received — ensure prompt=consent"
      );
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error", request.url)
      );
    }

    // Upsert connection: create or update the user's CalendarConnection
    await calendarRepository.upsertTokens(session.user.id, {
      accessToken: tokenResponse.access_token,
      refreshToken,
      tokenExpiry,
      googleEmail,
      googleCalendarId: "primary",
    });

    // Redirect to settings with success indicator
    return NextResponse.redirect(
      new URL("/dashboard/settings?calendar=connected", request.url)
    );
  } catch (err) {
    console.error("[CalendarCallback] Unexpected error:", err);
    const url = new URL("/dashboard/settings?calendar=error", request.url);
    return NextResponse.redirect(url);
  }
}
