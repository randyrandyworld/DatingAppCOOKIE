import React from "react";
import { StyleSheet, Text, View } from "react-native";
import CookieMark from "./CookieMark";
import { COLORS, FONTS } from "../theme";

// 쿠키 로고: 한 입 베어 문 쿠키 마크 + 소문자 "cookie" 워드마크
// onColor=true면 컬러/그라데이션 배경 위에서 쓰는 흰색 버전
export default function CookieLogo({ size = 28, onColor = false, style }) {
  return (
    <View style={[styles.row, style]}>
      <CookieMark size={size * 1.1} variant={onColor ? "white" : "color"} />
      <Text style={[styles.word, { fontSize: size, color: onColor ? "#FFFFFF" : COLORS.primary }]}>
        cookie
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  word: { fontFamily: FONTS.logo, letterSpacing: -0.5 },
});
