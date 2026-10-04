import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS } from "../theme";

// 쿠키 워드마크: 🍪 + 소문자 "cookie" (틴더처럼 단순한 한 줄 로고)
export default function CookieLogo({ size = 28, color = COLORS.primary, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={{ fontSize: size * 0.95 }}>🍪</Text>
      <Text style={[styles.word, { fontSize: size, color }]}>cookie</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  word: { fontFamily: FONTS.heading, fontWeight: "800", letterSpacing: -0.5 },
});
