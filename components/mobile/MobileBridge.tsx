'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { PushNotifications, type ActionPerformed } from '@capacitor/push-notifications';

const APP_SCHEME = (process.env.NEXT_PUBLIC_APP_SCHEME || 'imfencer').toLowerCase();

type ParsedAppUrl =
  | {
      kind: 'auth';
      code: string;
      next: string;
    }
  | {
      kind: 'path';
      path: string;
    }
  | null;

const normalizePath = (path: string) => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const parseIncomingUrl = (rawUrl: string): ParsedAppUrl => {
  try {
    const url = new URL(rawUrl);
    const protocol = url.protocol.replace(':', '').toLowerCase();

    // Custom scheme handling (ex: imfencer://auth/callback?code=...)
    if (protocol === APP_SCHEME) {
      const hostPath = url.host ? `/${url.host}${url.pathname}` : url.pathname;
      const mergedPath = normalizePath(hostPath).replace(/\/{2,}/g, '/');

      if (mergedPath === '/auth/callback') {
        const code = url.searchParams.get('code') || '';
        const next = url.searchParams.get('next') || '/';
        if (code) {
          return { kind: 'auth', code, next: normalizePath(next) };
        }
      }

      return {
        kind: 'path',
        path: `${mergedPath}${url.search}${url.hash}`,
      };
    }

    // Universal link or regular web deep link
    if (url.pathname === '/auth/callback') {
      const code = url.searchParams.get('code') || '';
      const next = url.searchParams.get('next') || '/';
      if (code) {
        return { kind: 'auth', code, next: normalizePath(next) };
      }
    }

    return {
      kind: 'path',
      path: `${normalizePath(url.pathname)}${url.search}${url.hash}`,
    };
  } catch {
    return null;
  }
};

const extractPushPath = (action: ActionPerformed) => {
  const path = action.notification.data?.path;
  if (typeof path === 'string' && path.trim()) {
    return normalizePath(path.trim());
  }
  const link = action.notification.data?.link;
  if (typeof link === 'string' && link.trim()) {
    return normalizePath(link.trim());
  }
  return null;
};

export function MobileBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.body.classList.add('native-app');

    const listeners: Array<{ remove: () => Promise<void> }> = [];

    const registerPushToken = async (token: string) => {
      const platform = Capacitor.getPlatform();
      if (platform !== 'ios' && platform !== 'android') return;

      try {
        await fetch('/api/push/register', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            token,
            provider: 'fcm',
            platform,
          }),
        });
      } catch (error) {
        console.error('Failed to register push token:', error);
      }
    };

    const handleAuthCode = async (code: string, next: string) => {
      try {
        const response = await fetch('/api/auth/exchange-code', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            code,
            next,
          }),
        });

        const body = (await response.json().catch(() => null)) as
          | { redirectPath?: string; error?: string }
          | null;

        if (!response.ok) {
          console.error('Failed to exchange auth code:', body?.error || 'unknown error');
          router.replace('/auth/auth-code-error');
          return;
        }

        const redirectPath = body?.redirectPath || '/';
        router.replace(redirectPath);
      } catch (error) {
        console.error('Failed to handle auth callback:', error);
        router.replace('/auth/auth-code-error');
      } finally {
        await Browser.close().catch(() => undefined);
      }
    };

    const setup = async () => {
      const pushPermission = await PushNotifications.requestPermissions();
      if (pushPermission.receive === 'granted') {
        await PushNotifications.register();
      }

      listeners.push(
        await PushNotifications.addListener('registration', (token) => {
          void registerPushToken(token.value);
        })
      );

      listeners.push(
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        })
      );

      listeners.push(
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const targetPath = extractPushPath(action);
          if (targetPath) {
            router.push(targetPath);
          }
        })
      );

      listeners.push(
        await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
          const parsed = parseIncomingUrl(url);
          if (!parsed) return;

          if (parsed.kind === 'auth') {
            void handleAuthCode(parsed.code, parsed.next);
            return;
          }

          router.push(parsed.path);
        })
      );
    };

    void setup();

    return () => {
      document.body.classList.remove('native-app');

      for (const listener of listeners) {
        void listener.remove().catch(() => undefined);
      }
    };
  }, [router]);

  return null;
}
