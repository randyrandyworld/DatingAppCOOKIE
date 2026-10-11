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
import { calcKoreanAge } from "./matching";

// 누군가 좋아요를 누르면 상대방 쪽에 "날 좋아요함" 기록 남기기 (슈퍼라이크 여부도 같이 저장)
export async function recordLikeReceived(receiverUid, senderUid, isSuper = false) {
  if (!receiverUid || !senderUid) return;
  await setDoc(doc(db, "likesReceived", receiverUid, "from", senderUid), {
    at: serverTimestamp(),
    isSuper,
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

// 나를 좋아요했지만 내가 아직 스와이프 안 한 사람들 목록 (슈퍼라이크가 위로 오도록 정렬)
export async function getLikesYouList(uid) {
  const [likesSnap, mySwipesSnap] = await Promise.all([
    getDocs(collection(db, "likesReceived", uid, "from")),
    getDocs(collection(db, "swipes", uid, "actions")),
  ]);
  const alreadySwiped = new Set(mySwipesSnap.docs.map((d) => d.id));
  const likeDocs = likesSnap.docs.filter((d) => !alreadySwiped.has(d.id));

  const profiles = await Promise.all(
    likeDocs.map(async (d) => {
      const snap = await getDoc(doc(db, "users", d.id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        ...data,
        age: data.birthDate ? calcKoreanAge(data.birthDate) : data.age,
        _isSuper: d.data().isSuper || false,
      };
    })
  );
  return profiles
    .filter(Boolean)
    .sort((a, b) => (b._isSuper ? 1 : 0) - (a._isSuper ? 1 : 0));
}