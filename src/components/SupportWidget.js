import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { getApiEndpoints } from '../config/api';
import { useAppT, useAppTF } from '../i18n';

const STORAGE_KEY = 'marketos_offline_complaints';

const CATEGORIES = [
  { value: 'Sync & Connection', labelKey: 'support.catSync' },
  { value: 'Sales & Quick Sell', labelKey: 'support.catSales' },
  { value: 'Stock & Yields', labelKey: 'support.catStock' },
  { value: 'Calculations & Profit', labelKey: 'support.catCalc' },
  { value: 'Account & Auth', labelKey: 'support.catAuth' },
  { value: 'Feature Request', labelKey: 'support.catFeature' },
  { value: 'Urgent Bug', labelKey: 'support.catBug' },
];

export default function SupportWidget({ visible, onClose }) {
  const { user, isDarkMode, online } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const T = useAppT();
  const TF = useAppTF();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [category, setCategory] = useState('Sync & Connection');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOnline, setIsOnline] = useState(online !== false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  const visibleRef = useRef(visible);
  const flushingRef = useRef(false);
  const onlineRef = useRef(online !== false);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const refreshQueueCount = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const queue = stored ? JSON.parse(stored) : [];
      setOfflineQueueCount(Array.isArray(queue) ? queue.length : 0);
    } catch {
      setOfflineQueueCount(0);
    }
  }, []);

  const flushOfflineQueue = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setOfflineQueueCount(0);
        return;
      }
      const queue = JSON.parse(stored);
      if (!Array.isArray(queue) || queue.length === 0) {
        setOfflineQueueCount(0);
        return;
      }

      const endpoints = await getApiEndpoints();
      const remaining = [];
      for (const item of queue) {
        try {
          const res = await fetch(endpoints.supportComplaint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!res.ok) remaining.push(item);
        } catch {
          remaining.push(item);
        }
      }

      if (remaining.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      setOfflineQueueCount(remaining.length);
    } catch {
      // Keep whatever is queued; we retry on the next open / reconnect.
    } finally {
      flushingRef.current = false;
    }
  }, []);

  // Network listener (mobile equivalent of window online/offline events)
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected && state.isInternetReachable !== false;
      const wasOffline = !onlineRef.current;
      onlineRef.current = connected;
      setIsOnline(connected);
      if (connected && wasOffline && visibleRef.current) {
        flushOfflineQueue();
      }
    });
    return () => unsubscribe();
  }, [flushOfflineQueue]);

  // Read the queue badge on mount
  useEffect(() => {
    refreshQueueCount();
  }, [refreshQueueCount]);

  // On open: try to dispatch anything stashed offline
  useEffect(() => {
    if (visible && isOnline) flushOfflineQueue();
  }, [visible, isOnline, flushOfflineQueue]);

  const saveOffline = async (complaint) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const queue = stored ? JSON.parse(stored) : [];
      const next = Array.isArray(queue) ? [...queue, complaint] : [complaint];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setOfflineQueueCount(next.length);
    } catch {
      // Local persistence failed — nothing else we can do offline.
    }
  };

  const resetForm = () => {
    setMessage('');
    setTimeout(() => setSubmitStatus('idle'), 4500);
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage(T('support.errPhone'));
      return;
    }
    if (!message.trim()) {
      setErrorMessage(T('support.errMsg'));
      return;
    }

    setIsSubmitting(true);

    const complaint = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user?.uid || 'mobile-client',
      email: email || 'anonymous@user.com',
      phoneNumber: cleanPhone,
      category,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!isOnline) {
      await saveOffline(complaint);
      setSubmitStatus('success-offline');
      setIsSubmitting(false);
      resetForm();
      return;
    }

    try {
      const endpoints = await getApiEndpoints();
      const res = await fetch(endpoints.supportComplaint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaint),
      });

      if (res.ok) {
        setSubmitStatus('success-online');
        resetForm();
      } else {
        await saveOffline(complaint);
        setSubmitStatus('success-offline');
        resetForm();
      }
    } catch {
      await saveOffline(complaint);
      setSubmitStatus('success-offline');
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const micro = { fontSize: 11, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 1 };

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={[
                    styles.headerIcon,
                    { backgroundColor: theme.primary + '1F', borderColor: theme.primary + '4D' },
                  ]}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.primary} />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: theme.foreground }}>
                    {T('support.title')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                    <Ionicons
                      name={isOnline ? 'wifi' : 'cloud-offline-outline'}
                      size={11}
                      color={isOnline ? theme.emerald : theme.amber}
                    />
                    <Text style={{ fontSize: 11, color: theme.mutedForeground, marginLeft: 4 }}>
                      {isOnline ? (
                        <>
                          <Text style={{ color: theme.emerald, fontWeight: '700' }}>{T('support.online')}</Text> • {T('support.direct')}
                        </>
                      ) : (
                        <>
                          <Text style={{ color: theme.amber, fontWeight: '700' }}>{T('support.offline')}</Text> • {T('support.savedLocal')}
                        </>
                      )}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Ionicons name="close" size={16} color={theme.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {offlineQueueCount > 0 && (
                <View
                  style={[
                    styles.queueChip,
                    { backgroundColor: theme.amber + '1F', borderColor: theme.amber + '4D' },
                  ]}
                >
                  <Ionicons name="time-outline" size={12} color={theme.amber} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.amber, marginLeft: 5 }}>
                    {TF('support.queued', offlineQueueCount)}
                  </Text>
                </View>
              )}

              {submitStatus === 'success-online' && (
                <View
                  style={[styles.statusBox, { backgroundColor: theme.emerald + '1A', borderColor: theme.emerald + '4D' }]}
                >
                  <Ionicons name="checkmark-circle" size={18} color={theme.emerald} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.emerald }}>{T('support.gotTitle')}</Text>
                    <Text style={{ fontSize: 11, color: theme.emerald, opacity: 0.85, marginTop: 3, lineHeight: 16 }}>
                      {T('support.gotDesc')}
                    </Text>
                  </View>
                </View>
              )}

              {submitStatus === 'success-offline' && (
                <View style={[styles.statusBox, { backgroundColor: theme.amber + '1A', borderColor: theme.amber + '4D' }]}>
                  <Ionicons name="time-outline" size={18} color={theme.amber} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.amber }}>
                      {T('support.savedTitle')}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.amber, opacity: 0.85, marginTop: 3, lineHeight: 16 }}>
                      {T('support.savedDesc')}
                    </Text>
                  </View>
                </View>
              )}

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: theme.red + '1A', borderColor: theme.red + '4D' }]}>
                  <Ionicons name="alert-circle" size={15} color={theme.red} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.red, marginLeft: 8, flex: 1 }}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <Text style={[micro, { marginBottom: 8 }]}>{T('support.phoneLabel')} *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: errorMessage === T('support.errPhone') ? theme.red : theme.border,
                    color: theme.foreground,
                  },
                ]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder={T('support.phonePlaceholder')}
                placeholderTextColor={theme.mutedForeground}
                keyboardType="phone-pad"
              />
              <Text style={{ fontSize: 10, color: theme.mutedForeground, marginTop: 4 }}>
                {T('support.phoneHint')}
              </Text>

              <Text style={[micro, { marginTop: 16, marginBottom: 8 }]}>
                {T('support.emailLabel')} {T('support.emailOptional')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder={T('support.emailPlaceholder')}
                placeholderTextColor={theme.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[micro, { marginTop: 16, marginBottom: 8 }]}>{T('support.category')}</Text>
              <View style={styles.chipGrid}>
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <TouchableOpacity
                      key={c.value}
                      activeOpacity={0.85}
                      onPress={() => setCategory(c.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? theme.primary : theme.surface,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: active ? '#000' : theme.mutedForeground,
                          textAlign: 'center',
                        }}
                      >
                        {T(c.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[micro, { marginTop: 16, marginBottom: 8 }]}>{T('support.issueLabel')} *</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textarea,
                  {
                    backgroundColor: theme.surface,
                    borderColor: errorMessage === T('support.errMsg') ? theme.red : theme.border,
                    color: theme.foreground,
                  },
                ]}
                value={message}
                onChangeText={setMessage}
                placeholder={T('support.issuePlaceholder')}
                placeholderTextColor={theme.mutedForeground}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: theme.primary, marginTop: 18, opacity: isSubmitting ? 0.6 : 1 },
                ]}
              >
                <Ionicons name="send" size={15} color="#000" />
                <Text style={{ color: '#000', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>
                  {isSubmitting
                    ? 'Sending...'
                    : isOnline
                      ? T('support.sendOnline')
                      : T('support.saveOffline')}
                </Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 10, color: theme.mutedForeground, textAlign: 'center', marginTop: 10, lineHeight: 15 }}>
                {T('support.footNote')}
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '86%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  queueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  textarea: { minHeight: 96, paddingTop: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
