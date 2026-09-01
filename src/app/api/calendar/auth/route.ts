import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { google } from "googleapis";

/**
 * Initiates the Google Calendar OAuth2 authorization flow.
 *
 * GET /api/calendar/auth
 * - Redirects the authenticated user to Google's OAuth consent screen.
 * - Scopes requested: calendar.events (read/write) + calendar.readonly.
 * - Uses the OAuth2 `state` parameter for CSRF protection.
 */
export const GET = withAuth(async (request, { session }) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("[CalendarAuth] Missing Google OAuth environment variables");
    return NextResponse.json(
      { error: "Configuración de Google Calendar incompleta" },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ];

  const state = Buffer.from(
    `${session.user.id}:${Date.now()}:${Math.random()}`
  ).toString("base64");

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
  });

  return NextResponse.redirect(authUrl);
});
