import { NextResponse } from 'next/server';

const roundMs = (value: number) => Math.max(0, Math.round(value * 100) / 100);

export async function withApiTiming(
  routeName: string,
  handler: () => Promise<NextResponse>
) {
  const startedAt = performance.now();

  try {
    const response = await handler();
    const duration = roundMs(performance.now() - startedAt);

    response.headers.set('Server-Timing', `imfencer;desc="${routeName}";dur=${duration}`);
    response.headers.set('X-Response-Time', `${duration}`);

    if (process.env.NODE_ENV !== 'production') {
      console.info(`[api:${routeName}] ${duration}ms`);
    }

    return response;
  } catch (error) {
    const duration = roundMs(performance.now() - startedAt);
    console.error(`[api:${routeName}] failed in ${duration}ms`, error);

    const response = NextResponse.json(
      {
        error: 'Internal Server Error',
      },
      {
        status: 500,
      }
    );

    response.headers.set('Server-Timing', `imfencer;desc="${routeName}";dur=${duration}`);
    response.headers.set('X-Response-Time', `${duration}`);

    return response;
  }
}
