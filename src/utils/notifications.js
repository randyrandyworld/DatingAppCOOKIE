import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// 앱이 켜져 있을 때(포그라운드)도 알림 배너/소리가 뜨도록 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 이 기기의 Expo 푸시 토큰을 발급받는다.
// 실제 기기 + 알림 권한 허용 시에만 토큰이 나오고, 그 외에는 null을 반환한다.
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("푸시 알림은 시뮬레이터/에뮬레이터에서는 테스트할 수 없어요 (실기기 필요)");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF4B6E",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("푸시 알림 권한이 거부됐어요.");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenResponse.data;
  } catch (e) {
    console.log("푸시 토큰 발급 실패:", e?.message);
    return null;
  }
}

// 발급받은 토큰을 내 프로필 문서(users/{uid})에 저장해둔다.
// 다른 유저가 나에게 매칭/메시지 알림을 보낼 때 이 토큰을 읽어서 사용한다.
export async function savePushTokenForUser(uid, token) {
  if (!uid || !token) return;
  try {
    await updateDoc(doc(db, "users", uid), { expoPushToken: token });
  } catch (e) {
    // 프로필 문서가 아직 없을 수 있음(가입 직후, 프로필 작성 전) — 조용히 무시
  }
}

// targetUid 유저에게 푸시 알림을 보낸다.
// 백엔드 서버 없이 클라이언트에서 Expo 푸시 API를 직접 호출한다(이 앱은 Cloud Functions를 쓰지 않는 구조).
// 상대가 토큰을 등록하지 않았거나(알림 미허용 등) 전송에 실패해도 앱 동작(매칭/채팅)은 막지 않는다.
export async function sendPushNotificationToUser(targetUid, { title, body, data } = {}) {
  try {
    const snap = await getDoc(doc(db, "users", targetUid));
    const token = snap.exists() ? snap.data().expoPushToken : null;
    if (!token) return;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data: data || {},
        sound: "default",
      }),
    });
  } catch (e) {
    console.log("푸시 알림 전송 실패:", e?.message);
  }
}
