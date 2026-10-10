import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_API_URL = 'https://marketos-backend-ubk0.onrender.com'; // Production URL

export const getApiBaseUrl = async () => {
  try {
    const custom = await AsyncStorage.getItem('marketos_custom_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch (e) {
    // Ignore error
  }
  return DEFAULT_API_URL.replace(/\/+$/, '');
};

export const ADMIN_EMAIL = 'victorychibuakunna@gmail.com';

export const getApiEndpoints = async () => {
  const baseUrl = await getApiBaseUrl();
  return {
    sync: `${baseUrl}/api/sync`,
    data: `${baseUrl}/api/data`,
    flagPending: `${baseUrl}/api/flag/pending`,
    flagClear: `${baseUrl}/api/flag/clear`,
    health: `${baseUrl}/api/health`,
    adminStats: `${baseUrl}/api/admin/stats`,
    adminLogs: `${baseUrl}/api/admin/logs`,
    adminComplaints: `${baseUrl}/api/admin/complaints`,
    adminTelemetry: `${baseUrl}/api/admin/telemetry`,
    supportComplaint: `${baseUrl}/api/support/complaint`,
    uploadAvatar: `${baseUrl}/api/profile/upload-avatar`,
    authValidateSignup: `${baseUrl}/api/auth/validate-signup`,
    authValidateSignin: `${baseUrl}/api/auth/validate-signin`,
    authForgotPassword: `${baseUrl}/api/auth/forgot-password`,
    paywallConfig: `${baseUrl}/api/paywall/config`,
    paywallStatus: `${baseUrl}/api/paywall/status`,
    paywallInitialize: `${baseUrl}/api/paywall/initialize`,
    paywallVerify: (reference) => `${baseUrl}/api/paywall/verify/${encodeURIComponent(reference)}`,
    adminPaywall: `${baseUrl}/api/admin/paywall`,
  };
};

/**
 * Fire-and-forget client telemetry so auth/sync failures show up in the
 * founder's Mission Control logs (mirrors the web app's behaviour).
 */
export const sendTelemetry = async (payload) => {
  try {
    const endpoints = await getApiEndpoints();
    fetch(endpoints.adminTelemetry, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
};
