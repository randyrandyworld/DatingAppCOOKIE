import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// 내 쿠키 개수를 실시간으로 구독 (쓰거나 충전하면 화면 숫자가 바로 바뀜)
export function useCookieBalance(uid) {
  const [balance, setBalance] = useState(null); // null = 불러오는 중

  useEffect(() => {
    if (!uid) return undefined;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => setBalance(snap.exists() ? snap.data().cookies ?? 0 : 0),
      () => setBalance(0)
    );
    return unsub;
  }, [uid]);

  return balance;
}
