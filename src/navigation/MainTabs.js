import React from "react";
import { Image, Platform, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DiscoverScreen from "../screens/DiscoverScreen";
import MatchesScreen from "../screens/MatchesScreen";
import ProfileFormScreen from "../screens/ProfileFormScreen";
import { useAuth } from "../context/AuthContext";
import { useUnreadMatchesCount } from "../utils/unread";
import { COLORS, FONTS } from "../theme";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user, profile } = useAuth();
  const unreadCount = useUnreadMatchesCount(user?.uid);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
<<<<<<< HEAD
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#C9B8A3",
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
        tabBarBadgeStyle: { backgroundColor: "#e0243e" },
        headerStyle: { backgroundColor: COLORS.card },
        headerTitleStyle: { color: COLORS.text, fontFamily: FONTS.heading, fontSize: 18 },
        headerTintColor: COLORS.primary,
=======
        tabBarShowLabel: false, // 인스타처럼 텍스트 라벨 없이 아이콘만
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#111111", // 인스타는 선택 안 돼도 다 검정, 굵기로만 구분
        tabBarStyle: {
          height: Platform.OS === "ios" ? 84 : 60,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 26 : 8,
          borderTopWidth: 0.5,
          borderTopColor: "#dbdbdb",
          backgroundColor: "#ffffff",
        },
>>>>>>> 7068d641f5e4e1b507a797bac9e18919c0e3ace8
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
<<<<<<< HEAD
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🍪</Text>
=======
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size ?? 26}
              color="#111111"
            />
>>>>>>> 7068d641f5e4e1b507a797bac9e18919c0e3ace8
          ),
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          headerShown: true,
          headerTitle: "매칭된 사람들",
          headerTitleStyle: { fontWeight: "800" },
          headerStyle: { shadowOpacity: 0, elevation: 0 },
          tabBarIcon: ({ focused, size }) => (
            <View>
              <Ionicons
                name={focused ? "paper-plane" : "paper-plane-outline"}
                size={size ?? 26}
                color="#111111"
              />
              {unreadCount > 0 && <View style={{ position: "absolute", top: -2, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: "#ff3040", borderWidth: 1.5, borderColor: "#fff" }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="MyProfile"
        options={{
          headerShown: true,
          headerTitle: "내 프로필",
          headerTitleStyle: { fontWeight: "800" },
          headerStyle: { shadowOpacity: 0, elevation: 0 },
          tabBarIcon: ({ focused, size }) => {
            const s = (size ?? 26) - 2;
            return profile?.photos?.[0] ? (
              <View
                style={{
                  width: s,
                  height: s,
                  borderRadius: s / 2,
                  borderWidth: focused ? 2 : 0,
                  borderColor: "#111111",
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: profile.photos[0] }}
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
            ) : (
              <Ionicons
                name={focused ? "person-circle" : "person-circle-outline"}
                size={size ?? 26}
                color="#111111"
              />
            );
          },
        }}
      >
        {(props) => <ProfileFormScreen {...props} mode="edit" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
