import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ProfileFormScreen from "../screens/ProfileFormScreen";
import ChatScreen from "../screens/ChatScreen";
import MainTabs from "./MainTabs";
import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, hasProfile, loading } = useAuth();

  // 매칭/메시지 푸시 알림을 탭했을 때 해당 채팅방으로 바로 이동
  useEffect(() => {
    if (!user || !hasProfile) return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!data?.matchId || !navigationRef.isReady()) return;
      navigationRef.navigate("Chat", {
        matchId: data.matchId,
        otherUser: data.otherUser || { id: data.otherUid, name: "" },
      });
    });
    return () => sub.remove();
  }, [user, hasProfile]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#FF4B6E" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : !hasProfile ? (
          <Stack.Screen name="ProfileSetup">
            {(props) => <ProfileFormScreen {...props} mode="setup" />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: true }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
