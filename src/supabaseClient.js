import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mediqnwfubgbyhpxhows.supabase.co' // Supabase dashboard > Project Settings > API > URL

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZGlxbndmdWJnYnlocGh4b3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2NzU2MDAsImV4cCI6MjA5MzI1MTYwMH0.abcdef' // Supabase > Project Settings > API > anon public key kopyala

export const supabase = createClient(supabaseUrl, supabaseAnonKey)