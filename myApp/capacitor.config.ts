import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.raincrm.app',
  appName: 'RainCRM',
  webDir: 'dist',
  server: {
    hostname: 'localhost',
    androidScheme: 'https'
  }
};

export default config;
