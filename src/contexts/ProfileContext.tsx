import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getSupabaseClient } from '@/db/supabase';
import { useAuth } from './AuthContext';

export interface SubProfile {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  avatar_data: string | null;
  color: string; // Frontend mapped color
  created_at: string;
}

interface ProfileContextType {
  profiles: SubProfile[];
  activeProfile: SubProfile | null;
  isLoading: boolean;
  switchProfile: (profileId: string) => void;
  createProfile: (name: string, emoji?: string) => Promise<SubProfile>;
  updateProfile: (
    profileId: string,
    updates: Partial<Pick<SubProfile, 'name' | 'emoji' | 'avatar_data'>>
  ) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

const PROFILE_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
];

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [profiles, setProfiles] = useState<SubProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<SubProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getSupabaseClient();

  const getProfileColor = useCallback((index: number) => {
    return PROFILE_COLORS[index % PROFILE_COLORS.length];
  }, []);

  const mapDbProfile = useCallback((dbProfile: any, index: number): SubProfile => {
    return {
      id: dbProfile.id,
      user_id: dbProfile.user_id,
      name: dbProfile.name,
      emoji: dbProfile.emoji || '👤',
      avatar_data: dbProfile.avatar_data || null,
      color: getProfileColor(index),
      created_at: dbProfile.created_at,
    };
  }, [getProfileColor]);

  const loadProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setActiveProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sub_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      let profileList = data || [];

      // Create default "Personal" profile if none exist
      if (profileList.length === 0) {
        const { data: newProfile, error: createError } = await supabase
          .from('sub_profiles')
          .insert([
            {
              user_id: user.id,
              name: 'Personal',
              emoji: '👤',
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        profileList = [newProfile];
      }

      const mappedProfiles = profileList.map((p, idx) => mapDbProfile(p, idx));
      setProfiles(mappedProfiles);

      // Restore previously active profile from localStorage
      const savedProfileId = localStorage.getItem('stillmove_active_profile_id');
      const savedProfile = mappedProfiles.find((p) => p.id === savedProfileId);
      const defaultProfile = savedProfile || mappedProfiles[0];

      setActiveProfile(defaultProfile);
      localStorage.setItem('stillmove_active_profile_id', defaultProfile.id);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, mapDbProfile]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfiles();
    } else {
      setProfiles([]);
      setActiveProfile(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, loadProfiles]);

  const switchProfile = useCallback(
    (profileId: string) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setActiveProfile(profile);
        localStorage.setItem('stillmove_active_profile_id', profileId);
        if (user) {
          supabase
            .from('profiles')
            .update({ active_profile_id: profileId })
            .eq('id', user.id)
            .then(({ error }) => {
              if (error) console.error('Error syncing active profile:', error);
            });
        }
      }
    },
    [profiles, user, supabase]
  );

  const createProfile = useCallback(
    async (name: string, emoji = '👤') => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sub_profiles')
        .insert([
          {
            user_id: user.id,
            name,
            emoji,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const mapped = mapDbProfile(data, profiles.length);
      setProfiles((prev) => [...prev, mapped]);
      return mapped;
    },
    [user, supabase, profiles.length, mapDbProfile]
  );

  const updateProfile = useCallback(
    async (
      profileId: string,
      updates: Partial<Pick<SubProfile, 'name' | 'emoji' | 'avatar_data'>>
    ) => {
      const { error } = await supabase
        .from('sub_profiles')
        .update(updates)
        .eq('id', profileId);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, ...updates } : p))
      );

      if (activeProfile?.id === profileId) {
        setActiveProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      }
    },
    [supabase, activeProfile]
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      if (profiles.length <= 1) {
        throw new Error('Cannot delete the only profile');
      }

      const { error } = await supabase
        .from('sub_profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      const remaining = profiles.filter((p) => p.id !== profileId);
      setProfiles(remaining);

      // If active profile was deleted, switch to first available
      if (activeProfile?.id === profileId) {
        const next = remaining[0];
        setActiveProfile(next);
        localStorage.setItem('stillmove_active_profile_id', next.id);
      }
    },
    [supabase, profiles, activeProfile]
  );

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        isLoading,
        switchProfile,
        createProfile,
        updateProfile,
        deleteProfile,
        refreshProfiles: loadProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

export default ProfileContext;
