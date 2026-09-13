import { createNavigationContainerRef } from "@react-navigation/native";

// App.js/RootNavigator 밖에서도(알림 탭 핸들러 등) 화면 이동을 할 수 있도록 만든 전역 ref
export const navigationRef = createNavigationContainerRef();
