// 관리자(개발자) 모드를 쓸 수 있는 계정의 UID 목록.
//
// UID 찾는 법: Firebase 콘솔 → Authentication → Users 표의 "User UID" 열을 복사.
// ⚠️ Firestore 보안 규칙(claude/status.md의 "관리자 모드용 규칙")에도 똑같은 UID가 들어가야
//    더미 유저 기능이 동작해요. 관리자를 추가/삭제할 땐 이 파일과 규칙 두 군데를 같이 바꿔주세요.
export const ADMIN_UIDS = [
  // "여기에_승일_UID",
  // "여기에_친구_UID",
];

export const isAdminUid = (uid) => !!uid && ADMIN_UIDS.includes(uid);
