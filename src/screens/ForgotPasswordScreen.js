import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS, FONTS } from "../theme";
import CookieLogo from "../components/CookieLogo";
import { LinearGradient } from "expo-linear-gradient";

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// 비밀번호 찾기 — 가입한 이메일을 입력하면 Firebase가 "비밀번호 재설정" 메일을 보내줌.
// (쿠키 앱은 로그인 아이디 = 이메일이라, 아이디 찾기는 따로 없음 — 이메일만 알면 바로 여기로)
export default function ForgotPasswordScreen({ navigation }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    setError("");
    if (!isValidEmail(email)) {
      setError("이메일 형식을 확인해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      const code = e?.code || "";
      setError(
        code.includes("user-not-found")
          ? "가입되지 않은 이메일이에요."
          : e?.message || "메일 전송에 실패했어요. 다시 시도해주세요."
      );
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
        <Text style={styles.subtitle}>비밀번호를 잊으셨나요?</Text>
        <Text style={styles.desc}>
          가입할 때 쓴 이메일을 입력하면{"\n"}비밀번호를 다시 설정할 수 있는 메일을 보내드려요.
        </Text>

        {sent ? (
          <Text style={styles.sentText}>
            {email} 주소로 메일을 보냈어요.{"\n"}메일함(스팸함도 확인)에서 링크를 눌러 비밀번호를 재설정해주세요.
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="가입한 이메일"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>재설정 메일 보내기</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>로그인으로 돌아가기</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  logoRow: { alignSelf: "center", marginBottom: 6 },
  subtitle: {
    textAlign: "center",
    color: "rgba(255,255,255,0.92)",
    fontFamily: FONTS.bold,
    fontSize: 17,
    marginBottom: 8,
  },
  desc: {
    textAlign: "center",
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 28,
  },
  sentText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    lineHeight: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
  error: { color: "#fff", fontFamily: FONTS.bold, marginBottom: 12, textAlign: "center", fontSize: 14 },
  button: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 28,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: COLORS.accent, fontSize: 17, fontFamily: FONTS.heading },
  link: { color: "#fff", fontFamily: FONTS.bold, textAlign: "center", marginTop: 24 },
});