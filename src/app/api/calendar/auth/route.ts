import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";

/**
 * Initiates the Google Calendar OAuth2 authorization flow.
 *
 * GET /api/calendar/auth
 * - Redirects the authenticated user to Google's OAuth consent screen.
 * - Scopes requested: calendar.events (read/write) + calendar.readonly.
 * - Uses the OAuth2 `state` parameter for CSRF protection.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error(
        "[CalendarAuth] Missing Google OAuth environment variables"
      );
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

    // Generate a random state token for CSRF protection
    const state = Buffer.from(
      `${session.user.id}:${Date.now()}:${Math.random()}`
    ).toString("base64");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // force refresh_token to be returned
      prompt: "consent", // always show consent screen to get refresh_token
      scope: scopes,
      state,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[CalendarAuth] GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
