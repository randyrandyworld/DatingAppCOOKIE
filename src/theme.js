// 쿠키 앱 공용 디자인 토큰 (컬러 + 폰트)
// 흰 배경 + 쿠키 그라데이션(금빛 도우 → 구운 주황) 포인트. 여기 값만 바꾸면 앱 전체 톤이 같이 바뀐다.
export const COLORS = {
  bg: "#FFFFFF",          // 배경 (화이트)
  card: "#FFFFFF",        // 카드/입력창 배경
  surface: "#FBF6EF",     // 아주 옅은 크림 (입력창 바탕, 구분 영역)
  primary: "#E8602C",     // 메인 포인트 — 구운 쿠키색
  primaryDark: "#4A2C17", // 초콜릿 (진한 강조)
  accent: "#FFB04A",      // 금빛 도우 (하이라이트)
  text: "#2B1D14",        // 기본 텍스트 (다크 초콜릿)
  textLight: "#8C7B6B",   // 보조 텍스트
  inactive: "#B5A698",    // 비활성 아이콘
  border: "#EFE7DC",      // 옅은 테두리
  danger: "#D9534F",
  // 그라데이션 (expo-linear-gradient의 colors에 그대로 사용)
  gradient: ["#FFB04A", "#E8542B"],
  gradientBg: ["#FFB04A", "#F27A36", "#E8542B"],
};

export const FONTS = {
  // 제목/이름/버튼용 굵은 한글 폰트 (Gothic A1)
  heading: "GothicA1_800ExtraBold",
  bold: "GothicA1_700Bold",
  regular: "GothicA1_400Regular",
  // 로고, COOKIE!, LIKE/NOPE 같은 영문 강조용 (Nunito Black)
  logo: "Nunito_900Black",
};
