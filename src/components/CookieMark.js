import React, { useRef } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Mask, Rect, Stop } from "react-native-svg";

let uid = 0;

// 한 입 베어 문 쿠키 마크 (직접 그린 벡터).
// variant: "color"(그라데이션) | "white"(흰색, 어두운/컬러 배경용) | "gray"(비활성)
export default function CookieMark({ size = 32, variant = "color", style }) {
  const id = useRef(`ck${uid++}`).current;
  const fill = variant === "white" ? "#FFFFFF" : variant === "gray" ? "#C9BCAE" : `url(#${id}g)`;
  const chip = variant === "white" ? "#E8542B" : variant === "gray" ? "#FFFFFF" : "#4A2C17";

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" style={style}>
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFB04A" />
          <Stop offset="1" stopColor="#E8542B" />
        </LinearGradient>
        <Mask id={`${id}m`}>
          <Rect width="48" height="48" fill="#fff" />
          <Circle cx="40" cy="12" r="9" fill="#000" />
        </Mask>
      </Defs>
      <G mask={`url(#${id}m)`}>
        <Circle cx="24" cy="24" r="21" fill={fill} />
      </G>
      <G fill={chip}>
        <Ellipse cx="17" cy="19" rx="3.4" ry="2.8" rotation="-20" origin="17, 19" />
        <Ellipse cx="29" cy="30" rx="3.6" ry="2.8" rotation="25" origin="29, 30" />
        <Ellipse cx="14" cy="32" rx="2.8" ry="2.3" />
        <Ellipse cx="28" cy="15" rx="2.4" ry="2" />
        <Ellipse cx="36" cy="26" rx="2.3" ry="2" />
      </G>
    </Svg>
  );
}
