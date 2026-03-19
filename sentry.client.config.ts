// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3b2951c34a82f49225510c66d6a9c5c2@o4511073576288256.ingest.us.sentry.io/4511073581006848",

  // Sample 100% of errors, but only 10% of performance traces in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Capture session replays for 5% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and inputs by default to avoid capturing sensitive data
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // Route errors through the Next.js tunnel to avoid ad-blockers
  tunnel: "/monitoring",

  // Enable logs
  enableLogs: true,

  // Only print debug info in development
  debug: process.env.NODE_ENV === "development",
});
