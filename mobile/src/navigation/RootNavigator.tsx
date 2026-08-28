import React from "react";
import { View, TouchableOpacity, StyleSheet, Text, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "../context/PreferencesContext";

// Screen Imports
import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
import { PreparednessScreen } from "../screens/PreparednessScreen";
import { EmergencyContactsScreen } from "../screens/EmergencyContactsScreen";
import { AlertsScreen } from "../screens/AlertsScreen";
import { EvacuationCenterDetailsScreen } from "../screens/EvacuationCenterDetailsScreen";
import { RoadHazardsScreen } from "../screens/RoadHazardsScreen";
import { PowerInterruptionScreen } from "../screens/PowerInterruptionScreen";
import { AnnouncementsScreen } from "../screens/AnnouncementsScreen";
import { ReportDisasterScreen } from "../screens/ReportDisasterScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ResponderPortalScreen } from "../screens/ResponderPortalScreen";
import { ChatListScreen } from "../screens/chat/ChatListScreen";
import { ChatWindowScreen } from "../screens/chat/ChatWindowScreen";
import { NearbyIncidentsScreen } from "../screens/NearbyIncidentsScreen";

import { UnreadTracker } from "../services/unreadTracker";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 👤 Exact Human Figure Pegman Icon matching user screenshot
function HumanPegmanIcon({ color = "#ffffff", size = 22 }: { color?: string; size?: number }) {
  const s = size / 22;
  return (
    <View style={{ width: 14 * s, height: 20 * s, alignItems: "center", justifyContent: "center" }}>
      {/* Head dot */}
      <View
        style={{
          width: 5.5 * s,
          height: 5.5 * s,
          borderRadius: 2.75 * s,
          backgroundColor: color,
          marginBottom: 2 * s,
        }}
      />
      {/* Shoulder Arch + Left & Right Legs */}
      <View style={{ width: 13 * s, height: 12.5 * s, position: "relative" }}>
        {/* Shoulder arch */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6.5 * s,
            borderTopLeftRadius: 6.5 * s,
            borderTopRightRadius: 6.5 * s,
            backgroundColor: color,
          }}
        />
        {/* Left Leg */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 4.2 * s,
            height: 9 * s,
            borderBottomLeftRadius: 2.1 * s,
            borderBottomRightRadius: 2.1 * s,
            backgroundColor: color,
          }}
        />
        {/* Right Leg */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 4.2 * s,
            height: 9 * s,
            borderBottomLeftRadius: 2.1 * s,
            borderBottomRightRadius: 2.1 * s,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

// 👤 Prominent Floating Center Action Button for Nearby Incidents
function CustomNearbyPersonButton({ onPress }: any) {
  const { colors } = usePreferences();

  return (
    <TouchableOpacity
      style={styles.customCenterBtnContainer}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.customCenterBtn,
          {
            backgroundColor: colors.primaryLight,
            borderColor: colors.card,
            shadowColor: colors.primaryLight,
          },
        ]}
      >
        <HumanPegmanIcon color="#ffffff" size={24} />
      </View>
    </TouchableOpacity>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors, language, t } = usePreferences();
  const [unreadAlerts, setUnreadAlerts] = React.useState(0);

  React.useEffect(() => {
    UnreadTracker.getUnreadCounts().then((c) => setUnreadAlerts(c.alerts));
    const unsub = UnreadTracker.subscribe(() => {
      UnreadTracker.getUnreadCounts().then((c) => setUnreadAlerts(c.alerts));
    });
    return unsub;
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: 62 + Math.max(insets.bottom, 10),
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";
          if (route.name === "Home")
            iconName = focused ? "home" : "home-outline";
          else if (route.name === "Preparedness")
            iconName = focused ? "book" : "book-outline";
          else if (route.name === "Alerts")
            iconName = focused ? "notifications" : "notifications-outline";
          else if (route.name === "More")
            iconName = focused ? "grid" : "grid-outline";
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t("navHome", "Home") }}
      />
      <Tab.Screen
        name="Preparedness"
        component={PreparednessScreen}
        options={{ tabBarLabel: language === "tl" ? "Gabay" : "Guides" }}
      />
      {/* 👤 Center Floating Nearby Incidents Map Button (Icon-Only) */}
      <Tab.Screen
        name="NearbyTab"
        component={NearbyIncidentsScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <CustomNearbyPersonButton
              {...props}
              onPress={(e: any) => props.onPress?.(e)}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: t("navAlerts", "Alerts"),
          tabBarBadge:
            unreadAlerts > 0
              ? unreadAlerts > 9
                ? "9+"
                : unreadAlerts
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            fontSize: 10,
            fontWeight: "900",
            color: "#ffffff",
          },
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarLabel: t("navMore", "More") }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="NearbyIncidents" component={NearbyIncidentsScreen} />
        <Stack.Screen
          name="CenterDetails"
          component={EvacuationCenterDetailsScreen}
        />
        <Stack.Screen name="Route" component={RoadHazardsScreen} />
        <Stack.Screen name="RoadHazards" component={RoadHazardsScreen} />
        <Stack.Screen
          name="PowerInterruption"
          component={PowerInterruptionScreen}
        />
        <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
        <Stack.Screen name="Contacts" component={EmergencyContactsScreen} />
        <Stack.Screen name="ReportDisaster" component={ReportDisasterScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ResponderPortal" component={ResponderPortalScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="ChatWindow" component={ChatWindowScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  customCenterBtnContainer: {
    top: -18,
    justifyContent: "center",
    alignItems: "center",
  },
  customCenterBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
});
