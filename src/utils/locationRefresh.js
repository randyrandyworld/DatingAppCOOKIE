import * as Location from "expo-location";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// 프로필 편집 화면과 별개로, 로그인할 때마다(또는 필요할 때) 위치를 조용히 최신화한다.
// - 이미 위치 권한을 허용한 사용자에게만 동작 (권한 팝업을 다시 띄우지 않음 — 매번 물어보면 성가심)
// - 권한이 없거나 위치를 못 받아오면 그냥 아무것도 안 하고 조용히 종료 (기존 위치값 유지)
export async function refreshLocationIfPermitted(uid) {
  if (!uid) return false;
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") return false;

    const pos = await Promise.race([
      Location.getCurrentPositionAsync({}),
      new Promise((resolve) => setTimeout(() => resolve(null), 6000)),
    ]);
    if (!pos) return false;

    await updateDoc(doc(db, "users", uid), {
      location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
    });
    return true;
  } catch (e) {
    return false;
  }
}
