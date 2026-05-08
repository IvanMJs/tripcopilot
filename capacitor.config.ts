import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.tripcopilot.mobile',
  appName: 'TripCopilot',
  webDir: 'out', // required placeholder — app loads via server.url in all environments
  server: {
    url: 'https://tripcopilot.vercel.app',
    cleartext: false,
    allowNavigation: ['tripcopilot.vercel.app'],
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    App: {},
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#080810',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
