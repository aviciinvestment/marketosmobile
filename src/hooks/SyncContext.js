import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useSync, getUserStorageKeys } from './useSync';
import { ADMIN_EMAIL, getApiEndpoints } from '../config/api';

const SyncContext = createContext(null);

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';

// The avatar is cached per account (never a single shared key) so switching
// accounts on the same phone can't leak one merchant's picture onto another.
const avatarCacheKey = (uid) => `marketos_user_avatar_${uid}`;

export const SyncProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Dark mode is the marketOS default, persisted like the web's `marketos_theme`.
  const [isDarkMode, setIsDarkModeState] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Avatar: account-scoped, sourced from the signed-in user (photoURL) and the
  // Cloudinary-backed profile record, with a per-account local cache for speed.
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

  // Resolve the avatar whenever the signed-in account changes:
  //   1. per-account device cache (instant first paint)
  //   2. the account's Firebase photoURL
  //   3. the Cloudinary-backed avatar stored on the server (authoritative)
  useEffect(() => {
    let cancelled = false;
    const resolveAvatar = async () => {
      if (!user?.uid) {
        if (!cancelled) setAvatarUrlState(DEFAULT_AVATAR);
        return;
      }
      let next = DEFAULT_AVATAR;
      try {
        const cached = await AsyncStorage.getItem(avatarCacheKey(user.uid));
        if (cached) next = cached;
      } catch {}
      if (user.photoURL) {
        // A saved photoURL already points at the cloud (Cloudinary for uploads).
        next = user.photoURL;
      } else {
        try {
          const endpoints = await getApiEndpoints();
          const res = await fetch(endpoints.getAvatar(user.uid));
          if (res.ok) {
            const data = await res.json();
            if (data?.url) next = data.url;
          }
        } catch {}
      }
      if (cancelled) return;
      setAvatarUrlState(next);
      AsyncStorage.setItem(avatarCacheKey(user.uid), next).catch(() => {});
    };
    resolveAvatar();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.photoURL]);

  const setAvatarUrl = useCallback((url) => {
    const value = url || DEFAULT_AVATAR;
    setAvatarUrlState(value);
    const uid = auth.currentUser?.uid;
    if (uid) AsyncStorage.setItem(avatarCacheKey(uid), value).catch(() => {});
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
        // Legacy single shared avatar key — safe to drop now that avatars are
        // cached per account.
        'marketos_user_avatar',
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
