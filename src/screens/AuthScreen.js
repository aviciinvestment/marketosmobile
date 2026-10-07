import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { Svg, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebase';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import { sendTelemetry } from '../config/api';
import { gold } from '../utils/theme';
import BrandLogo from '../components/BrandLogo';
import LegalModal from '../components/LegalModal';
import SupportWidget from '../components/SupportWidget';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const googleConfigured = !!(WEB_CLIENT_ID || IOS_CLIENT_ID || ANDROID_CLIENT_ID);

const CONSENT_ERROR =
  'You must agree to the Terms & Conditions and Privacy Policy (NDPA 2023) to create your account.';

const TOGGLE_WIDTH = 240;
const TOGGLE_PAD = 4;
const TOGGLE_PILL_W = (TOGGLE_WIDTH - TOGGLE_PAD * 2) / 2;

function GoogleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        fill="#F4F4F5"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [legalTab, setLegalTab] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const toggleX = useRef(new Animated.Value(0)).current;

  // Hooks must always run: expo-auth-session throws if the platform client id
  // is undefined, so `clientId` carries a harmless placeholder when nothing is
  // configured (the Google button alerts instead of prompting in that case).
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID || undefined,
    iosClientId: IOS_CLIENT_ID || undefined,
    androidClientId: ANDROID_CLIENT_ID || undefined,
    clientId: WEB_CLIENT_ID || IOS_CLIENT_ID || ANDROID_CLIENT_ID || 'not-configured',
  });

  // If legal was accepted on the landing screen, pre-check consent like the web.
  useEffect(() => {
    AsyncStorage.getItem('marketos_consent_agreed').then((v) => {
      if (v === '1') setConsentAgreed(true);
    });
  }, []);

  const reportGoogleError = (message) => {
    setAuthError(message);
    sendTelemetry({
      userId: 'google-oauth-attempt',
      status: 401,
      path: '/auth/google',
      detail: 'Google sign-in error: ' + message,
    });
  };

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      reportGoogleError(response.error?.message || 'Google sign-in failed.');
      return;
    }
    if (response.type !== 'success') return;

    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken) {
      reportGoogleError('Google sign-in failed: no ID token returned.');
      return;
    }
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken)).catch((err) => {
      reportGoogleError(err?.message || String(err));
    });
  }, [response]);

  const handleAuth = async () => {
    if (submitting) return;
    setAuthError('');
    if (isSignUp && !consentAgreed) {
      setAuthError(CONSENT_ERROR);
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message);
      sendTelemetry({
        userId: email || 'anonymous',
        status: 401,
        path: isSignUp ? '/auth/signup' : '/auth/login',
        detail: 'Auth failure: ' + err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    if (!googleConfigured) {
      Alert.alert(
        'Google Sign-In Not Configured',
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / _IOS_ / _ANDROID_ to mobile/.env, then restart Expo.'
      );
      return;
    }
    if (isSignUp && !consentAgreed) {
      setAuthError(CONSENT_ERROR);
      return;
    }
    if (!request || !promptAsync) return;
    try {
      await promptAsync();
    } catch (err) {
      reportGoogleError(err?.message || String(err));
    }
  };

  const switchMode = (signUp) => {
    setIsSignUp(signUp);
    setAuthError('');
    Animated.timing(toggleX, {
      toValue: signUp ? TOGGLE_PILL_W : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const renderField = (label, value, onChangeText, options = {}) => {
    const field = label.toLowerCase().replace(/\s+/g, '');
    const focused = focusedField === field;
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={value}
          onChangeText={onChangeText}
          placeholder={options.placeholder}
          placeholderTextColor="rgba(255,255,255,0.28)"
          autoCapitalize={options.autoCapitalize || 'none'}
          underlineColorAndroid="transparent"
          selectionColor={gold}
          onFocus={() => setFocusedField(field)}
          onBlur={() => setFocusedField(null)}
          {...options.props}
        />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      {/* Ambient gold glow, like the web hero backdrop */}
      <View style={styles.glow} />

      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <BrandLogo size="md" />
            </View>

            {/* Product tour / landing page entry (web parity) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Landing')}
              style={styles.tourBtn}
            >
              <Ionicons name="compass-outline" size={14} color="#fbbf24" />
              <Text style={styles.tourBtnText}>New to marketOS? Explore Product Tour & Guide</Text>
            </TouchableOpacity>

            <Text style={styles.heading}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
            <Text style={styles.subheading}>Manage your store, track sales & profit effortlessly</Text>

            {/* Toggle - pill slider */}
            <View style={styles.toggle}>
              <Animated.View
                style={[styles.togglePill, { transform: [{ translateX: toggleX }] }]}
              />
              <TouchableOpacity activeOpacity={0.8} onPress={() => switchMode(false)} style={styles.toggleBtn}>
                <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={() => switchMode(true)} style={styles.toggleBtn}>
                <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>Sign up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {isSignUp &&
                renderField('USERNAME', username, setUsername, {
                  placeholder: 'Your Name or Business',
                  autoCapitalize: 'words',
                })}

              {renderField('EMAIL', email, setEmail, {
                placeholder: 'name@example.com',
                props: { keyboardType: 'email-address', autoCapitalize: 'none' },
              })}

              {renderField('PASSWORD', password, setPassword, {
                placeholder: '••••••••',
                props: { secureTextEntry: true },
              })}

              {isSignUp &&
                renderField('CONFIRM PASSWORD', confirmPassword, setConfirmPassword, {
                  placeholder: '••••••••',
                  props: { secureTextEntry: true },
                })}

              {isSignUp && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setConsentAgreed((v) => !v)}
                  style={styles.consentRow}
                >
                  <View style={[styles.checkbox, consentAgreed && styles.checkboxOn]}>
                    {consentAgreed && <Ionicons name="checkmark" size={12} color="#000000" />}
                  </View>
                  <Text style={styles.consentText}>
                    I agree to the{' '}
                    <Text style={styles.consentLink} onPress={() => setLegalTab('terms')}>
                      Terms & Conditions
                    </Text>{' '}
                    and consent to data processing under the{' '}
                    <Text style={styles.consentLink} onPress={() => setLegalTab('privacy')}>
                      Privacy Policy
                    </Text>{' '}
                    (NDPA 2023).
                  </Text>
                </TouchableOpacity>
              )}

              {authError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleAuth}
                disabled={submitting}
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.primaryBtnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleGoogleAuth}
                disabled={submitting}
                style={[styles.googleBtn, submitting && styles.btnDisabled]}
              >
                <GoogleIcon />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => setLegalTab('terms')}>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => setLegalTab('privacy')}>
                <Text style={styles.footerLink}>Privacy & Consent Policy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <Text style={styles.footerBadge}>NDPA 2023 Compliant</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating support button (web parity) */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setSupportOpen(true)}>
        <Ionicons name="headset" size={22} color="#000000" />
      </TouchableOpacity>

      <SupportWidget visible={supportOpen} onClose={() => setSupportOpen(false)} />

      <LegalModal
        visible={!!legalTab}
        initialTab={legalTab || 'privacy'}
        onClose={() => setLegalTab(null)}
        onAccept={() => {
          setConsentAgreed(true);
          AsyncStorage.setItem('marketos_consent_agreed', '1').catch(() => {});
          setLegalTab(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  glow: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(245,197,24,0.08)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 12,
  },
  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 20,
  },
  tourBtnText: {
    color: '#fbbf24',
    fontSize: 11.5,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  heading: {
    color: '#f4f4f5',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  subheading: {
    color: '#8a8a93',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#1a1a20',
    borderRadius: 999,
    padding: TOGGLE_PAD,
    width: TOGGLE_WIDTH,
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  togglePill: {
    position: 'absolute',
    top: TOGGLE_PAD,
    bottom: TOGGLE_PAD,
    left: TOGGLE_PAD,
    width: TOGGLE_PILL_W,
    backgroundColor: gold,
    borderRadius: 999,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 999,
  },
  toggleText: {
    fontWeight: '800',
    fontSize: 13,
    color: '#8a8a93',
  },
  toggleTextActive: {
    color: '#000000',
  },
  form: { gap: 14 },
  field: { gap: 7 },
  label: {
    color: '#8a8a93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1a1a20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '600',
  },
  inputFocused: {
    borderColor: gold,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 10,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: gold,
    borderColor: gold,
  },
  consentText: {
    flex: 1,
    color: '#8a8a93',
    fontSize: 12,
    lineHeight: 18,
  },
  consentLink: {
    color: gold,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: gold,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: '#8a8a93',
    marginHorizontal: 14,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  googleBtn: {
    backgroundColor: '#1a1a20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  googleBtnText: {
    color: '#f4f4f5',
    fontWeight: '700',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 18,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerLink: {
    color: '#8a8a93',
    fontSize: 11,
    fontWeight: '700',
  },
  footerDot: {
    color: '#6b7280',
    fontSize: 11,
  },
  footerBadge: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
