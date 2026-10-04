import React from "react";
import { StyleSheet, View } from "react-native";

// 별도 라이브러리 없이 만든 "아래쪽이 점점 어두워지는" 그라데이션.
// 투명한 띠를 여러 장 겹쳐서 위→아래로 갈수록 진해지게 한다. (카드 하단 이름/정보 가독성용)
const STEPS = 14;

export default function FadeOverlay({ height = 240, color = "20,12,6", maxOpacity = 0.82, style }) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }, style]}>
      {Array.from({ length: STEPS }).map((_, i) => {
        const t = (i + 1) / STEPS; // 0→1 (위→아래)
        return (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: `rgba(${color},${(maxOpacity * t * t).toFixed(3)})`,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
