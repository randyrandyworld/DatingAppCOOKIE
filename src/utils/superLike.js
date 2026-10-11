import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const SUPER_LIKE_COOLDOWN_DAYS = 3;
const COOLDOWN_MS = SUPER_LIKE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// 무료 슈퍼라이크를 지금 쓸 수 있는지 (마지막 사용 후 3일 지났는지) 확인
export async function getFreeSuperLikeStatus(uid) {
  if (!uid) return { available: false, nextAvailableAt: null };
  const snap = await getDoc(doc(db, "users", uid));
  const lastUsed = snap.exists() ? snap.data().lastFreeSuperLikeAt?.toDate?.() : null;

  if (!lastUsed) return { available: true, nextAvailableAt: null };

  const nextAvailableAt = new Date(lastUsed.getTime() + COOLDOWN_MS);
  const available = Date.now() >= nextAvailableAt.getTime();
  return { available, nextAvailableAt: available ? null : nextAvailableAt };
}

// 무료 슈퍼라이크 사용 처리 (사용 시각 기록 → 여기서부터 3일 쿨다운 시작)
export async function markFreeSuperLikeUsed(uid) {
  if (!uid) return;
  await setDoc(
    doc(db, "users", uid),
    { lastFreeSuperLikeAt: serverTimestamp() },
    { merge: true }
  );
}