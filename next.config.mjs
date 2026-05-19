import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // node-cron is a Node.js-only module that requires
      // path, child_process, etc. — must not be bundled by webpack.
      config.externals = [...(config.externals || []), "node-cron"];
    }
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },
});
