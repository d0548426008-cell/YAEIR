import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hebrew.namefixer.pro',
  appName: 'מתקן שמות בעברית',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Filesystem: {
      allowNetwork: true
    }
  }
};

export default config;
