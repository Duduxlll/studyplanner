'use client';

import { createContext, useContext, useState } from 'react';

const AvatarContext = createContext<{
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
}>({ avatarUrl: '', setAvatarUrl: () => {} });

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState('');
  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  return useContext(AvatarContext);
}
