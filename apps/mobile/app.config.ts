import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'VitaPeak',
  slug: 'vitapeak',
  scheme: 'vitapeak',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.vitapeak.mobile',
  },
  android: {
    package: 'app.vitapeak.mobile',
    adaptiveIcon: {
      backgroundColor: '#0ea5e9',
    },
  },
  web: {
    bundler: 'metro',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
