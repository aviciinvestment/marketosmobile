import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  isVoiceGuideEnabled,
  setVoiceGuideEnabled,
  subscribeVoiceGuide,
  stopSpeech,
  readPage,
  getActivePage,
} from '../voiceGuide';
import { useAppLang, useAppT } from '../i18n';

const DEFAULT_THEME = {
  primary: '#F5C518',
  surface: 'rgba(15,23,42,0.8)',
  border: 'rgba(148,163,184,0.35)',
  mutedForeground: '#94a3b8',
};

export default function VoiceGuideButton({ page, theme, onStatusChange }) {
  const lang = useAppLang();
  const t = useAppT();
  const colors = theme || DEFAULT_THEME;
  const [enabled, setEnabled] = useState(isVoiceGuideEnabled());

  useEffect(() => {
    return subscribeVoiceGuide((next) => {
      setEnabled(next);
      onStatusChange?.(next);
    });
  }, [onStatusChange]);

  const handleToggle = () => {
    const next = !enabled;
    setVoiceGuideEnabled(next);
    setEnabled(next);
    onStatusChange?.(next);
    if (next) {
      setTimeout(() => readPage(page || getActivePage(), lang), 150);
    } else {
      stopSpeech();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleToggle}
      accessibilityLabel={enabled ? t('voice.headerOn') : t('voice.headerOff')}
      style={[
        styles.btn,
        enabled
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons
        name={enabled ? 'volume-high' : 'volume-mute'}
        size={16}
        color={enabled ? '#000000' : colors.mutedForeground}
      />
      {enabled && <View style={[styles.dot, { backgroundColor: '#34d399' }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
