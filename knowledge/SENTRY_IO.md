Sentry Integration Guide: Next.js (Frontend) & Node.js (Backend)
This guide explains how to add Sentry (cloud) to a Next.js frontend and a Node.js backend. It covers installation, initialization, error capturing, and release/source-map setup (with TypeScript and JavaScript examples). We also include tips for common issues – especially Netlify deployment, environment variables, and source maps
docs.sentry.io
docs.sentry.io
.
Next.js (Frontend)
Install the SDK: In your Next.js project run:
npm install @sentry/nextjs
or with Yarn/Pnpm
docs.sentry.io
.
Configure Next: Wrap your Next.js config with Sentry’s plugin to enable sourcemaps. For example in next.config.js:
const { withSentryConfig } = require("@sentry/nextjs");
const nextConfig = { /* your existing config */ };
module.exports = withSentryConfig(nextConfig, {
  org: "your-sentry-org",          // your Sentry organization slug
  project: "your-sentry-project",  // your Sentry project slug
  // Optional settings:
  silent: !process.env.CI,         // silence Sentry CLI logs outside CI
  disableLogger: true,            // remove Sentry console logs for smaller bundles
});
This ensures Sentry’s Webpack plugin runs last and uploads source maps automatically on build
docs.sentry.io
. Tip: Make sure withSentryConfig is the last thing you export in next.config.js.
Initialize Sentry: Create the config files Sentry expects (by default in your project root or src/ directory):
sentry.server.config.js (or .ts) for server/SSR code
instrumentation-client.js (or .ts, previously sentry.client.config.js) for client/browser code
docs.sentry.io
.
In each file, import Sentry and call Sentry.init. For example:
// sentry.server.config.js (runs on Next.js server side)
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,         // or use NEXT_PUBLIC_SENTRY_DSN for client
  tracesSampleRate: 0.2,              // adjust sample rate for performance monitoring
  sendDefaultPii: true,               // whether to send user info (IP, etc.)
  // ...other settings as needed
});
// instrumentation-client.ts (runs in browser)
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, 
  tracesSampleRate: 0.1,
  // e.g. enable Session Replay or User Feedback integrations if desired
});
By convention, use a public env var (like NEXT_PUBLIC_SENTRY_DSN) for the client DSN so it’s exposed to the browser
docs.sentry.io
. Do not hardcode the DSN in source; always use environment variables.
Capture Errors: With this setup, many Next.js errors (server and client) are automatically sent to Sentry. For custom error pages or manual capture, use Sentry.captureException(error). For example, in the App Router add a global error component:
"use client";
import * as Sentry from "@sentry/nextjs";
export default function GlobalError({ error }: { error: Error }) {
  // Send the error to Sentry
  Sentry.captureException(error);
  return <p>Something went wrong.</p>;
}
This ensures uncaught render errors are reported
docs.sentry.io
. For the Pages Router (pages/_error.js), you can similarly call Sentry.captureException in a custom error component or in getInitialProps.
Releases & Source Maps: To get readable stack traces, upload source maps and tag releases. The Next.js plugin can do this automatically if you provide an auth token:
// In next.config.js withSentryConfig options:
module.exports = withSentryConfig(nextConfig, {
  org: "your-sentry-org",
  project: "your-sentry-project",
  authToken: process.env.SENTRY_AUTH_TOKEN,  // required to upload source maps
  widenClientFileUpload: true,               // upload more maps (optional)
});
Also set SENTRY_AUTH_TOKEN=sntrys_… in Netlify or your .env (keep it secret)
docs.sentry.io
docs.sentry.io
. The plugin will then notify Sentry of each release and upload built JavaScript bundles and maps. Alternatively, you can run sentry-cli in CI to create releases (e.g. with Git SHA) and upload maps
docs.sentry.io
docs.sentry.io
. Use a release naming scheme (like my-app@${version}) to tie events to code
docs.sentry.io
. In code you can also set the release explicitly:
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: `my-app@${process.env.npm_package_version}`,
});
or simply set the SENTRY_RELEASE env var before starting the app (especially in CI)
docs.sentry.io
docs.sentry.io
.
Node.js (Backend)
Install the SDK: In your Node project run:
npm install @sentry/node
(Add @sentry/profiling-node if you want profiling)
docs.sentry.io
.
Initialize Sentry Early: Import and initialize Sentry before any other code (ideally at the very top of your entry file). For example (app.js or instrument.js):
const Sentry = require("@sentry/node");
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  // ...other options
});
In TypeScript:
import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
This must run before any routes or database connections so that Sentry can auto-instrument and catch errors
docs.sentry.io
.
Integrate with Express (if used): If using Express, add Sentry middleware. For Sentry v7+ you typically do:
app.use(Sentry.Handlers.requestHandler());  // capture request data
// Define routes...
app.use(Sentry.Handlers.errorHandler());    // handle errors after routes
(In older docs or Sentry v6, there was Sentry.setupExpressErrorHandler(app) for adding both handlers
docs.sentry.io
.) Place the error handler after all routes but before other catch-all error handlers
docs.sentry.io
.
Capturing Exceptions: By default, Sentry catches uncaught exceptions and rejections. For errors you catch manually, call Sentry.captureException(error) to report them
docs.sentry.io
. For example:
try {
  // something that may throw
} catch (err) {
  Sentry.captureException(err);
  // handle error...
}
You can also hook global handlers:
process.on("unhandledRejection", (reason) => {
  Sentry.captureException(reason);
});
process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
  process.exit(1);
});
This ensures even uncaught errors are sent.
Releases & Source Maps: Tagging releases works the same as in Next.js. In Node you might set release in Sentry.init or use SENTRY_RELEASE. If you compile TypeScript, enable source maps ("sourceMap": true in tsconfig.json) and upload the .js.map files. You can use Sentry CLI (sentry-cli sourcemaps upload path/to/build) or a CI step to attach the maps to the release
docs.sentry.io
docs.sentry.io
. Ensure SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN are configured (as in Next.js) so Sentry knows where to map the code
docs.sentry.io
github.com
.
Troubleshooting
Environment Variables: Verify all Sentry-related env vars are set correctly in each environment. Common ones: SENTRY_DSN (your project DSN), SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN (for uploading maps)
docs.sentry.io
github.com
. On Netlify, add them in Site settings (or netlify.toml via the Sentry plugin) rather than committing a .env. Never hard-code auth tokens.
Netlify Builds: If hosting the Next.js frontend on Netlify, consider using Sentry’s Netlify Build Plugin. In netlify.toml:
[[plugins]]
  package = "@sentry/netlify-build-plugin"
