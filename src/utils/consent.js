// 가입 화면에서 받은 동의 내용을 잠깐 기기에 보관했다가,
// 프로필 문서가 처음 만들어질 때(ProfileFormScreen setup) 같이 저장한다.
// (가입 시점에는 users 문서가 아직 없기 때문)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONSENT_VERSION } from "../legal/legalConfig";

const keyOf = (uid) => `cookie_consent_${uid}`;

export async function savePendingConsent(uid, consent) {
  if (!uid) return;
  const payload = {
    age: !!consent.age,
    terms: !!consent.terms,
    privacy: !!consent.privacy,
    location: !!consent.location,
    version: CONSENT_VERSION,
    agreedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(keyOf(uid), JSON.stringify(payload));
  } catch (e) {
    // 보관 실패해도 가입은 계속 진행
  }
}

export async function loadPendingConsent(uid) {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(keyOf(uid));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function clearPendingConsent(uid) {
  if (!uid) return;
  try {
    await AsyncStorage.removeItem(keyOf(uid));
  } catch (e) {}
}
