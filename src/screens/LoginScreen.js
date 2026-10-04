import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS, FONTS } from "../theme";
import CookieLogo from "../components/CookieLogo";
import { LinearGradient } from "expo-linear-gradient";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("입력 확인", "이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert("로그인 실패", friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={COLORS.gradientBg} start={{ x: 0.1, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ flex: 1 }}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CookieLogo size={46} onColor style={styles.logoRow} />
      <Text style={styles.subtitle}>다시 만나서 반가워요</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={COLORS.textLight}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        placeholderTextColor={COLORS.textLight}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>로그인</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.link}>계정이 없으신가요? 회원가입</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

export function friendlyError(e) {
  const code = e?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (code.includes("user-not-found")) return "가입되지 않은 이메일이에요.";
  if (code.includes("email-already-in-use"))
    return "이미 사용 중인 이메일이에요.";
  if (code.includes("weak-password"))
    return "비밀번호는 6자 이상이어야 해요.";
  if (code.includes("invalid-email")) return "이메일 형식이 올바르지 않아요.";
  return e?.message || "알 수 없는 오류가 발생했어요.";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoRow: { alignSelf: "center", marginBottom: 6 },
  logo: {
    fontSize: 36,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 6,
    fontFamily: FONTS.heading,
  },
  subtitle: {
    textAlign: "center",
    color: "rgba(255,255,255,0.92)", fontFamily: FONTS.bold,
    marginBottom: 32,
  },
  input: {
    borderWidth: 0,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 16,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: COLORS.card,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 28,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: COLORS.accent, fontSize: 17, fontFamily: FONTS.heading },
  link: { color: "#fff", fontFamily: FONTS.bold, textAlign: "center", marginTop: 20 },
});
