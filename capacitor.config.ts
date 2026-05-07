import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.tripcopilot.mobile',
  appName: 'TripCopilot',
  webDir: 'out', // required placeholder — app loads via server.url in all environments
  server: {
    url: 'https://tripcopilot.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
