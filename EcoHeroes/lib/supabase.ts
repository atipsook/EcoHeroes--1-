import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Replace these with your actual Supabase project values
// Found in: Supabase Dashboard → Settings → API
const SUPABASE_URL = 'https://nymidjoqcdzayxamtmqn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bWlkam9xY2R6YXl4YW10bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODE2NTYsImV4cCI6MjA4ODI1NzY1Nn0.xIWg4A1Y1TqJAN1tZymvVCbWtdI9wEZiRgK9jLVQjhU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})