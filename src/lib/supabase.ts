import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkrsyxjcrbjujdrzqybh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN5eGpjcmJqdWpkcnpxeWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzY5NTUsImV4cCI6MjA4MzUxMjk1NX0.T0OEbaTYofqidEuia59fcOvLtchj-vLBr2YvdmwCjAY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
