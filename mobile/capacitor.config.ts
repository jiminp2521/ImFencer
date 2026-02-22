import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://imfencer.com';
const resolvedServerHost = (() => {
  try {
    return new URL(serverUrl).host;
  } catch {
    return 'imfencer.com';
  }
})();

const config: CapacitorConfig = {
  appId: 'com.imfencer.app',
  appName: 'ImFencer',
  webDir: 'www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    allowNavigation: [resolvedServerHost],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
