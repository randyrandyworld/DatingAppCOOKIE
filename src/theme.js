// 쿠키 앱 공용 디자인 토큰 (컬러 + 폰트)
// 여기 값만 바꾸면 앱 전체 톤이 같이 바뀌도록, 화면 곳곳의 하드코딩된 색상을 이걸로 교체해나가는 중.
export const COLORS = {
  // 초코칩 쿠키 팔레트
  bg: "#FFF7E8",          // 배경 (쿠키 도우 크림색)
  card: "#FFFFFF",        // 카드/입력창 배경
  primary: "#8B5A2B",     // 메인 액션 컬러 (초콜릿 브라운) — 기존 #111111 대체
  primaryDark: "#5C3A1E", // 좀 더 진한 초콜릿 (텍스트 등)
  accent: "#E3A857",      // 캐러멜 (포인트, 배지 등)
  text: "#3E2723",        // 기본 텍스트 (초콜릿 다크 브라운)
  textLight: "#9C7A5B",   // 보조 텍스트
  border: "#F0DFC0",      // 옅은 테두리
  danger: "#D9534F",
};

export const FONTS = {
  // 부드럽고 따뜻한 느낌의 제목용 폰트 (Google Fonts "Gowun Dodum")
  // 본문은 가독성을 위해 시스템 기본 폰트를 그대로 사용
  heading: "GowunDodum_400Regular",
};
