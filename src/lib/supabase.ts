import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables - works in both server and client
const getSupabaseUrl = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || (typeof window === 'undefined' ? 'http://localhost:54321' : '');
};

const getSupabaseKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof window === 'undefined' ? 'demo-key' : '');
};

// Client-side only Supabase client instance for realtime subscriptions
let clientSupabaseInstance: SupabaseClient<Database> | null = null;

function getClientSupabase(): SupabaseClient<Database> | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  if (!clientSupabaseInstance) {
    try {
      const url = getSupabaseUrl();
      const key = getSupabaseKey();
      
      if (!url || url === '' || !key || key === '') {
        console.warn('⚠️ Supabase credentials not configured. Using fallback (will not work).');
      }
      
      clientSupabaseInstance = createClient<Database>(
        url || 'http://localhost:54321',
        key || 'demo-key',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        }
      );
    } catch (error) {
      console.error('Error creating client Supabase instance:', error);
      return null;
    }
  }
  return clientSupabaseInstance;
}

// Server-safe singleton Supabase client
let supabaseInstance: SupabaseClient<Database> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    
    if (!url || url === '' || !key || key === '') {
      console.warn('⚠️ Supabase credentials not configured. Using fallback (will not work).');
    }
    
    supabaseInstance = createClient<Database>(
      url || 'http://localhost:54321',
      key || 'demo-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return supabaseInstance;
})();

export function isSupabaseAvailable(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  
  return !!(
    url &&
    key &&
    url !== 'http://localhost:54321' &&
    url !== '' &&
    key !== 'demo-key' &&
    key !== ''
  );
}

// Export client getter for realtime subscriptions
export { getClientSupabase };

