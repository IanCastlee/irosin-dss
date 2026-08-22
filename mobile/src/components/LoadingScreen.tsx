import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { usePreferences } from '../context/PreferencesContext';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Nagko-konekta...',
  subMessage = 'MDRRMO Irosin Emergency System'
}) => {
  const { colors, theme } = usePreferences();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Shimmer bar
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();

    // Bouncing dots
    const makeDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver: true }),
          Animated.delay(700 - delay),
        ])
      );

    const d1 = makeDot(dotAnim1, 0);
    const d2 = makeDot(dotAnim2, 200);
    const d3 = makeDot(dotAnim3, 400);
    d1.start(); d2.start(); d3.start();

    return () => {
      shimmerLoop.stop();
      d1.stop(); d2.stop(); d3.stop();
    };
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.bg, opacity: fadeAnim }]}>
      {/* App Icon */}
      <View style={[styles.iconWrap, {
        backgroundColor: theme === 'dark' ? 'rgba(2,132,199,0.12)' : 'rgba(2,132,199,0.08)',
        borderColor: theme === 'dark' ? 'rgba(56,189,248,0.25)' : 'rgba(2,132,199,0.2)',
      }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.icon}
        />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>{message}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{subMessage}</Text>

      {/* Shimmer Progress Bar */}
      <View style={[styles.barTrack, {
        backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.8)' : '#e2e8f0',
      }]}>
        <Animated.View
          style={[styles.barShimmer, {
            backgroundColor: colors.primaryLight,
            transform: [{ translateX: shimmerTranslate }],
          }]}
        />
      </View>

      {/* Bouncing Dots */}
      <View style={styles.dotsRow}>
        {[dotAnim1, dotAnim2, dotAnim3].map((anim, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { backgroundColor: colors.primaryLight, opacity: anim }]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

export const InlineLoader: React.FC<{ message?: string }> = ({
  message = 'Loading...'
}) => {
  const { colors } = usePreferences();
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.inlineContainer}>
      <View style={[styles.inlineBarTrack, { backgroundColor: 'rgba(100,116,139,0.15)' }]}>
        <Animated.View
          style={[styles.inlineBarShimmer, {
            backgroundColor: colors.primaryLight,
            transform: [{ translateX: shimmerAnim.interpolate({ inputRange: [-1, 1], outputRange: [-100, 100] }) }],
          }]}
        />
      </View>
      <Text style={[styles.inlineText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 0,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    overflow: 'hidden',
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  barTrack: {
    width: 160,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  barShimmer: {
    position: 'absolute',
    width: 80,
    height: '100%',
    borderRadius: 2,
    opacity: 0.85,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  inlineContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  inlineBarTrack: {
    width: 120,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  inlineBarShimmer: {
    position: 'absolute',
    width: 60,
    height: '100%',
    borderRadius: 2,
  },
  inlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
