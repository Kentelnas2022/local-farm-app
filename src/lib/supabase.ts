import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const isServer = typeof window === 'undefined';

// SSR-safe storage adapter that prevents "ReferenceError: window is not defined"
// during Expo Router's server-side rendering / static export in Node.js
const ExpoStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mfvepedmnsuwbcipfbgq.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdmVwZWRtbnN1d2JjaXBmYmdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4OTg3NzAsImV4cCI6MjExMDQ3NDc3MH0.Sbfq0dSgg8ZNw5E2xSWNudFbmZQ-CgCiYL-Pgnu6Stg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoStorageAdapter,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: !isServer && Platform.OS === 'web',
  },
});

export default supabase;
