import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatRelative } from '../utils/format';
import { ADMIN_EMAIL, getApiEndpoints } from '../config/api';
import SupportWidget from '../components/SupportWidget';
import LegalModal from '../components/LegalModal';
import { useAppT, useAppLang, setAppLang, LANGUAGE_CODES, LANGUAGE_META } from '../i18n';
import {
  isVoiceGuideEnabled,
  setVoiceGuideEnabled,
  subscribeVoiceGuide,
  stopSpeech,
  readPage,
} from '../voiceGuide';

const AVATAR_PRESETS = [
  {
    id: 'p1',
    name: 'Entrepreneur',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'p2',
    name: 'Professional',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'p3',
    name: 'Founder',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'p4',
    name: 'Merchant',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'p5',
    name: 'Director',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
];

export default function SettingsScreen({ navigation }) {
  const {
    user,
    isDarkMode,
    setIsDarkMode,
    avatarUrl,
    setAvatarUrl,
    isFounder,
    logout,
    online,
    isSyncing,
    dirty,
    syncError,
    lastSyncAt,
    forceSync,
    clearAllData,
  } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const t = useAppT();
  const currentLang = useAppLang();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
  const [showPasteUrl, setShowPasteUrl] = useState(false);
  const [pasteUrlValue, setPasteUrlValue] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [legalTab, setLegalTab] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(isVoiceGuideEnabled());

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  useEffect(() => subscribeVoiceGuide((next) => setVoiceEnabled(next)), []);

  const handleVoiceToggle = (next) => {
    setVoiceGuideEnabled(next);
    setVoiceEnabled(next);
    if (next) {
      setTimeout(() => readPage('settings', currentLang), 150);
    } else {
      stopSpeech();
    }
  };

  // Upload the picked image to the backend (Cloudinary via the server) so we
  // store a short CDN url instead of a huge data url. Falls back to the local
  // data url when offline or the server is unavailable — same as the web app.
  const uploadAvatarToBackend = async (dataUrl) => {
    try {
      const endpoints = await getApiEndpoints();
      const res = await fetch(endpoints.uploadAvatar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, userId: user?.uid || '' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) return data.url;
      }
    } catch {
      // fall through to local image
    }
    return null;
  };

  const handleUploadPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Allow photo library access so you can upload a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        Alert.alert(
          'Image File Too Large',
          'Please select an image smaller than 2MB so your application loads smoothly.'
        );
        return;
      }
      const dataUrl = asset.base64 ? 'data:image/jpeg;base64,' + asset.base64 : asset.uri;
      const remoteUrl = await uploadAvatarToBackend(dataUrl);
      setAvatarUrl(remoteUrl || dataUrl);
    } catch {
      Alert.alert('Upload Failed', 'Could not read that image. Please try another photo.');
    }
  };

  const handlePasteUrlSave = () => {
    const url = (pasteUrlValue || '').trim();
    if (!url) return;
    setAvatarUrl(url);
    setPasteUrlValue('');
    setShowPasteUrl(false);
  };

  const handleSaveProfile = async () => {
    setIsUpdatingProfile(true);
    setProfileSuccessMessage('');
    try {
      if (auth.currentUser) {
        const profileUpdate = { displayName: displayName.trim() };
        // Firebase rejects oversized data-urls; keep those local-only so the
        // display-name save still succeeds, while real URLs sync to the account.
        const isDataUrl = typeof avatarUrl === 'string' && avatarUrl.startsWith('data:');
        if (!isDataUrl || avatarUrl.length <= 2000) {
          profileUpdate.photoURL = avatarUrl;
        }
        await updateProfile(auth.currentUser, profileUpdate);
      }
      setAvatarUrl(avatarUrl);
      setProfileSuccessMessage('Profile and picture updated successfully!');
      setTimeout(() => setProfileSuccessMessage(''), 3000);
    } catch {
      Alert.alert('Update Failed', 'Could not save your profile changes. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      t('confirm.resetTitle'),
      t('confirm.resetDesc'),
      [
        { text: t('action.cancel'), style: 'cancel' },
        { text: t('confirm.yesClear'), style: 'destructive', onPress: () => clearAllData() },
      ],
      { cancelable: true }
    );
  };

  const handleSignOut = () => {
    logout();
  };

  const needsSync = dirty || syncError || !online;
  const syncStatus = !online ? t('status.offline') : needsSync ? t('status.unsaved') : t('status.active');
  const syncDotColor = !online ? theme.red : needsSync ? theme.primary : theme.emerald;
  const syncBtnDisabled = isSyncing || (!dirty && !syncError && online && lastSyncAt != null);
  const syncBtnLabel = isSyncing ? t('sync.saving') : needsSync ? t('sync.saveOnline') : t('sync.saved');

  const micro = { fontSize: 11, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 1 };

  const sectionRow = (icon, title, subtitle, onPress, iconColor) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: (iconColor || theme.primary) + '1F', borderColor: (iconColor || theme.primary) + '40' },
        ]}
      >
        <Ionicons name={icon} size={16} color={iconColor || theme.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: theme.foreground }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 2, lineHeight: 15 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ marginBottom: 18 }}>
        <Text style={{ color: theme.foreground, fontSize: 24, fontWeight: '900', letterSpacing: -0.6 }}>
          {t('title.settings')}
        </Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 3 }}>
          {t('settings.subtitle')}
        </Text>
      </View>

      {/* Profile Details & Photo Editor */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '800' }}>{t('settings.profileTitle')}</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4, marginBottom: 16 }}>
          {t('settings.profileDesc')}
        </Text>

        <View style={[styles.photoBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: theme.primary }]} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.foreground }}>Profile Photo</Text>
            <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 3, lineHeight: 16 }}>
              Upload your own photo or pick a curated business avatar below
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleUploadPhoto}
                style={[styles.pillBtn, { backgroundColor: theme.surfaceHover, borderColor: theme.border }]}
              >
                <Ionicons name="cloud-upload-outline" size={13} color={theme.primary} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.foreground, marginLeft: 5 }}>
                  Upload
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowPasteUrl((v) => !v)}
                style={[styles.pillBtn, { backgroundColor: theme.surfaceHover, borderColor: theme.border }]}
              >
                <Ionicons name="link-outline" size={13} color={theme.mutedForeground} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.mutedForeground, marginLeft: 5 }}>
                  Paste URL
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showPasteUrl && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.foreground,
                  marginBottom: 0,
                },
              ]}
              value={pasteUrlValue}
              onChangeText={setPasteUrlValue}
              placeholder="https://example.com/photo.jpg"
              placeholderTextColor={theme.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!(pasteUrlValue || '').trim()}
              onPress={handlePasteUrlSave}
              style={[
                styles.saveUrlBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: (pasteUrlValue || '').trim() ? 1 : 0.5,
                },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#000' }}>{t('action.save')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[micro, { marginTop: 18, marginBottom: 10 }]}>QUICK AVATAR PRESETS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {AVATAR_PRESETS.map((preset) => {
            const isSelected = avatarUrl === preset.url;
            return (
              <TouchableOpacity
                key={preset.id}
                activeOpacity={0.85}
                onPress={() => setAvatarUrl(preset.url)}
                style={[
                  styles.preset,
                  {
                    borderColor: isSelected ? theme.primary : theme.border,
                    opacity: isSelected ? 1 : 0.65,
                  },
                ]}
              >
                <Image source={{ uri: preset.url }} style={styles.presetImg} />
                {isSelected && (
                  <View style={[styles.presetCheck, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#000" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[micro, { marginTop: 18, marginBottom: 8 }]}>{t('auth.email')}</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surface, borderColor: theme.border, color: theme.mutedForeground },
          ]}
          value={user?.email || ''}
          editable={false}
          autoCapitalize="none"
        />

        <Text style={[micro, { marginTop: 14, marginBottom: 8 }]}>DISPLAY NAME</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground },
          ]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your Name or Store Name"
          placeholderTextColor={theme.mutedForeground}
        />

        {profileSuccessMessage ? (
          <View
            style={[
              styles.successBox,
              { backgroundColor: theme.emerald + '1A', borderColor: theme.emerald + '4D' },
            ]}
          >
            <Ionicons name="checkmark-circle" size={15} color={theme.emerald} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.emerald, marginLeft: 8, flex: 1 }}>
              {profileSuccessMessage}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isUpdatingProfile}
          onPress={handleSaveProfile}
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.primary, marginTop: 16, opacity: isUpdatingProfile ? 0.6 : 1 },
          ]}
        >
          {isUpdatingProfile ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name="checkmark" size={17} color="#000" />
          )}
          <Text style={{ color: '#000', fontWeight: '800', fontSize: 14, marginLeft: 8 }}>
            {isUpdatingProfile ? 'Saving Profile...' : 'Save Profile'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Appearance */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '800' }}>{t('settings.appearance')}</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4, marginBottom: 14 }}>
          {t('settings.themeDesc')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsDarkMode(false)}
            style={[
              styles.themeBtn,
              {
                borderColor: !isDarkMode ? theme.gold : theme.border,
                backgroundColor: !isDarkMode ? theme.gold + '1A' : theme.surface,
              },
            ]}
          >
            <Ionicons name="sunny" size={16} color={!isDarkMode ? theme.gold : theme.mutedForeground} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '900',
                color: !isDarkMode ? theme.gold : theme.mutedForeground,
                marginLeft: 8,
              }}
            >
              {t('settings.lightMode')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsDarkMode(true)}
            style={[
              styles.themeBtn,
              {
                borderColor: isDarkMode ? theme.gold : theme.border,
                backgroundColor: isDarkMode ? theme.gold + '1A' : theme.surface,
              },
            ]}
          >
            <Ionicons name="moon" size={16} color={isDarkMode ? theme.gold : theme.mutedForeground} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '900',
                color: isDarkMode ? theme.gold : theme.mutedForeground,
                marginLeft: 8,
              }}
            >
              {t('settings.darkMode')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Language */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '800' }}>{t('settings.languageTitle')}</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4, marginBottom: 14 }}>
          {t('settings.languageDesc')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGUAGE_CODES.map((langKey) => {
            const active = currentLang === langKey;
            const meta = LANGUAGE_META[langKey];
            return (
              <TouchableOpacity
                key={langKey}
                activeOpacity={0.85}
                onPress={() => setAppLang(langKey)}
                style={[
                  styles.langChip,
                  {
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 12 }}>{meta.flag}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: active ? '900' : '700',
                    color: active ? '#000' : theme.mutedForeground,
                    marginLeft: 5,
                  }}
                >
                  {meta.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Voice Explanation */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="volume-high" size={18} color={theme.gold} />
          <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '800' }}>{t('voice.title')}</Text>
        </View>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4, marginBottom: 14 }}>
          {t('voice.desc')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleVoiceToggle(true)}
            style={[
              styles.voiceBtn,
              {
                borderColor: voiceEnabled ? theme.primary : theme.border,
                backgroundColor: voiceEnabled ? theme.primary + '1A' : theme.surface,
              },
            ]}
          >
            <Ionicons name="volume-high" size={15} color={voiceEnabled ? theme.gold : theme.mutedForeground} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                marginLeft: 6,
                color: voiceEnabled ? theme.gold : theme.mutedForeground,
              }}
            >
              {t('voice.on')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleVoiceToggle(false)}
            style={[
              styles.voiceBtn,
              {
                borderColor: !voiceEnabled ? theme.primary : theme.border,
                backgroundColor: !voiceEnabled ? theme.primary + '1A' : theme.surface,
              },
            ]}
          >
            <Ionicons name="volume-mute" size={15} color={!voiceEnabled ? theme.gold : theme.mutedForeground} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                marginLeft: 6,
                color: !voiceEnabled ? theme.gold : theme.mutedForeground,
              }}
            >
              {t('voice.off')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cloud Sync */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '800' }}>Cloud Sync</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4, marginBottom: 14 }}>
          Your records stay backed up across every signed-in device
        </Text>
        <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.dot, { backgroundColor: syncDotColor }]} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.foreground }}>{syncStatus}</Text>
            <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 2 }}>
              {lastSyncAt ? `Last saved ${formatRelative(lastSyncAt)}` : 'Local device storage active'}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={syncBtnDisabled}
            onPress={() => !syncBtnDisabled && forceSync()}
            style={[
              styles.syncBtn,
              {
                backgroundColor: needsSync ? theme.primary : theme.surface,
                borderColor: needsSync ? theme.primary : theme.border,
                opacity: syncBtnDisabled ? 0.6 : 1,
              },
            ]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={needsSync ? '#000' : theme.mutedForeground} />
            ) : (
              <Ionicons
                name="refresh"
                size={13}
                color={needsSync ? '#000' : theme.mutedForeground}
                style={{ marginRight: 5 }}
              />
            )}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: needsSync ? '#000' : theme.mutedForeground,
              }}
            >
              {syncBtnLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Support */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '800' }}>Support</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4, marginBottom: 14 }}>
          Something broken? Send it straight to the founder
        </Text>
        {sectionRow(
          'help-circle-outline',
          'Need help?',
          'Open the support desk to report a bug or ask a question',
          () => setSupportOpen(true),
          theme.sky
        )}
      </View>

      {/* Legal */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '800' }}>Legal</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 4, marginBottom: 14 }}>
          Our policies, grounded in Nigerian law
        </Text>
        {sectionRow(
          'shield-checkmark-outline',
          'Privacy Policy',
          'How we collect, protect and process your data (NDPA 2023)',
          () => setLegalTab('privacy'),
          theme.emerald
        )}
        <View style={{ height: 10 }} />
        {sectionRow(
          'document-text-outline',
          'Terms & Conditions',
          'The agreement governing your use of marketOS',
          () => setLegalTab('terms'),
          theme.primary
        )}
      </View>

      {/* Founder shortcut */}
      {isFounder && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.primary + '4D' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="shield-checkmark" size={18} color={theme.primary} />
            <Text
              style={{
                color: theme.foreground,
                fontSize: 16,
                fontWeight: '800',
                marginLeft: 8,
                flex: 1,
              }}
            >
              Founder Mission Control
            </Text>
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 1 }}>FOUNDER</Text>
            </View>
          </View>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>
            Clearance authorized for <Text style={{ color: theme.primary, fontWeight: '800' }}>{ADMIN_EMAIL}</Text>.
            Monitor live server interactions (200, 401, 500), detect customer issues in real-time, and resolve
            complaints.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation && navigation.navigate('Admin')}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="pulse" size={16} color="#000" />
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>
              Mission Control (Admin)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Danger Zone */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.red, fontSize: 16, fontWeight: '800', marginBottom: 14 }}>{t('settings.dangerZone')}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleClearAllData}
          style={[
            styles.dangerOutline,
            { backgroundColor: theme.red + '14', borderColor: theme.red + '4D' },
          ]}
        >
          <Ionicons name="trash-outline" size={16} color={theme.red} />
          <Text style={{ color: theme.red, fontWeight: '800', fontSize: 13, marginLeft: 8 }}>{t('settings.clearAllData')}</Text>
        </TouchableOpacity>
        <View style={{ height: 12 }} />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSignOut}
          style={[styles.primaryBtn, { backgroundColor: theme.red }]}
        >
          <Ionicons name="log-out-outline" size={17} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginLeft: 8 }}>{t('action.signout')}</Text>
        </TouchableOpacity>
      </View>

      <SupportWidget visible={supportOpen} onClose={() => setSupportOpen(false)} />
      <LegalModal visible={!!legalTab} initialTab={legalTab || 'privacy'} onClose={() => setLegalTab(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 22, borderWidth: 1, padding: 20, marginBottom: 16 },
  photoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3 },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  preset: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
  },
  presetImg: { width: '100%', height: '100%' },
  presetCheck: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 0,
  },
  saveUrlBtn: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginLeft: 4 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginLeft: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dangerOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 13,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
  },
});
