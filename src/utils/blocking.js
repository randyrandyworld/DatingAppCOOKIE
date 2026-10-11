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
import { showActionSheet } from "../components/ActionSheetHost";

// 서로 다른 사용자 N명에게 신고가 쌓이면 다른 사람들의 카드 목록에서 자동으로 숨김
export const REPORT_HIDE_THRESHOLD = 3;

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

  // 신고 누적 카운트: 대상 유저 문서의 reportedBy 배열에 내 uid를 추가 (한 사람이 여러 번 해도 1명으로 셈)
  // 이미 신고한 적이 있으면 규칙에서 막히는데, 그건 정상이라 무시한다.
  try {
    await updateDoc(doc(db, "users", targetUid), { reportedBy: arrayUnion(myUid) });
  } catch (e) {
    // 무시
  }
}

// 매칭 끊기 — 차단과 달리 신고/차단 기록은 남기지 않고, 두 사람 모두에게 채팅이 사라진다.
export async function unmatchUser(myUid, targetUid) {
  await updateDoc(doc(db, "matches", getMatchId(myUid, targetUid)), {
    unmatchedBy: arrayUnion(myUid),
  });
}

// 프로필/채팅에서 "···" 버튼을 눌렀을 때 쓰는 공용 메뉴.
// 예전엔 react-native의 Alert.alert로 띄웠는데, 버튼이 4개(취소/매칭끊기/차단/신고)라서
// 안드로이드에서는 3개 넘는 버튼이 잘려서 메뉴가 사라지고, 웹에서는 Alert.alert 자체가
// 제대로 안 떠서 버튼이 하나도 안 보이는 문제가 있었음. 그래서 직접 만든 바텀시트(ActionSheetHost)로 띄움.
export function showReportBlockMenu(
  myUid,
  target,
  { onBlocked, onReported, onUnmatched, allowUnmatch = false } = {}
) {
  const buttons = [];

  if (allowUnmatch) {
    buttons.push({
      text: "매칭 끊기",
      style: "destructive",
      onPress: () =>
        showActionSheet({
          title: "매칭을 끊을까요?",
          message: "대화방이 두 사람 모두에게서 사라지고 되돌릴 수 없어요.",
          buttons: [
            {
              text: "끊기",
              style: "destructive",
              onPress: async () => {
                try {
                  await unmatchUser(myUid, target.id);
                  onUnmatched?.();
                } catch (e) {
                  Alert.alert("오류", e?.message || "다시 시도해주세요.");
                }
              },
            },
            { text: "취소", style: "cancel" },
          ],
        }),
    });
  }

  buttons.push(
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
    { text: "취소", style: "cancel" }
  );

  showActionSheet({
    title: `${target.name}님`,
    message: "원하는 동작을 선택해주세요",
    buttons,
  });
}

function showReasonMenu(myUid, target, onReported) {
  showActionSheet({
    title: "신고 사유를 선택해주세요",
    message: "신고와 함께 자동으로 차단돼요",
    buttons: [
      ...REPORT_REASONS.map((reason) => ({
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
      })),
      { text: "취소", style: "cancel" },
    ],
  });
}