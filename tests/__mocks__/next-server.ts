/**
 * Mock for `next/server` — NextRequest / NextResponse.
 *
 * The real `next/server` extends the Web `Request` and `Response` APIs,
 * which are not available in jest-environment-jsdom v29. This mock
 * provides a minimal compatible implementation for integration tests.
 */

class NextRequest {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;

  constructor(input: string | URL, init?: RequestInit) {
    const urlStr = typeof input === "string" ? input : input.toString();
    const parsed = new URL(urlStr);
    this.url = urlStr;
    this.method = init?.method ?? "GET";
    this.headers = new Headers(
      init?.headers as Record<string, string> | undefined
    );

    // Merge search params into parsed URL properties
    if (parsed.searchParams) {
      Object.defineProperty(this, "nextUrl", {
        value: parsed,
        writable: false,
        enumerable: true,
        configurable: true,
      });
    }

    this.body = init?.body ?? null;
  }
}

class NextResponse {
  status: number;
  headers: Headers;
  body: unknown;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.status = init?.status ?? 200;
    this.headers = new Headers(
      init?.headers as Record<string, string> | undefined
    );
    this.body = body ?? null;
  }

  static json(data: unknown, init?: ResponseInit): NextResponse {
    const body = JSON.stringify(data);
    return new NextResponse(body, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        "content-type": "application/json",
      },
    });
  }

  static redirect(url: string | URL, status?: number): NextResponse {
    const location = typeof url === "string" ? url : url.toString();
    return new NextResponse(null, {
      status: status ?? 307,
      headers: { location },
    });
  }

  async json(): Promise<unknown> {
    return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
  }

  async text(): Promise<string> {
    return typeof this.body === "string" ? this.body : String(this.body ?? "");
  }
}

export { NextRequest, NextResponse };
