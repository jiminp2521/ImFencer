import { NextResponse } from 'next/server';

const getAppId = () => {
  const teamId = (process.env.APPLE_TEAM_ID || '').trim();
  const bundleId = (process.env.IOS_BUNDLE_ID || 'com.imfencer.app').trim();

  if (!teamId) {
    return bundleId;
  }

  return `${teamId}.${bundleId}`;
};

export async function GET() {
  const appId = getAppId();
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [appId],
          components: [
            {
              '/': '/auth/*',
            },
            {
              '/': '/payments/*',
            },
            {
              '/': '/*',
            },
          ],
        },
      ],
    },
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}
