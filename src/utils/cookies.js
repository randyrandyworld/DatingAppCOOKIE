import { doc, getDoc, increment, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const SIGNUP_BONUS_COOKIES = 30;

export const COOKIE_PRICES = {
  superLike: 5,
  boost: 10,
  seeWhoLikedMe: 3,
  rewind: 2,
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

export async function spendCookies(uid, amount) {
  if (!uid || !amount) return false;
  const balance = await getCookieBalance(uid);
  if (balance < amount) return false;
  await updateDoc(doc(db, "users", uid), { cookies: increment(-amount) });
  return true;
}

export async function spendOn(uid, featureKey) {
  const price = COOKIE_PRICES[featureKey];
  if (price == null) return false;
  return spendCookies(uid, price);
}