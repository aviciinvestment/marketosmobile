import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { gold } from '../utils/theme';

const SIZES = {
  sm: { box: 24, ring: 2, dot: 10, text: 16, gap: 8 },
  md: { box: 32, ring: 2, dot: 14, text: 20, gap: 10 },
  lg: { box: 48, ring: 2.5, dot: 20, text: 24, gap: 12 },
};

// Native replica of web/src/components/BrandLogo.tsx:
// a dashed gold ring rotating around a pulsing gold dot, plus the wordmark.
export default function BrandLogo({ size = 'md', showText = true }) {
  const s = SIZES[size] || SIZES.md;
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    spinLoop.start();
    pulseLoop.start();
    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] });

  return (
    <View style={[styles.row, { gap: s.gap }]}>
      <View style={{ width: s.box, height: s.box, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: s.box,
              height: s.box,
              borderRadius: s.box / 2,
              borderWidth: s.ring,
              transform: [{ rotate }],
            },
          ]}
        />
        <Animated.View
          style={{
            position: 'absolute',
            width: s.dot,
            height: s.dot,
            borderRadius: s.dot / 2,
            backgroundColor: gold,
            transform: [{ scale: dotScale }],
            opacity: dotOpacity,
            shadowColor: gold,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 4,
          }}
        />
      </View>
      {showText && (
        <Text style={[styles.wordmark, { fontSize: s.text }]}>
          market
          <Text style={{ color: gold }}>OS</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  ring: {
    borderColor: 'rgba(245,197,24,0.75)',
    borderStyle: 'dashed',
    position: 'absolute',
  },
  wordmark: {
    fontWeight: '900',
    color: '#f4f4f5',
    letterSpacing: -0.5,
  },
});
