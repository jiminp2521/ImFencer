import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const bundleId = process.env.IOS_BUNDLE_ID?.trim() || 'com.imfencer.app';

  const appId = teamId ? `${teamId}.${bundleId}` : bundleId;

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: appId,
            paths: ['*'],
          },
        ],
      },
    },
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=3600',
      },
    }
  );
}
