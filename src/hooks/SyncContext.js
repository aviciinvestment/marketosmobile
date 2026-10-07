import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useSync, getUserStorageKeys } from './useSync';
import { ADMIN_EMAIL } from '../config/api';

const SyncContext = createContext(null);

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';

export const SyncProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Dark mode is the marketOS default, persisted like the web's `marketos_theme`.
  const [isDarkMode, setIsDarkModeState] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Avatar persisted like the web's `marketos_user_avatar`.
  const [avatarUrl, setAvatarUrlState] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('marketos_theme');
        if (saved !== null) setIsDarkModeState(saved === 'dark');
      } catch {}
      setThemeLoaded(true);
    })();
  }, []);

  const setIsDarkMode = useCallback((value) => {
    setIsDarkModeState(value);
    AsyncStorage.setItem('marketos_theme', value ? 'dark' : 'light').catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('marketos_user_avatar');
        if (cached) setAvatarUrlState(cached);
      } catch {}
    })();
  }, []);

  const setAvatarUrl = useCallback((url) => {
    setAvatarUrlState(url || DEFAULT_AVATAR);
    AsyncStorage.setItem('marketos_user_avatar', url || DEFAULT_AVATAR).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const syncState = useSync(user);

  const isFounder = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Mirror the web's logout: wipe this device's cached records so the next
  // account on the phone never sees the previous merchant's data.
  const logout = useCallback(async () => {
    try {
      const uid = user?.uid || auth.currentUser?.uid;
      if (uid) {
        const ks = getUserStorageKeys(uid);
        await AsyncStorage.multiRemove([
          ks.p,
          ks.s,
          ks.e,
          ks.deleted,
          ks.hash,
          ks.lastSync,
          ks.tombstones,
        ]);
      }
      await AsyncStorage.multiRemove([
        'marketos_products_v2',
        'marketos_sales_v2',
        'marketos_expenses_v2',
        'marketos_deleted_v2',
      ]);
    } catch {}
    await signOut(auth);
  }, [user]);

  const value = {
    user,
    authLoading,
    themeLoaded,
    isDarkMode,
    setIsDarkMode,
    avatarUrl,
    setAvatarUrl,
    defaultAvatar: DEFAULT_AVATAR,
    isFounder,
    logout,
    ...syncState,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSyncContext = () => useContext(SyncContext);
