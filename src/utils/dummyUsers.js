// 관리자 모드용 더미(가짜) 유저 도구.
// - 더미 유저의 문서 id는 항상 "dummy_" 로 시작하고 isDummy: true 필드가 붙어요.
// - Firestore 규칙상 "관리자 UID"만 dummy_ 문서를 쓸 수 있어요(규칙은 claude/status.md 참고).
// - 홈(DiscoverScreen)에서는 관리자에게만 더미가 보여요 → 진짜 사용자에게는 절대 노출되지 않아요.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getMatchId } from "./matching";

export const DUMMY_PREFIX = "dummy_";
export const isDummyId = (id) => typeof id === "string" && id.startsWith(DUMMY_PREFIX);

export const DUMMY_COUNT = 6;
const LIKES_ME_COUNT = 3; // 앞의 3명은 "이미 나를 좋아요 한 상태"로 만들어요

const NAMES = {
  여성: ["지우", "서연", "하린", "예은", "수아", "다은"],
  남성: ["민준", "도윤", "서준", "하준", "지호", "준우"],
};
const HEIGHTS = { 여성: [158, 162, 165, 168, 160, 170], 남성: [172, 175, 178, 181, 170, 184] };
const JOBS = ["디자이너", "개발자", "간호사", "마케터", "초등학교 교사", "바리스타"];
const BIOS = [
  "주말엔 카페 투어 다녀요 ☕",
  "쿠키 좋아하는 사람이면 일단 호감",
  "맛집 탐방이랑 산책이 취미예요",
  "넷플릭스보다 영화관파 🎬",
  "러닝 시작한 지 3개월째!",
  "고양이 집사입니다 🐈",
];
// 거리 필터(1~100km)를 테스트할 수 있도록 내 위치에서 이만큼씩 떨어뜨려 둬요
const DISTANCES_KM = [1.5, 3, 7, 12, 25, 45];

export const DUMMY_REPLIES = [
  "안녕하세요! 반가워요 🍪",
  "프로필 사진 분위기 좋네요 ㅎㅎ",
  "오늘 하루 어떠셨어요?",
  "혹시 쿠키 좋아하세요?",
  "주말에 시간 되시면 커피 한잔 어때요 ☕",
  "ㅋㅋㅋ 그쵸 저도 그렇게 생각했어요",
];

// 실제 사람 사진 대신 만화 아바타(DiceBear)를 써서 한눈에 '더미'인 걸 알아보게 해요.
export const dummyPhoto = (i, variant = 0) =>
  `https://api.dicebear.com/9.x/avataaars/png?seed=cookie-dummy-${i}-${variant}&size=600&backgroundColor=ffe9c7,fbd5a0,f3c98b`;

const dummyIdAt = (i) => `${DUMMY_PREFIX}${String(i + 1).padStart(2, "0")}`;

// 나(myUid)와 이 더미 사이의 매칭 + 메시지를 지운다 (없으면 아무 일도 안 일어남)
export async function removeMatchWithDummy(myUid, dummyId) {
  const matchId = getMatchId(myUid, dummyId);
  const msgs = await getDocs(collection(db, "matches", matchId, "messages"));
  await Promise.all(msgs.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "matches", matchId));
}

// 더미 유저를 (다시) 만들고, 나와의 스와이프/매칭 상태를 처음 상태로 되돌린다.
// 앞의 3명은 "이미 나를 좋아요 한 상태" → 홈에서 오른쪽으로 넘기면 진짜 매칭 로직·연출이 실행돼요.
export async function seedDummyUsers({ myUid, myProfile }) {
  // 내가 만나고 싶은 성별로 만들어야 홈 카드(성별 필터)에 뜨기 때문
  const gender = myProfile?.seekingGender === "남성" ? "남성" : "여성";
  const myGender = myProfile?.gender === "남성" || myProfile?.gender === "여성" ? myProfile.gender : "남성";
  const myLoc = myProfile?.location;

  for (let i = 0; i < DUMMY_COUNT; i++) {
    const id = dummyIdAt(i);
    const likesMe = i < LIKES_ME_COUNT;

    let location = null;
    if (myLoc) {
      const km = DISTANCES_KM[i];
      const rad = (i * 60 * Math.PI) / 180;
      location = {
        lat: myLoc.lat + (km * Math.cos(rad)) / 111,
        lng: myLoc.lng + (km * Math.sin(rad)) / (111 * Math.cos((myLoc.lat * Math.PI) / 180)),
      };
    }

    await setDoc(doc(db, "users", id), {
      isDummy: true,
      name: `${NAMES[gender][i]} (더미)`,
      age: 24 + i,
      gender,
      seekingGender: myGender,
      height: HEIGHTS[gender][i],
      job: JOBS[i],
      bio:
        (likesMe
          ? "💘 [더미] 나를 이미 좋아요 한 상태 — 오른쪽으로 넘기면 매칭!"
          : "🙅 [더미] 아직 나를 좋아요 안 한 상태") +
        "\n" +
        BIOS[i],
      photos: [dummyPhoto(i, 0), dummyPhoto(i, 1)],
      ...(location ? { location } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await Promise.all([
      // 내 스와이프 기록 삭제 → 카드가 다시 나타남
      deleteDoc(doc(db, "swipes", myUid, "actions", id)),
      // 이전 테스트로 생긴 매칭/채팅 정리
      removeMatchWithDummy(myUid, id),
      // "나를 좋아요 한 상태" 세팅 (아닌 더미는 기록 삭제)
      likesMe
        ? setDoc(doc(db, "swipes", id, "actions", myUid), { liked: true, at: serverTimestamp() })
        : deleteDoc(doc(db, "swipes", id, "actions", myUid)),
    ]);
  }
}

// 더미 유저와 나와의 관련 데이터를 전부 삭제한다. 삭제한 더미 수를 반환.
export async function clearDummyData({ myUid }) {
  const snap = await getDocs(query(collection(db, "users"), where("isDummy", "==", true)));
  for (const d of snap.docs) {
    await Promise.all([
      removeMatchWithDummy(myUid, d.id),
      deleteDoc(doc(db, "swipes", myUid, "actions", d.id)),
      deleteDoc(doc(db, "swipes", d.id, "actions", myUid)),
    ]);
    await deleteDoc(d.ref);
  }
  return snap.size;
}

// 더미가 나에게 채팅 메시지를 보낸 것처럼 만든다 (채팅 화면, 읽음 처리, 안읽음 뱃지 테스트용)
export async function sendDummyReply({ myUid, dummyId, text }) {
  const matchId = getMatchId(myUid, dummyId);
  const msg = text || DUMMY_REPLIES[Math.floor(Math.random() * DUMMY_REPLIES.length)];
  await addDoc(collection(db, "matches", matchId, "messages"), {
    senderId: dummyId,
    text: msg,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "matches", matchId), {
    lastMessage: msg,
    lastMessageAt: serverTimestamp(),
    lastSenderId: dummyId,
  });
  return msg;
}
