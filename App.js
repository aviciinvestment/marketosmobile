import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';

const GlassDropdown = ({ label, color1, color2, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity 
        style={styles.dropdownButton}
        activeOpacity={0.8}
        onPress={() => setIsOpen(!isOpen)}
      >
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownText}>{selected}</Text>
          <Text style={styles.dropdownIcon}>{isOpen ? '▲' : '▼'}</Text>
        </View>
        <View style={[styles.glowLine, { backgroundColor: color1 }]} />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownMenu}>
          {options.map((opt, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.dropdownOption}
              onPress={() => {
                setSelected(opt);
                setIsOpen(false);
              }}
            >
              <Text style={[styles.optionText, selected === opt && styles.optionTextSelected]}>
                {selected === opt ? '✓ ' : '  '}{opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: 'https://i.pravatar.cc/100?img=11' }} style={styles.profilePic} />
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchText}>Search</Text>
          </View>
          <View style={styles.headerIcons}>
            <Text style={styles.icon}>🎁</Text>
            <Text style={styles.icon}>🔔</Text>
          </View>
        </View>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View>
              <Text style={styles.walletLabel}>Wallet</Text>
              <Text style={styles.walletName}>Josh Hill</Text>
            </View>
            <View style={styles.addButton}>
              <Text style={styles.addIcon}>+</Text>
            </View>
          </View>
          <Text style={styles.balance}>$15,630.71</Text>
          <View style={styles.accountInfo}>
            <Text style={styles.accountText}>Account ** 5087</Text>
            <View style={styles.mastercard}>
              <View style={[styles.mcCircle, styles.mcRed]} />
              <View style={[styles.mcCircle, styles.mcYellow]} />
              <Text style={styles.cardNumber}>**** 3264</Text>
            </View>
          </View>
        </View>

        {/* Dropdowns */}
        <Text style={styles.sectionTitle}>Interactive Selectors</Text>
        <GlassDropdown 
          label="Choose..."
          color1="#f97316"
          options={["Choose...", "Option 1", "Option 2"]}
        />
        <GlassDropdown 
          label="Choose..."
          color1="#06b6d4"
          options={["Choose...", "Select A", "Select B"]}
        />

        {/* Activity Grid */}
        <View style={styles.activityGrid}>
          <View style={styles.activityCard}>
            <Text style={styles.cardTitle}>Spending</Text>
            <Text style={styles.cardSub}>Spent in October</Text>
            <View style={styles.bars}>
              <View style={[styles.bar, { width: 40, backgroundColor: '#6366f1' }]} />
              <View style={[styles.bar, { width: 24, backgroundColor: '#ef4444' }]} />
              <View style={[styles.bar, { width: 16, backgroundColor: '#22c55e' }]} />
              <View style={[styles.bar, { width: 16, backgroundColor: '#eab308' }]} />
            </View>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.cardTitle}>Cash Back</Text>
            <View style={styles.logos}>
              <View style={[styles.logo, { backgroundColor: '#000' }]}><Text style={{color: 'red', fontWeight: 'bold'}}>N</Text></View>
              <View style={[styles.logo, { backgroundColor: '#fff' }]}><Text style={{color: 'black', fontStyle: 'italic', fontWeight: 'bold', fontSize: 10}}>Nike</Text></View>
              <View style={[styles.logo, { backgroundColor: '#dc2626' }]}><Text style={{color: '#facc15', fontWeight: 'bold'}}>M</Text></View>
            </View>
          </View>
        </View>

        {/* Actions Grid */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionCol}>
            <TouchableOpacity style={styles.actionBox}><Text style={styles.actionIcon}>QR</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBox}><Text style={styles.actionIcon}>+</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionBig}>
            <View style={styles.actionCircle}><Text style={styles.actionIcon}>🎓</Text></View>
            <Text style={styles.actionTitle}>Tips And Training</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBig}>
            <View style={styles.actionCircle}><Text style={styles.actionIcon}>⊞</Text></View>
            <Text style={styles.actionTitle}>All Services</Text>
          </TouchableOpacity>
        </View>

        {/* Refer Card */}
        <View style={styles.referCard}>
          <Text style={styles.referTitle}>Refer and Earn</Text>
          <Text style={styles.referText}>Share a referral link to your friend and get rewarded</Text>
          <TouchableOpacity style={styles.learnButton}>
            <Text style={styles.learnText}>Learn more</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding for nav */}
        <View style={{height: 80}} />

      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIconActive}>🏠</Text>
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>💳</Text>
          <Text style={styles.navText}>Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>💬</Text>
          <Text style={styles.navText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>•••</Text>
          <Text style={styles.navText}>More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchBar: {
    flex: 1,
    height: 40,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginLeft: 12,
    marginRight: 12,
  },
  searchIcon: {
    color: '#9ca3af',
    marginRight: 8,
  },
  searchText: {
    color: '#9ca3af',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  icon: {
    fontSize: 20,
  },
  walletCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  walletLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  walletName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    color: 'white',
    fontSize: 20,
    lineHeight: 22,
  },
  balance: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  accountText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  mastercard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  mcRed: {
    backgroundColor: '#ef4444',
    opacity: 0.9,
    zIndex: 1,
  },
  mcYellow: {
    backgroundColor: '#eab308',
    opacity: 0.9,
    marginLeft: -8,
  },
  cardNumber: {
    color: '#9ca3af',
    fontSize: 14,
    marginLeft: 8,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    marginLeft: 4,
  },
  dropdownContainer: {
    marginBottom: 16,
    zIndex: 10,
  },
  dropdownButton: {
    backgroundColor: '#000',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  dropdownText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownIcon: {
    color: 'white',
    fontSize: 12,
  },
  glowLine: {
    height: 4,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    opacity: 0.8,
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  optionText: {
    color: 'white',
    fontSize: 16,
  },
  optionTextSelected: {
    fontWeight: 'bold',
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 20,
  },
  cardTitle: {
    color: 'white',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSub: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 16,
  },
  bars: {
    flexDirection: 'row',
    gap: -8,
  },
  bar: {
    height: 16,
    borderRadius: 8,
  },
  logos: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCol: {
    gap: 12,
  },
  actionBox: {
    width: 56,
    height: 56,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    color: 'white',
    fontSize: 20,
  },
  actionBig: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  referCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
  },
  referTitle: {
    color: 'white',
    fontWeight: '600',
    marginBottom: 8,
  },
  referText: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
    width: '70%',
  },
  learnButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  learnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  navIconActive: {
    fontSize: 24,
  },
  navText: {
    color: '#9ca3af',
    fontSize: 10,
  },
  navTextActive: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
});
