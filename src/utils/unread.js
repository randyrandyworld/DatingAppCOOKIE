import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useeEffect, useState } from "react";
import { db } from "../firebase";

// 매칭 문서 하나가 나(myUid) 기준으로 안읽음인지 판단
export function isMatchUnread(match, myUid) {
  if (match.lastSenderId === myUid) return false;
  const lastActivity = match.lastMessageAt?.toMillis?.() ?? 0;
  const lastRead = match[`lastRead_${myUid}`]?.toMillis?.() ?? 0;
  return lastActivity > lastRead;
}

// 채팅방에 들어갔을 때 "읽음" 처리
export function markMatchAsRead(matchId, myUid) {
  return updateDoc(doc(db, "matches", matchId), {
    [`lastRead_${myUid}`]: serverTimestamp(),
  }).catch(() => {});
}

// 하단 탭 뱃지용 — 안읽은 매칭 개수 실시간 구독
export function useUnreadMatchesCount(uid) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "matches"), where("users", "array-contains", uid));
    const unsub = onSnapshot(q, (snap) => {
      let c = 0;
      snap.forEach((d) => {
        const data = d.data();
        if ((data.blockedBy || []).length) return;
        if (isMatchUnread(data, uid)) c++;
      });
      setCount(c);
    });
    return unsub;
  }, [uid]);

  return count;
}