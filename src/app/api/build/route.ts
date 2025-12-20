import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Bump this string when we need to force a clearly visible “new build” in production.
// (Deploy hooks should redeploy even without code changes, but this makes verification unambiguous.)
const BUILD_NONCE = '2025-12-20-nonce-1';

function pickEnv(name: string) {
  const v = process.env[name];
  return v && v.length ? v : null;
}

export async function GET() {
  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      buildNonce: BUILD_NONCE,
      nodeEnv: pickEnv('NODE_ENV'),
      vercel: {
        env: pickEnv('VERCEL_ENV'),
        url: pickEnv('VERCEL_URL'),
        deploymentId: pickEnv('VERCEL_DEPLOYMENT_ID'),
        region: pickEnv('VERCEL_REGION'),
        git: {
          commitSha: pickEnv('VERCEL_GIT_COMMIT_SHA'),
          commitRef: pickEnv('VERCEL_GIT_COMMIT_REF'),
          commitMessage: pickEnv('VERCEL_GIT_COMMIT_MESSAGE'),
          repoSlug: pickEnv('VERCEL_GIT_REPO_SLUG'),
          repoOwner: pickEnv('VERCEL_GIT_REPO_OWNER'),
          provider: pickEnv('VERCEL_GIT_PROVIDER'),
        },
      },
    },
    {
      headers: {
        // avoid any “looks stale” confusion while debugging
        'Cache-Control': 'no-store',
      },
    },
  );
}
