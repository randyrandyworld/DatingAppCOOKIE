import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { sendPushNotificationToUser } from "./notifications";
import { recordLikeReceived } from "./likesYou";

// 두 유저의 uid로 항상 같은 매치 id를 만든다 (정렬해서 합치기)
export function getMatchId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

// 내가 상대에게 좋아요/패스를 기록하고, 상대도 나를 좋아요 했으면 매치를 만든다.
export async function recordSwipeAndCheckMatch(myUid, targetUid, liked, myName, isSuper = false) {
  await setDoc(doc(db, "swipes", myUid, "actions", targetUid), {
    liked,
    isSuper,
    at: serverTimestamp(),
  });

  if (!liked) return null;

  await recordLikeReceived(targetUid, myUid, isSuper); // 상대방 쪽에 "날 좋아요함" 기록

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

    sendPushNotificationToUser(targetUid, {
      title: isSuper ? "⭐ 슈퍼라이크 매칭이 생겼어요!" : "새로운 매칭이 생겼어요 🎉",
      body: myName ? `${myName}님과 매칭됐어요!` : "누군가와 매칭됐어요!",
      data: { type: "match", matchId, otherUser: { id: myUid, name: myName || "" } },
    });

    return matchId;
  }

  if (isSuper) {
    sendPushNotificationToUser(targetUid, {
      title: "⭐ 슈퍼라이크를 받았어요!",
      body: myName ? `${myName}님이 당신에게 슈퍼라이크를 보냈어요` : "누군가 슈퍼라이크를 보냈어요",
      data: { type: "superLike" },
    });
  }

  return null;
}

// 생년월일("1994-01-02")로 만 나이를 계산 — 생일이 아직 안 지났으면 1살 덜 쳐줌
export function calcKoreanAge(birthDate) {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;

  const today = new Date();
  let age = today.getFullYear() - y;
  const hadBirthdayThisYear =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

// (예전 코드 호환용 — 더미 유저처럼 출생연도만 있는 경우)
export function calcAge(birthYear) {
  if (!birthYear) return null;
  return new Date().getFullYear() - Number(birthYear);
}