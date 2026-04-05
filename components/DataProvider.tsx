'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAvatar } from '@/components/AvatarProvider';
import { upsertSavedAccount } from '@/lib/saved-accounts';

export interface Channel {
  id: number;
  name: string;
  channel_id: string;
  thumbnail: string;
  description: string;
  is_playlist: number;
}

export interface Plan {
  id: number;
  title: string;
  topics: string;
  hours_per_day: number;
  total_days: number;
  created_at: string;
}

interface DataCtx {
  channels: Channel[];
  plans: Plan[];
  hasPassword: boolean | null;
  loading: boolean;
  lastLoadedAt: number;
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { setAvatarUrl } = useAvatar();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setLoading(false);
      setLoaded(false);
      setChannels([]);
      setPlans([]);
      return;
    }
    if (status !== 'authenticated' || loaded) return;

    setLoaded(true);
    setLoading(true);

    Promise.all([
      fetch('/api/home').then(r => r.json()),
      fetch('/api/profile').then(r => r.json()),
    ]).then(([home, profile]) => {
      if (Array.isArray(home.channels)) setChannels(home.channels);
      if (Array.isArray(home.plans)) setPlans(home.plans);

      const url = profile.user?.avatar_url || profile.googleImage || '';
      if (url) setAvatarUrl(url);
      setHasPassword(profile.has_password ?? true);
      setLastLoadedAt(Date.now());

      if (session?.user?.email) {
        upsertSavedAccount({
          email: session.user.email,
          name: profile.user?.name || session.user.name || '',
          avatarUrl: url,
          provider: session.user.image && !profile.user?.avatar_url ? 'google' : 'credentials',
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [status]);

  return (
    <Ctx.Provider value={{ channels, plans, hasPassword, loading, lastLoadedAt, setChannels, setPlans }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider');
  return ctx;
}
