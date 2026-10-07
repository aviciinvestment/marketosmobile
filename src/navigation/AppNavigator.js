import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import NotificationsPanel, { buildNotifications } from '../components/NotificationsPanel';

import AuthScreen from '../screens/AuthScreen';
import LandingScreen from '../screens/LandingScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import InsightsScreen from '../screens/InsightsScreen';

import SettingsScreen from '../screens/SettingsScreen';
import AdminScreen from '../screens/AdminScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SyncChip({ theme }) {
  const { online, isSyncing, dirty, syncError, lastSyncAt, forceSync } = useSyncContext();
  const needsSync = dirty || syncError || !online;
  const label = isSyncing ? 'Saving...' : !online ? 'Offline' : needsSync ? 'Save Online' : 'Saved';
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
  const lastSyncAge = lastSyncAt ? Date.now() - lastSyncAt : Infinity;
  const show = !online || lastSyncAge > 2 * 60 * 1000 || syncError;
  if (!show) return null;

  const title = !online ? 'You are offline' : syncError ? 'Could not reach the cloud' : 'Your records have not synced for a while';

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
            Please go online so the records saved on this device get uploaded to your account.
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
          {isSyncing ? 'Syncing...' : 'Retry Now'}
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

// Small helper so the header can navigate to the Settings tab without
// prop-drilling through the navigator tree.

function MainTabs({ navigation }) {
  const { isDarkMode, setIsDarkMode, themeLoaded, products, sales, expenses, online, lastSyncAt, syncError, otherDevicePending } =
    useSyncContext();
  const theme = getTheme(isDarkMode);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.mutedForeground,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        }}
      >
        <Tab.Screen
          name="Products"
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="cube" size={size} color={color} /> }}
        >
          {(props) => <ProductsScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen
          name="Home"
          options={{ 
            tabBarIcon: ({ focused }) => (
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                marginTop: -6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? theme.primary : theme.primary + '1A',
                borderWidth: 2,
                borderColor: focused ? theme.primary : theme.primary + '73',
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: focused ? 0.55 : 0,
                shadowRadius: 8,
                elevation: focused ? 8 : 0,
              }}>
                <Ionicons name="home" size={22} color={focused ? '#000000' : theme.primary} />
              </View>
            ),
            tabBarLabel: ''
          }}
        >
          {(props) => <HomeScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen
          name="Insights"
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} /> }}
        >
          {(props) => <InsightsScreen {...props} />}
        </Tab.Screen>
      </Tab.Navigator>

      <NotificationsPanel visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </View>
  );
}

export default function AppNavigator() {
  const { user, authLoading, isFounder, isDarkMode } = useSyncContext();
  const theme = getTheme(isDarkMode);

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
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{
                headerShown: true,
                headerBackTitleVisible: false,
                headerStyle: { backgroundColor: theme.card },
                headerTintColor: theme.foreground,
              }}
            />
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
});
