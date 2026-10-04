import { doc, getDoc, increment, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const DAILY_LIKE_LIMIT = 20;

// 오늘 날짜를 "2026-10-04" 형식 문자열로 (한국 시간 기준 자정에 리셋되게)
function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

// 오늘 좋아요를 몇 개 썼는지 가져오기 (날짜 바뀌면 자동으로 0부터 시작)
export async function getLikesUsedToday(uid) {
  if (!uid) return 0;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return 0;
  const data = snap.data();
  if (data.likesDate !== todayKey()) return 0; // 날짜 바뀜 = 오늘 쓴 거 없음
  return data.likesUsedToday || 0;
}

// 좋아요 하나 쓰기 시도 — 한도 초과면 false, 성공하면 true
export async function tryUseLike(uid) {
  if (!uid) return false;
  const key = todayKey();
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.exists() ? snap.data() : {};

  const sameDay = data.likesDate === key;
  const usedSoFar = sameDay ? data.likesUsedToday || 0 : 0;

  if (usedSoFar >= DAILY_LIKE_LIMIT) return false;

  await setDoc(
    doc(db, "users", uid),
    {
      likesDate: key,
      likesUsedToday: sameDay ? increment(1) : 1,
    },
    { merge: true }
  );
  return true;
}

// 오늘 남은 개수 (화면 표시용)
export async function getLikesRemaining(uid) {
  const used = await getLikesUsedToday(uid);
  return Math.max(0, DAILY_LIKE_LIMIT - used);
}