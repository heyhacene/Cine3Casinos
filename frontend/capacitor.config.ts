import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heyhacene.cine3casinos',
  appName: 'Ciné 3 Casinos',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#F59E0B'
    }
  }
};

export default config;
