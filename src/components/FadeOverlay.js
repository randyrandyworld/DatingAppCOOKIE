import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// 카드 아래쪽이 자연스럽게 어두워지는 그라데이션 (이름/정보 글씨 가독성용)
export default function FadeOverlay({ height = 260, style }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(20,10,5,0)", "rgba(20,10,5,0.78)"]}
      style={[styles.wrap, { height }, style]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