and configure inputs (SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT) in Netlify UI or netlify.toml
docs.sentry.io
github.com
. The plugin will auto-notify Sentry of new deploys and upload sourcemaps. If you install it via Netlify’s UI, it guides you through adding these variables. Common Netlify issues: Do not set NETLIFY_NEXT_PLUGIN_SKIP=true. That environment variable disables Netlify’s Next.js plugin, breaking SSR and API routes
answers.netlify.com
. Also, avoid using next export if you rely on API routes – a static export won’t include them (Next.js limitation)
answers.netlify.com
. If you previously added advanced build processing settings (e.g. build.processing in netlify.toml), remove them – they are not compatible with Next.js.
Source Maps Issues: If stack traces in Sentry show minified code, your source maps may not be uploaded or injected correctly. Check the Source Maps tab in Sentry (Project Settings) – you should see your JS bundles and .map files listed
docs.sentry.io
. Ensure you ran a production build (npm run build) when generating maps
docs.sentry.io
. Use the Sentry CLI to debug:
sentry-cli sourcemaps explain <EVENT_ID>
This command inspects an issue and tells you which source map matched (or why not)
docs.sentry.io
. Common fixes: upgrade to the latest Sentry SDK/CLI (recommended ≥v7.47.0 for JS)
docs.sentry.io
, and verify the debugId comments are present in your compiled files (the CLI injects these during upload). If you see “release not found” errors, be sure to create or finalize the release before uploading maps (e.g. sentry-cli releases new -p myproj $RELEASE && sentry-cli releases finalize $RELEASE).
Build Failures: If your build fails after adding Sentry, check for misconfigured next.config.js or missing dependencies. Ensure @sentry/nextjs is installed and that your withSentryConfig call is correct. Also check logs for mismatched versions (all parts should be compatible). On Netlify, inspect the build log: the Sentry plugin will print what it’s uploading (silenced with silent: true otherwise)
docs.sentry.io
.
Other Tips: Always test locally first. Use Sentry’s example error pages (/sentry-example-page) after setup to confirm events arrive. For detailed guidance, refer to Sentry’s own docs and troubleshooting guides (e.g. Next.js docs, Node.js docs, Source Maps troubleshooting).
Additional Resources
Sentry Next.js docs: Getting Started with Next.js 
docs.sentry.io
docs.sentry.io
Sentry Node.js docs: Getting Started with Node 
docs.sentry.io
docs.sentry.io
Sentry CLI docs: Source Maps Uploading 
docs.sentry.io
Sentry + Netlify integration: Netlify Build Plugin 
docs.sentry.io
Sentry Troubleshooting (Source Maps): Troubleshooting Source Maps 
docs.sentry.io
docs.sentry.io
Citations

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Node.js | Sentry for Node.js

https://docs.sentry.io/platforms/javascript/guides/node/

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Releases & Health | Sentry for Node.js

https://docs.sentry.io/platforms/javascript/guides/node/configuration/releases/

Sentry CLI | Sentry for Node.js

https://docs.sentry.io/platforms/javascript/guides/node/sourcemaps/uploading/cli/

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Express | Sentry for Express

https://docs.sentry.io/platforms/javascript/guides/express/

Express | Sentry for Express

https://docs.sentry.io/platforms/javascript/guides/express/

Node.js | Sentry for Node.js

https://docs.sentry.io/platforms/javascript/guides/node/

TypeScript (tsc) | Sentry for Node.js

https://docs.sentry.io/platforms/javascript/guides/node/sourcemaps/uploading/typescript/

Sentry CLI | Sentry for Node.js

https://docs.sentry.io/platforms/javascript/guides/node/sourcemaps/uploading/cli/

Sentry CLI | Sentry for Node.js

https://docs.sentry.io/platforms/javascript/guides/node/sourcemaps/uploading/cli/

GitHub - getsentry/sentry-netlify-build-plugin: The Sentry Netlify build plugin automatically notifies Sentry of new releases being deployed to your site.

https://github.com/getsentry/sentry-netlify-build-plugin

Netlify

https://docs.sentry.io/product/releases/setup/release-automation/netlify/

Unable to properly deploy Next.js - Support - Netlify Support Forums

https://answers.netlify.com/t/unable-to-properly-deploy-next-js/93949

Unable to properly deploy Next.js - Support - Netlify Support Forums

https://answers.netlify.com/t/unable-to-properly-deploy-next-js/93949

Troubleshooting Source Maps | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/

Troubleshooting Source Maps | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/

Troubleshooting Source Maps | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/

Troubleshooting Source Maps | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/

Manual Setup | Sentry for Next.js

https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

Node.js | Sentry for Node.js

https://docs.sentry.io/platforms/javascript/guides/node/
All Sources