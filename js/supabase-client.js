// Supabase Client Initialization
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Import Supabase from CDN
const { createClient } = supabase;

// Initialize Supabase client
let supabaseClient = null;

/**
 * Initialize and return the Supabase client
 * @returns {Object} Supabase client instance
 */
export function getSupabaseClient() {
    if (!supabaseClient) {
        // Validate configuration
        if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
            console.error('Supabase credentials not configured. Please update js/config.js with your Supabase project credentials.');
            throw new Error('Supabase not configured');
        }
        
        // Create Supabase client
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
    }
    
    return supabaseClient;
}

/**
 * Check if Supabase is properly configured
 * @returns {boolean} True if configured, false otherwise
 */
export function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

// Export the client getter as default
export default getSupabaseClient;
