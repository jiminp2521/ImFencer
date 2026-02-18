import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim() || 'com.imfencer.app';
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=3600',
      },
    }
  );
}
