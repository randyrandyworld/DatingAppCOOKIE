import React from "react";
import { Image, Platform, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DiscoverScreen from "../screens/DiscoverScreen";
import MatchesScreen from "../screens/MatchesScreen";
import ProfileFormScreen from "../screens/ProfileFormScreen";
import AdminScreen from "../screens/AdminScreen";
import { isAdminUid } from "../adminConfig";
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
        tabBarShowLabel: false, // 인스타처럼 텍스트 라벨 없이 아이콘만
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          height: Platform.OS === "ios" ? 84 : 60,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 26 : 8,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.card,
        },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Text style={{ fontSize: (size ?? 26) + 2, opacity: focused ? 1 : 0.35 }}>🍪</Text>
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
                color={focused ? COLORS.text : COLORS.textLight}
              />
              {unreadCount > 0 && <View style={{ position: "absolute", top: -2, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary, borderWidth: 1.5, borderColor: "#fff" }} />}
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
                  borderColor: COLORS.primary,
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
                color={focused ? COLORS.text : COLORS.textLight}
              />
            );
          },
        }}
      >
        {(props) => <ProfileFormScreen {...props} mode="edit" />}
      </Tab.Screen>
      {isAdminUid(user?.uid) && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            headerShown: true,
            headerTitle: "관리자 모드",
            headerTitleStyle: { fontWeight: "800" },
            headerStyle: { shadowOpacity: 0, elevation: 0 },
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? "construct" : "construct-outline"}
                size={size ?? 26}
                color={focused ? COLORS.text : COLORS.textLight}
              />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}
