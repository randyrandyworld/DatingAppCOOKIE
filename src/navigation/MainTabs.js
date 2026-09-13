import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DiscoverScreen from "../screens/DiscoverScreen";
import MatchesScreen from "../screens/MatchesScreen";
import ProfileFormScreen from "../screens/ProfileFormScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#aaa",
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🔥</Text>
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
