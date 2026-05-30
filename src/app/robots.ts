import type { MetadataRoute } from "next";

/**
 * Robots.txt — permite indexación de rutas públicas,
 * deshabilita /dashboard/ y /api/.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://consultorio.com.ar";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
