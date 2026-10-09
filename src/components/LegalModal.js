import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';

export default function LegalModal({ visible, initialTab = 'privacy', onClose, onAccept }) {
  const { isDarkMode } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (visible) setActiveTab(initialTab || 'privacy');
  }, [visible, initialTab]);

  const SectionTitle = ({ children }) => (
    <Text style={{ fontSize: 15, fontWeight: '800', color: theme.primary, marginTop: 20, marginBottom: 6 }}>
      {children}
    </Text>
  );

  const Para = ({ children }) => (
    <Text style={{ fontSize: 13, color: theme.mutedForeground, lineHeight: 20 }}>{children}</Text>
  );

  const B = ({ children }) => <Text style={{ fontWeight: '800', color: theme.foreground }}>{children}</Text>;

  const Bullet = ({ children }) => (
    <View style={{ flexDirection: 'row', marginTop: 7 }}>
      <Text style={{ color: theme.primary, fontSize: 13, marginRight: 8, lineHeight: 20 }}>•</Text>
      <Text style={{ fontSize: 13, color: theme.mutedForeground, lineHeight: 20, flex: 1 }}>{children}</Text>
    </View>
  );

  const tabChip = (tab, icon, label) => {
    const active = activeTab === tab;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setActiveTab(tab)}
        style={[
          styles.tabChip,
          {
            backgroundColor: active ? theme.primary : theme.surface,
            borderColor: active ? theme.primary : theme.border,
          },
        ]}
      >
        <Ionicons name={icon} size={13} color={active ? '#000' : theme.mutedForeground} />
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: active ? '#000' : theme.mutedForeground,
            marginLeft: 6,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: theme.primary + '1F', borderColor: theme.primary + '4D' },
                ]}
              >
                <Ionicons
                  name={activeTab === 'privacy' ? 'shield-checkmark-outline' : 'scale-outline'}
                  size={18}
                  color={theme.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: theme.foreground, letterSpacing: -0.4 }}>
                  {activeTab === 'privacy' ? 'Privacy & Consent Policy' : 'Terms & Conditions of Service'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.emerald, marginRight: 6 }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.mutedForeground, flex: 1 }}>
                    Grounded in Nigerian Law (NDPA 2023 • FCCPA 2018 • CAMA 2020)
                  </Text>
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

            <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
              {tabChip('privacy', 'shield-checkmark-outline', 'Privacy & Consent Policy')}
              {tabChip('terms', 'document-text-outline', 'Terms & Conditions')}
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {activeTab === 'privacy' ? (
                <View>
                  <View
                    style={[
                      styles.notice,
                      { backgroundColor: theme.amber + '1A', borderColor: theme.amber + '40' },
                    ]}
                  >
                    <Text style={{ fontSize: 12, color: theme.amber, lineHeight: 19 }}>
                      <B>Legal Notice & Regulatory Grounding:</B> This Privacy and Consent Policy is promulgated
                      pursuant to the <B>Nigeria Data Protection Act (NDPA) 2023</B>, overseen by the Nigeria Data
                      Protection Commission (NDPC), and the{' '}
                      <B>Cybercrimes (Prohibition, Prevention, etc.) Act 2015 (as amended 2024)</B>.
                    </Text>
                  </View>

                  <SectionTitle>1. Identity of Data Controller</SectionTitle>
                  <Para>
                    <B>marketOS</B> ("we", "us", or "our") operates as a cloud-synchronized
                    commercial retail, inventory, and point-of-sale accounting hub for Nigerian small and medium-sized
                    enterprises (SMEs) and sole proprietors. For the purposes of the NDPA 2023, marketOS acts as a Data
                    Controller regarding your business profile and a Data Processor regarding commercial transactions you
                    record on the platform.
                  </Para>

                  <SectionTitle>2. Data We Collect and Process</SectionTitle>
                  <Para>
                    Pursuant to the principles of lawful processing and data minimization (Section 24, NDPA 2023), we
                    only collect information necessary to provide our business intelligence tools:
                  </Para>
                  <Bullet>
                    <B>Account Data:</B> User full name, email address, store username, authentication credentials, and
                    optional store avatar image.
                  </Bullet>
                  <Bullet>
                    <B>Commercial Inventory Data:</B> Product names, quantities purchased, cost prices in Nigerian Naira
                    (₦), selling units (e.g. cups, bags, bottles), and unit yield ratios.
                  </Bullet>
                  <Bullet>
                    <B>Sales & Transactional Data:</B> Customer sales timestamps, quantities sold, revenue collected,
                    and payback fractions.
                  </Bullet>
                  <Bullet>
                    <B>Operational Expense Records:</B> Categorized expenditure (rent, transportation, electricity/NEPA,
                    packaging, logistics, staff salaries).
                  </Bullet>
                  <Bullet>
                    <B>Technical Diagnostics:</B> Sync timestamps, browser user agent, offline cache markers, and error
                    telemetry.
                  </Bullet>

                  <SectionTitle>3. Lawful Basis and Purpose of Processing</SectionTitle>
                  <Para>
                    Under Sections 25 and 26 of the NDPA 2023, your personal and commercial data is processed on the
                    following lawful bases:
                  </Para>
                  <Bullet>
                    <B>Express Consent:</B> By checking the consent checkbox on registration, you grant unambiguous,
                    informed consent for processing your business data.
                  </Bullet>
                  <Bullet>
                    <B>Contractual Necessity:</B> To calculate cost of goods sold, profit margins, stock depletion, and
                    synchronize records across your authorized devices.
                  </Bullet>
                  <Bullet>
                    <B>Compliance with Nigerian Commercial Law:</B> Facilitating accurate bookkeeping records in harmony
                    with the <B>Companies and Allied Matters Act (CAMA) 2020</B>.
                  </Bullet>

                  <SectionTitle>4. Security and Data Protection Safeguards</SectionTitle>
                  <Para>
                    In compliance with Section 39 of the NDPA 2023 and the Cybercrimes Act 2015, we enforce
                    industry-standard cryptographic protocols:
                  </Para>
                  <Bullet>TLS/HTTPS 256-bit encryption for all data in transit.</Bullet>
                  <Bullet>Firebase Cloud Firestore and REST sync protocols with encrypted storage at rest.</Bullet>
                  <Bullet>
                    Role-based access tokens restricting inventory records strictly to your authenticated account ID.
                  </Bullet>
                  <Bullet>Protection against unauthorized surveillance, data corruption, or unlawful transfer.</Bullet>

                  <SectionTitle>5. Data Subject Rights (NDPA 2023)</SectionTitle>
                  <Para>
                    As a user in the Federal Republic of Nigeria, you possess unconditional rights under Sections 34
                    through 38 of the NDPA 2023:
                  </Para>
                  <Bullet>
                    <B>Right to Access:</B> You can view your complete financial summary and raw product records at any
                    time.
                  </Bullet>
                  <Bullet>
                    <B>Right to Rectification:</B> Edit or update product details, selling prices, or expense items
                    directly via the application.
                  </Bullet>
                  <Bullet>
                    <B>Right to Erasure ("Right to be Forgotten"):</B> Clear your business database via the
                    Settings menu or request full account termination.
                  </Bullet>
                  <Bullet>
                    <B>Right to Data Portability:</B> Export your sales intelligence or sync with your accounting
                    records.
                  </Bullet>
                  <Bullet>
                    <B>Right to Lodge a Complaint:</B> You have the right to lodge a complaint with the Nigeria Data
                    Protection Commission (NDPC) at{' '}
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>https://ndpc.gov.ng</Text>.
                  </Bullet>

                  <SectionTitle>6. Retention and Cross-Border Transfers</SectionTitle>
                  <Para>
                    Your records are retained as long as your account remains active. Commercial accounting records are
                    kept to allow historical period comparisons (Today, Week, Month, Year, All Time). We do not sell,
                    lease, or monetize your trade secrets or customer data to third-party advertisers. Any international
                    cloud infrastructure utilized complies with Section 41 of the NDPA 2023 ensuring adequate data
                    protection standards.
                  </Para>
                </View>
              ) : (
                <View>
                  <View
                    style={[
                      styles.notice,
                      { backgroundColor: theme.amber + '1A', borderColor: theme.amber + '40' },
                    ]}
                  >
                    <Text style={{ fontSize: 12, color: theme.amber, lineHeight: 19 }}>
                      <B>Commercial Contract & Compliance:</B> These Terms & Conditions constitute a legally
                      binding agreement under the laws of the Federal Republic of Nigeria, including the{' '}
                      <B>Federal Competition and Consumer Protection Act (FCCPA) 2018</B> and <B>CAMA 2020</B>.
                    </Text>
                  </View>

                  <SectionTitle>1. Acceptance of Terms</SectionTitle>
                  <Para>
                    By registering for, accessing, or using marketOS, you warrant that you are at least 18 years of age
                    or possess lawful parental/guardian authority to conduct commercial business in Nigeria, and agree to
                    abide by these Terms in full.
                  </Para>

                  <SectionTitle>2. Software Purpose and Functionality</SectionTitle>
                  <Para>
                    marketOS provides a proprietary financial algorithm designed to track retail store inventory yields,
                    cost recovery, and net business earnings. The software separates product cost of goods sold (COGS)
                    from operational expenses to compute true gross profit and net take-home earnings.
                  </Para>

                  <SectionTitle>3. User Account Responsibilities</SectionTitle>
                  <Bullet>
                    You are solely responsible for maintaining the confidentiality of your login email and password
                    under the Cybercrimes Act 2015.
                  </Bullet>
                  <Bullet>You agree to provide true, accurate, and current pricing and inventory figures.</Bullet>
                  <Bullet>
                    marketOS shall not be liable for losses caused by unauthorized credential sharing on your devices.
                  </Bullet>

                  <SectionTitle>4. Intellectual Property Rights</SectionTitle>
                  <Para>
                    All interface designs, branding, logos, graphics, source code, and mathematical payback models in
                    marketOS are the exclusive intellectual property of marketOS. You receive a limited, revocable,
                    non-exclusive license to use the system for managing your personal or company commercial store.
                  </Para>

                  <SectionTitle>5. Financial Disclaimer</SectionTitle>
                  <Para>
                    marketOS provides operational business intelligence and automated arithmetic computations. While
                    designed to enhance profit clarity, marketOS does not serve as a licensed chartered tax advisory,
                    commercial bank, or auditing firm. Users remain responsible for independent tax filings with federal
                    and state revenue authorities (e.g. FIRS, LIRS, etc.).
                  </Para>

                  <SectionTitle>6. Limitation of Liability & Consumer Rights</SectionTitle>
                  <Para>
                    In accordance with the FCCPA 2018, marketOS is provided "as is" and "as
                    available". We do not guarantee uninterrupted server connectivity during general
                    telecommunications or power disruptions. To the fullest extent permitted by Nigerian law, our
                    liability shall not exceed the subscription fees paid by you to marketOS in the preceding 6 months.
                  </Para>

                  <SectionTitle>7. Governing Law and Dispute Resolution</SectionTitle>
                  <Para>
                    These Terms shall be governed by and construed in accordance with the laws of the Federal Republic
                    of Nigeria. Any disputes arising shall first be submitted to good-faith mediation under the Lagos
                    State Multi-Door Courthouse (LMDC) or Abuja Multi-Door Courthouse before recourse to litigation.
                  </Para>
                </View>
              )}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Text style={{ fontSize: 11, color: theme.mutedForeground, textAlign: 'center', flex: 1 }}>
                Last updated: October 2026 • Compliant with NDPA 2023 regulations
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onClose}
                  style={[
                    styles.closeBtnText,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.foreground }}>Close</Text>
                </TouchableOpacity>
                {onAccept ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      onAccept();
                      onClose();
                    }}
                    style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                  >
                    <Ionicons name="checkmark-circle" size={15} color="#000" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#000', marginLeft: 6 }}>
                      Accept & Consent
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
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
    width: 38,
    height: 38,
    borderRadius: 12,
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
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  notice: { borderRadius: 14, borderWidth: 1, padding: 14 },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    alignItems: 'center',
  },
  closeBtnText: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
