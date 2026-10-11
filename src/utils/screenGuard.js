// 캡처 방지: 사진/대화가 보이는 화면에서만 스크린샷·화면 녹화를 막는다.
// - 안드로이드: 캡처하면 검은 화면(최근 앱 목록 미리보기도 가려짐)
// - iOS: 스크린 레코딩(iOS 11+), 스크린샷(iOS 13+) 차단
// ※ 다른 기기로 화면을 카메라로 찍는 건 어떤 앱도 막을 수 없다.
import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenCapture from "expo-screen-capture";

// 관리자 모드에서 켜고 끌 수 있는 스위치 (기본: 켜짐). 디자인 확인용 캡처가 필요할 때만 끈다.
let guardOn = true;
export const isScreenGuardOn = () => guardOn;
export const setScreenGuardOn = (v) => {
  guardOn = !!v;
};

// 화면 컴포넌트에서 useScreenGuard("화면이름") 한 줄이면 된다. 화면에서 벗어나면 자동으로 해제.
export function useScreenGuard(key) {
  useFocusEffect(
    useCallback(() => {
      if (!guardOn) return undefined;
      ScreenCapture.preventScreenCaptureAsync(key).catch(() => {});
      return () => {
        ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
      };
    }, [key])
  );
}
