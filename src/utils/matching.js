import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// 두 유저의 uid로 항상 같은 매치 id를 만든다 (정렬해서 합치기)
export function getMatchId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

// 내가 상대에게 좋아요/패스를 기록하고, 상대도 나를 좋아요 했으면 매치를 만든다.
// 반환값: 매치가 성사되면 matchId, 아니면 null
export async function recordSwipeAndCheckMatch(myUid, targetUid, liked) {
  // 내 스와이프 기록 저장
  await setDoc(doc(db, "swipes", myUid, "actions", targetUid), {
    liked,
    at: serverTimestamp(),
  });

  if (!liked) return null;

  // 상대가 나를 이미 좋아요 했는지 확인
  const theirSwipeSnap = await getDoc(
    doc(db, "swipes", targetUid, "actions", myUid)
  );

  if (theirSwipeSnap.exists() && theirSwipeSnap.data().liked) {
    const matchId = getMatchId(myUid, targetUid);
    await setDoc(doc(db, "matches", matchId), {
      users: [myUid, targetUid],
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
    });
    return matchId;
  }

  return null;
}

export function calcAge(birthYear) {
  if (!birthYear) return null;
  return new Date().getFullYear() - Number(birthYear);
}
