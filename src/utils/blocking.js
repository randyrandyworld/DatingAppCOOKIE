import { Alert } from "react-native";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getMatchId } from "./matching";

const REPORT_REASONS = ["부적절한 사진", "불쾌한 메시지/행동", "가짜 프로필", "기타"];

// 내가 차단한 유저 uid 목록 가져오기
export async function getBlockedIds(myUid) {
  const snap = await getDocs(collection(db, "blocks", myUid, "blocked"));
  return new Set(snap.docs.map((d) => d.id));
}

export async function blockUser(myUid, targetUid) {
  await setDoc(doc(db, "blocks", myUid, "blocked", targetUid), {
    at: serverTimestamp(),
  });

  // 이미 매칭된 사이라면, 매치 문서에도 표시해서 상대 쪽 화면에서도 채팅이 사라지게 함
  try {
    await updateDoc(doc(db, "matches", getMatchId(myUid, targetUid)), {
      blockedBy: arrayUnion(myUid),
    });
  } catch (e) {
    // 매치가 없으면 실패하는 게 정상 — 무시
  }
}

export async function reportUser(myUid, targetUid, reason) {
  await addDoc(collection(db, "reports"), {
    reporterId: myUid,
    targetId: targetUid,
    reason,
    createdAt: serverTimestamp(),
  });
}

// 프로필/채팅에서 "···" 버튼을 눌렀을 때 쓰는 공용 액션시트
export function showReportBlockMenu(myUid, target, { onBlocked, onReported } = {}) {
  Alert.alert(`${target.name}님`, "신고하거나 차단할 수 있어요", [
    { text: "취소", style: "cancel" },
    {
      text: "차단하기",
      style: "destructive",
      onPress: async () => {
        try {
          await blockUser(myUid, target.id);
          Alert.alert("차단 완료", `${target.name}님을 차단했어요. 더 이상 보이지 않아요.`);
          onBlocked?.();
        } catch (e) {
          Alert.alert("오류", e?.message || "다시 시도해주세요.");
        }
      },
    },
    {
      text: "신고하기",
      onPress: () => showReasonMenu(myUid, target, onReported),
    },
  ]);
}

function showReasonMenu(myUid, target, onReported) {
  Alert.alert(
    "신고 사유를 선택해주세요",
    "신고와 함께 자동으로 차단돼요",
    REPORT_REASONS.map((reason) => ({
      text: reason,
      onPress: async () => {
        try {
          await reportUser(myUid, target.id, reason);
          await blockUser(myUid, target.id);
          Alert.alert("신고 접수됨", "신고가 접수됐고 해당 사용자를 차단했어요.");
          onReported?.();
        } catch (e) {
          Alert.alert("오류", e?.message || "다시 시도해주세요.");
        }
      },
    })).concat([{ text: "취소", style: "cancel" }])
  );
}
