import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

// 누군가 좋아요를 누르면 상대방 쪽에 "날 좋아요함" 기록 남기기
export async function recordLikeReceived(receiverUid, senderUid) {
  if (!receiverUid || !senderUid) return;
  await setDoc(doc(db, "likesReceived", receiverUid, "from", senderUid), {
    at: serverTimestamp(),
  });
}

// 하단 탭 뱃지 — 날 좋아요한 사람 수
export function useLikesYouCount(uid) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "likesReceived", uid, "from"), (snap) => {
      setCount(snap.size);
    });
    return unsub;
  }, [uid]);
  return count;
}

// 나를 좋아요했지만 내가 아직 스와이프 안 한 사람들 목록
export async function getLikesYouList(uid) {
  const [likesSnap, mySwipesSnap] = await Promise.all([
    getDocs(collection(db, "likesReceived", uid, "from")),
    getDocs(collection(db, "swipes", uid, "actions")),
  ]);
  const alreadySwiped = new Set(mySwipesSnap.docs.map((d) => d.id));
  const senderIds = likesSnap.docs.map((d) => d.id).filter((id) => !alreadySwiped.has(id));

  const profiles = await Promise.all(
    senderIds.map(async (id) => {
      const snap = await getDoc(doc(db, "users", id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    })
  );
  return profiles.filter(Boolean);
}