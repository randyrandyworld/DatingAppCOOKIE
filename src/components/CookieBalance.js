import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CookieMark from "./CookieMark";
import { useAuth } from "../context/AuthContext";
import { useCookieBalance } from "../utils/useCookieBalance";
import { COOKIE_PRICES } from "../utils/cookies";
import { COLORS, FONTS } from "../theme";

// 쿠키 보유 개수 표시
//  variant="pill": 홈 상단 작은 알약 (누르면 사용처 안내)
//  variant="card": 내 프로필 화면의 큰 카드
export default function CookieBalance({ variant = "pill" }) {
  const { user } = useAuth();
  const balance = useCookieBalance(user?.uid);
  const text = balance == null ? "-" : String(balance);

  const showInfo = () =>
    Alert.alert(
      `내 쿠키 ${text}개`,
      `슈퍼라이크 ${COOKIE_PRICES.superLike}개\n부스트 ${COOKIE_PRICES.boost}개\n받은 좋아요 확인 ${COOKIE_PRICES.seeWhoLikedMe}개\n되돌리기 ${COOKIE_PRICES.rewind}개`
    );

  if (variant === "card") {
    return (
      <TouchableOpacity style={styles.card} onPress={showInfo} activeOpacity={0.85}>
        <CookieMark size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>내 쿠키</Text>
          <Text style={styles.cardValue}>{text}개</Text>
        </View>
        <Text style={styles.cardHint}>사용처 보기</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.pill} onPress={showInfo} activeOpacity={0.85}>
      <CookieMark size={18} />
      <Text style={styles.pillText}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surface,
  },
  pillText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLabel: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.textLight },
  cardValue: { fontSize: 24, fontFamily: FONTS.heading, color: COLORS.text, marginTop: 2 },
  cardHint: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary },
});
