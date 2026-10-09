import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { getStoredLang, useAppT } from '../i18n';
import { isVoiceGuideEnabled, readPage, setActivePage } from '../voiceGuide';
import NotificationsPanel, { buildNotifications } from '../components/NotificationsPanel';
import VoiceGuideButton from '../components/VoiceGuideButton';
import SupportWidget from '../components/SupportWidget';

import AuthScreen from '../screens/AuthScreen';
import LandingScreen from '../screens/LandingScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import InsightsScreen from '../screens/InsightsScreen';

import SettingsScreen from '../screens/SettingsScreen';
import AdminScreen from '../screens/AdminScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Maps navigator route names to voice-guide script pages.
const ROUTE_TO_PAGE = {
  Home: 'home',
  Products: 'products',
  Insights: 'insights',
  Settings: 'settings',
  Guide: 'landing',
  Landing: 'landing',
  Admin: 'admin',
};

function getActiveRouteName(state) {
  if (!state || !state.routes || state.index == null) return null;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

function SyncChip({ theme }) {
  const { online, isSyncing, dirty, syncError, lastSyncAt, forceSync } = useSyncContext();
  const t = useAppT();
  const needsSync = dirty || syncError || !online;
  const label = isSyncing ? t('sync.saving') : !online ? t('support.offline') : needsSync ? t('sync.saveOnline') : t('sync.saved');
  const dotColor = !online ? theme.red : needsSync ? theme.primary : theme.emerald;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop = null;
    if (isSyncing) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.3, duration: 550, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulse.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isSyncing]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (needsSync && !isSyncing) forceSync();
      }}
      style={[styles.syncChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      {isSyncing ? (
        <Animated.View style={{ opacity: pulse }}>
          <Ionicons name="cloud-upload-outline" size={14} color={theme.primary} />
        </Animated.View>
      ) : (
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      )}
      <Text style={{ fontSize: 11, fontWeight: '800', color: needsSync ? theme.primary : theme.mutedForeground }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function OfflineBanner({ theme }) {
  const { online, syncError, lastSyncAt, isSyncing, forceSync } = useSyncContext();
  const t = useAppT();
  const lastSyncAge = lastSyncAt ? Date.now() - lastSyncAt : Infinity;
  const show = !online || lastSyncAge > 2 * 60 * 1000 || syncError;
  if (!show) return null;

  const title = !online ? t('banner.offlineTitle') : syncError ? t('banner.cloudTitle') : t('banner.staleTitle');

  return (
    <View style={[styles.banner, { backgroundColor: theme.primary + '1A', borderColor: theme.primary + '4D' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
        <Ionicons
          name={!online ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={18}
          color={theme.primary}
          style={{ marginTop: 1 }}
        />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: theme.primary }}>{title}</Text>
          <Text style={{ fontSize: 11, color: theme.primary, opacity: 0.9, marginTop: 2, lineHeight: 15 }}>
            {t('banner.body')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => !isSyncing && forceSync()}
        style={[styles.retryBtn, { backgroundColor: theme.primary }]}
      >
        {isSyncing ? <Ionicons name="cloud-upload-outline" size={13} color="#000" /> : <Ionicons name="refresh" size={13} color="#000" />}
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000', marginLeft: isSyncing ? 6 : 4 }}>
          {isSyncing ? t('sync.syncing') : t('sync.retry')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Header shared across all main screens — mirrors the web app header:
// avatar -> settings, sync chip, dark-mode toggle, notifications bell with dot.
function MainHeader({ theme, isDarkMode, setIsDarkMode, onOpenNotifications, hasNotifications, navigation }) {
  const { avatarUrl } = useSyncContext();

  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => navigation?.navigate('Settings')}>
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.profilePic, { borderColor: theme.primary }]}
        />
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      <View style={styles.headerIcons}>
        <SyncChip theme={theme} />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation?.navigate('Guide')}
          style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name="compass-outline" size={16} color={theme.foreground} />
        </TouchableOpacity>
        <VoiceGuideButton theme={theme} />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsDarkMode(!isDarkMode)}
          style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={16} color={theme.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenNotifications}
          style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name="notifications-outline" size={16} color={theme.foreground} />
          {hasNotifications && <View style={[styles.bellDot, { backgroundColor: theme.rose, borderColor: theme.background }]} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Floating support / chatbot trigger — mirrors the web app's bottom-right
// MessageSquare button (shown only once the user is logged in).
function SupportFab({ theme, online, onPress }) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.supportFab,
        { bottom: (insets.bottom || 0) + 92, shadowColor: theme.primary },
      ]}
    >
      <LinearGradient
        colors={['#f59e0b', '#d97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.supportFabInner}
      >
        <Ionicons name="chatbubble" size={22} color="#020617" />
      </LinearGradient>
      <View style={[styles.supportFabDot, { backgroundColor: online === false ? theme.red : theme.emerald, borderColor: theme.card }]} />
    </TouchableOpacity>
  );
}

// Floating rounded pill bottom navigation — mirrors the web app's floating
// bottom nav (Home / Stock / Insights in a single rounded bar).
const TAB_META = {
  Home: { icon: 'home', labelKey: 'nav.home' },
  Products: { icon: 'cube', labelKey: 'nav.stock' },
  Insights: { icon: 'bar-chart', labelKey: 'nav.insights' },
};

function FloatingTabBar({ state, navigation, theme, t }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBarWrap, { paddingBottom: (insets.bottom || 0) + 8 }]}>
      <View style={[styles.tabBarPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name] || { icon: 'ellipse', labelKey: route.name };
          const focused = state.index === index;
          const color = focused ? theme.primary : theme.mutedForeground;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity key={route.key} activeOpacity={0.8} onPress={onPress} style={styles.tabItem}>
              <Ionicons name={meta.icon} size={20} color={color} />
              <Text style={[styles.tabLabel, { color, fontWeight: focused ? '900' : '600' }]}>{t(meta.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Small helper so the header can navigate to the Settings tab without
// prop-drilling through the navigator tree.

function MainTabs({ navigation }) {
  const { isDarkMode, setIsDarkMode, themeLoaded, products, sales, expenses, online, lastSyncAt, syncError, otherDevicePending } =
    useSyncContext();
  const theme = getTheme(isDarkMode);
  const t = useAppT();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  if (!themeLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const hasNotifications =
    buildNotifications(products, sales, expenses, { online, lastSyncAt, syncError, otherDevicePending }).length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <MainHeader
          theme={theme}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onOpenNotifications={() => setNotificationsOpen(true)}
          hasNotifications={hasNotifications}
          navigation={navigation}
        />
        <OfflineBanner theme={theme} />
      </SafeAreaView>

      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} theme={theme} t={t} />}
      >
        <Tab.Screen name="Home">{(props) => <HomeScreen {...props} />}</Tab.Screen>
        <Tab.Screen name="Products">{(props) => <ProductsScreen {...props} />}</Tab.Screen>
        <Tab.Screen name="Insights">{(props) => <InsightsScreen {...props} />}</Tab.Screen>
      </Tab.Navigator>

      <SupportFab theme={theme} online={online} onPress={() => setSupportOpen(true)} />
      <NotificationsPanel visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <SupportWidget visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </View>
  );
}

export default function AppNavigator() {
  const { user, authLoading, isFounder, isDarkMode } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const t = useAppT();
  const lastPageRef = useRef(null);

  const handleNavigationState = (state) => {
    const routeName = getActiveRouteName(state);
    const page = routeName ? ROUTE_TO_PAGE[routeName] : null;
    if (!page || lastPageRef.current === page) return;
    lastPageRef.current = page;
    setActivePage(page);
    if (isVoiceGuideEnabled()) {
      setTimeout(() => {
        if (isVoiceGuideEnabled()) readPage(page, getStoredLang());
      }, 650);
    }
  };

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.mutedForeground, fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 }}>
          Loading marketOS...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer onReady={handleNavigationState} onStateChange={handleNavigationState}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{
                headerShown: true,
                headerTitle: t('nav.settings'),
                headerBackTitleVisible: false,
                headerStyle: { backgroundColor: theme.card },
                headerTintColor: theme.foreground,
              }}
            />
            <Stack.Screen name="Guide" component={LandingScreen} />
            {isFounder && <Stack.Screen name="Admin" component={AdminScreen} />}
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Landing" component={LandingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  profilePic: { width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 110,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  banner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 8,
  },
  tabBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
  },
  supportFab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  supportFabInner: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.4)',
  },
  supportFabDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});
