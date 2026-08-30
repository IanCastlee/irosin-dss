import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { usePreferences } from "../context/PreferencesContext";

interface RadarPulseLoadingProps {
  title?: string;
  subtitle?: string;
}

export const RadarPulseLoading: React.FC<RadarPulseLoadingProps> = ({
  title,
  subtitle,
}) => {
  const { colors, theme, language } = usePreferences();

  // Animation values for concentric radar circles (Reference: media_1788054972009.png)
  const pulseScale1 = useRef(new Animated.Value(0.92)).current;
  const pulseScale2 = useRef(new Animated.Value(0.85)).current;
  const rippleScale = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity = useRef(new Animated.Value(0.8)).current;
  const centerDotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Center dot gentle heartbeat pulse
    const dotAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(centerDotScale, {
          toValue: 1.25,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(centerDotScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // 2. Middle blue circle rhythmic pulse
    const middleRingAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale1, {
          toValue: 1.08,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale1, {
          toValue: 0.94,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // 3. Outer light-blue circle breathing pulse
    const outerRingAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale2, {
          toValue: 1.12,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale2, {
          toValue: 0.95,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // 4. Expanding radar wave ripple that fades out
    const rippleAnim = Animated.loop(
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: 1.65,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(rippleOpacity, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    dotAnim.start();
    middleRingAnim.start();
    outerRingAnim.start();
    rippleAnim.start();

    return () => {
      dotAnim.stop();
      middleRingAnim.stop();
      outerRingAnim.stop();
      rippleAnim.stop();
    };
  }, []);

  const defaultTitle =
    language === "tl"
      ? "Ikinakarga ang pinakasariwang datos..."
      : "Loading real-time map data...";

  const defaultSubtitle =
    language === "tl"
      ? "Nagsi-sync sa live GPS at pinakabagong ulat..."
      : "Synchronizing live GPS and latest reports...";

  const isDark = theme === "dark";

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 📡 Radar Concentric Circles Graphic (media_1788054972009.png) */}
      <View style={styles.radarWrapper}>
        {/* Outermost Expanding Ripple Wave */}
        <Animated.View
          style={[
            styles.rippleRing,
            {
              backgroundColor: isDark
                ? "rgba(56, 189, 248, 0.15)"
                : "rgba(186, 230, 253, 0.45)",
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />

        {/* Outer Light Blue Circle */}
        <Animated.View
          style={[
            styles.outerCircle,
            {
              backgroundColor: isDark
                ? "rgba(2, 132, 199, 0.25)"
                : "rgba(186, 230, 253, 0.75)",
              transform: [{ scale: pulseScale2 }],
            },
          ]}
        />

        {/* Middle Vibrant Sky Blue Circle */}
        <Animated.View
          style={[
            styles.middleCircle,
            {
              backgroundColor: isDark
                ? "rgba(56, 189, 248, 0.45)"
                : "rgba(56, 189, 248, 0.8)",
              transform: [{ scale: pulseScale1 }],
            },
          ]}
        />

        {/* Center Point / Radar Origin Dot */}
        <Animated.View
          style={[
            styles.centerDot,
            {
              backgroundColor: isDark ? "#38bdf8" : "#0284c7",
              transform: [{ scale: centerDotScale }],
            },
          ]}
        />
      </View>

      {/* Text Info */}
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title || defaultTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle || defaultSubtitle}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  radarWrapper: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 28,
  },
  rippleRing: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  outerCircle: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  middleCircle: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  centerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 10,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  textWrap: {
    alignItems: "center",
    maxWidth: 290,
  },
  title: {
    fontSize: 15.5,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.85,
  },
});
