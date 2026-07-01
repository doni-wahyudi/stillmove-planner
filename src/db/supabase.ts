import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// Tables that don't use profile_id isolation
const EXEMPT_RELATIONS = [
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
  'challenge_completions',
];

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns a proxied Supabase client that automatically injects
 * profile_id filters on every query for profile-isolated tables.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (
      (SUPABASE_URL as string) === 'YOUR_SUPABASE_URL' ||
      (SUPABASE_ANON_KEY as string) === 'YOUR_SUPABASE_ANON_KEY'
    ) {
      console.error(
        'Supabase credentials not configured. Please update src/config.ts.'
      );
      throw new Error('Supabase not configured');
    }

    const rawClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const handler: ProxyHandler<SupabaseClient> = {
      get(target, prop, _receiver) {
        if (prop === 'from') {
          return function (relation: string) {
            const queryBuilder = target.from(relation);

            if (EXEMPT_RELATIONS.includes(relation)) {
              return queryBuilder;
            }

            const activeProfileId = localStorage.getItem(
              'stillmove_active_profile_id'
            );
            if (!activeProfileId) return queryBuilder;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new Proxy(queryBuilder, {
              get(builderTarget: any, builderProp: string) {
                if (
                  builderProp === 'select' ||
                  builderProp === 'update' ||
                  builderProp === 'delete'
                ) {
                  return function (...args: any[]) {
                    const result = builderTarget[builderProp](...args);
                    return result.eq('profile_id', activeProfileId);
                  };
                }
                if (builderProp === 'insert') {
                  return function (values: any, ...args: any[]) {
                    if (Array.isArray(values)) {
                      values.forEach((val: any) => {
                        if (val && !val.profile_id)
                          val.profile_id = activeProfileId;
                      });
                    } else if (values && typeof values === 'object') {
                      if (!values.profile_id)
                        values.profile_id = activeProfileId;
                    }
                    return builderTarget.insert(values, ...args);
                  };
                }
                if (builderProp === 'upsert') {
                  return function (values: any, ...args: any[]) {
                    if (Array.isArray(values)) {
                      values.forEach((val: any) => {
                        if (val && !val.profile_id)
                          val.profile_id = activeProfileId;
                      });
                    } else if (values && typeof values === 'object') {
                      if (!values.profile_id)
                        values.profile_id = activeProfileId;
                    }
                    return builderTarget.upsert(values, ...args);
                  };
                }
                const val = builderTarget[builderProp];
                return typeof val === 'function'
                  ? val.bind(builderTarget)
                  : val;
              },
            });
          };
        }
        const val = (target as any)[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      },
    };

    supabaseClient = new Proxy(rawClient, handler) as SupabaseClient;
    console.log('Supabase client with Profile Proxy initialized successfully');
  }

  return supabaseClient;
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return (
    (SUPABASE_URL as string) !== 'YOUR_SUPABASE_URL' &&
    (SUPABASE_ANON_KEY as string) !== 'YOUR_SUPABASE_ANON_KEY'
  );
}

export default getSupabaseClient;
