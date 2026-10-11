import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS } from "../theme";

// 여러 버튼이 필요한 메뉴(신고/차단/매칭끊기 같은)는 React Native의 Alert.alert로 띄우면
// 안드로이드는 버튼 3개 넘으면 잘려서 사라지고, 웹에서는 아예 안 뜨는 문제가 있어서
// 직접 만든 바텀시트로 띄운다. 안내문구(확인 1개짜리)는 그냥 Alert.alert 써도 됨.
let showFn = null;

export function showActionSheet({ title, message, buttons }) {
  if (showFn) showFn({ title, message, buttons });
}

export default function ActionSheetHost() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState(null);

  showFn = (cfg) => {
    setConfig(cfg);
    setVisible(true);
  };

  const close = () => setVisible(false);

  const handlePress = (btn) => {
    close();
    // 모달이 닫히는 애니메이션과 다음 액션(특히 또 다른 시트를 띄우는 경우)이 겹치지 않게 살짝 딜레이
    setTimeout(() => btn.onPress?.(), 250);
  };

  if (!config) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {!!config.title && <Text style={styles.title}>{config.title}</Text>}
          {!!config.message && <Text style={styles.message}>{config.message}</Text>}
          <View style={styles.buttonGroup}>
            {(config.buttons || []).map((btn, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.button,
                  i > 0 && styles.buttonBorder,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => handlePress(btn)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === "destructive" && styles.destructiveText,
                    btn.style === "cancel" && styles.cancelText,
                  ]}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(43,29,20,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 28,
    paddingTop: 14,
  },
  title: {
    textAlign: "center",
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    paddingHorizontal: 24,
  },
  message: {
    textAlign: "center",
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    paddingHorizontal: 24,
  },
  buttonGroup: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  button: {
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  buttonPressed: {
    backgroundColor: COLORS.border,
  },
  buttonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  destructiveText: { color: COLORS.danger },
  cancelText: { color: COLORS.textLight },
});