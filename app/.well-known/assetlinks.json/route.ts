import { NextResponse } from 'next/server';

const parseFingerprints = (value: string | undefined) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

export async function GET() {
  const packageName = (process.env.ANDROID_PACKAGE_NAME || 'com.imfencer.app').trim();
  const fingerprints = parseFingerprints(process.env.ANDROID_SHA256_CERT_FINGERPRINTS);

  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}
