import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

// 날 좋아요한 사람 + 나와 매칭된 사람을 시간순으로 합쳐서 "알림 피드"로 만들기
export async function getNotificationFeed(uid) {
  if (!uid) return [];

  const [likesSnap, matchesSnap] = await Promise.all([
    getDocs(collection(db, "likesReceived", uid, "from")),
    getDocs(query(collection(db, "matches"), where("users", "array-contains", uid))),
  ]);

  const likeItems = likesSnap.docs.map((d) => ({
    type: d.data().isSuper ? "superlike" : "like",
    id: `like_${d.id}`,
    otherUid: d.id,
    at: d.data().at?.toDate?.() || new Date(0),
  }));

  const matchItems = matchesSnap.docs.map((d) => {
    const data = d.data();
    const otherUid = (data.users || []).find((u) => u !== uid);
    return {
      type: "match",
      id: `match_${d.id}`,
      matchId: d.id,
      otherUid,
      at: data.createdAt?.toDate?.() || new Date(0),
    };
  });

  const all = [...likeItems, ...matchItems].sort((a, b) => b.at - a.at);

  // 상대 프로필(이름·사진) 붙이기
  const uniqueUids = [...new Set(all.map((i) => i.otherUid).filter(Boolean))];
  const profileMap = {};
  await Promise.all(
    uniqueUids.map(async (id) => {
      const snap = await getDoc(doc(db, "users", id));
      if (snap.exists()) profileMap[id] = snap.data();
    })
  );

  return all.map((item) => ({ ...item, otherUser: profileMap[item.otherUid] || null }));
}