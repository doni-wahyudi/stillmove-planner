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
        
        // Create Supabase client and wrap with Proxy for profile isolation
        const rawClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const handler = {
            get(target, prop, receiver) {
                if (prop === 'from') {
                    return function (relation) {
                        const queryBuilder = target.from(relation);
                        
                        // Tables that are global or don't have profile_id columns
                        const exemptRelations = [
                            'profiles', 
                            'sub_profiles', 
                            'user_profiles',
                            'kanban_checklist_items',
                            'kanban_attachments',
                            'kanban_comments',
                            'kanban_activity_log',
                            'kanban_columns',
                            'kanban_cards',
                            'flowchart_nodes',
                            'flowchart_edges',
                            'mindmap_nodes',
                            'challenge_habits',
                            'challenge_completions'
                        ];
                        
                        if (exemptRelations.includes(relation)) {
                            return queryBuilder;
                        }

                        const activeProfileId = localStorage.getItem('stillmove_active_profile_id');
                        if (!activeProfileId) return queryBuilder;

                        // Proxy the query builder to inject profile_id on select, update, delete, insert, upsert
                        return new Proxy(queryBuilder, {
                            get(builderTarget, builderProp) {
                                if (builderProp === 'select' || builderProp === 'update' || builderProp === 'delete') {
                                    return function (...args) {
                                        const result = builderTarget[builderProp](...args);
                                        return result.eq('profile_id', activeProfileId);
                                    };
                                }
                                if (builderProp === 'insert') {
                                    return function (values, ...args) {
                                        if (Array.isArray(values)) {
                                            values.forEach(val => {
                                                if (val && !val.profile_id) val.profile_id = activeProfileId;
                                            });
                                        } else if (values && typeof values === 'object') {
                                            if (!values.profile_id) values.profile_id = activeProfileId;
                                        }
                                        return builderTarget.insert(values, ...args);
                                    };
                                }
                                if (builderProp === 'upsert') {
                                    return function (values, ...args) {
                                        if (Array.isArray(values)) {
                                            values.forEach(val => {
                                                if (val && !val.profile_id) val.profile_id = activeProfileId;
                                            });
                                        } else if (values && typeof values === 'object') {
                                            if (!values.profile_id) values.profile_id = activeProfileId;
                                        }
                                        return builderTarget.upsert(values, ...args);
                                    };
                                }
                                const val = builderTarget[builderProp];
                                return typeof val === 'function' ? val.bind(builderTarget) : val;
                            }
                        });
                    };
                }
                const val = target[prop];
                return typeof val === 'function' ? val.bind(target) : val;
            }
        };

        supabaseClient = new Proxy(rawClient, handler);
        console.log('Supabase client with Profile Proxy initialized successfully');
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
