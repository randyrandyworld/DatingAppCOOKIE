import { doc, getDoc, increment, runTransaction, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const SIGNUP_BONUS_COOKIES = 30;

export const COOKIE_PRICES = {
  superLike: 5,
  boost: 10,
  seeWhoLikedMe: 3,
  rewind: 2,
  extraLike: 3, // 하루 무료 좋아요 다 쓴 뒤, 쿠키로 좋아요 추가 구매
};

export async function getCookieBalance(uid) {
  if (!uid) return 0;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return 0;
  return snap.data().cookies ?? 0;
}

export async function addCookies(uid, amount) {
  if (!uid || !amount) return;
  await setDoc(doc(db, "users", uid), { cookies: increment(amount) }, { merge: true });
}

// 쿠키 차감 (트랜잭션: 잔액 확인과 차감이 한 번에 처리되어 연타해도 마이너스가 되지 않음)
// Firestore 규칙상 쿠키는 "줄이는 것"만 클라이언트에서 가능해요.
export async function spendCookies(uid, amount) {
  if (!uid || !amount) return false;
  try {
    return await runTransaction(db, async (tx) => {
      const ref = doc(db, "users", uid);
      const snap = await tx.get(ref);
      const balance = snap.exists() ? snap.data().cookies ?? 0 : 0;
      if (balance < amount) return false;
      tx.update(ref, { cookies: balance - amount });
      return true;
    });
  } catch (e) {
    console.log("쿠키 차감 실패:", e?.message);
    return false;
  }
}

export async function spendOn(uid, featureKey) {
  const price = COOKIE_PRICES[featureKey];
  if (price == null) return false;
  return spendCookies(uid, price);
}