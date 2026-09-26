import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DiscoverScreen from "../screens/DiscoverScreen";
import MatchesScreen from "../screens/MatchesScreen";
import ProfileFormScreen from "../screens/ProfileFormScreen";
import { useAuth } from "../context/AuthContext";
import { useUnreadMatchesCount } from "../utils/unread";
import { COLORS, FONTS } from "../theme";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user } = useAuth();
  const unreadCount = useUnreadMatchesCount(user?.uid);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#C9B8A3",
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
        tabBarBadgeStyle: { backgroundColor: "#e0243e" },
        headerStyle: { backgroundColor: COLORS.card },
        headerTitleStyle: { color: COLORS.text, fontFamily: FONTS.heading, fontSize: 18 },
        headerTintColor: COLORS.primary,
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🍪</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          title: "매칭",
          headerShown: true,
          headerTitle: "매칭된 사람들",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="MyProfile"
        options={{
          title: "마이",
          headerShown: true,
          headerTitle: "내 프로필",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      >
        {(props) => <ProfileFormScreen {...props} mode="edit" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
