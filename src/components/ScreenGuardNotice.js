import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../theme";

const KEY = "screenGuardNoticeSeen_v1";

// 처음 한 번만 뜨는 "캡처가 제한돼요" 안내 (캡처가 안 될 때 오류로 오해하지 않도록)
export default function ScreenGuardNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!v) setVisible(true);
      })
      .catch(() => {});
  }, []);

  const close = () => {
    setVisible(false);
    AsyncStorage.setItem(KEY, "1").catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={28} color="#fff" />
          </View>
          <Text style={styles.title}>사진을 안전하게 지켜요</Text>
          <Text style={styles.body}>
            서로의 사진과 대화를 보호하기 위해{"\n"}이 앱에서는 스크린샷과 화면 녹화가 제한돼요.
          </Text>
          <TouchableOpacity style={styles.button} onPress={close} activeOpacity={0.85}>
            <Text style={styles.buttonText}>확인했어요</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,10,5,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontFamily: FONTS.heading, color: COLORS.text, marginBottom: 10 },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 28,
    paddingVertical: 15,
    paddingHorizontal: 44,
  },
  buttonText: { color: COLORS.accent, fontSize: 16, fontFamily: FONTS.heading },
});
