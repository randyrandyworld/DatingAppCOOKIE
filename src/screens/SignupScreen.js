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
import { friendlyError } from "./LoginScreen";

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(""); // ← 화면에 띄울 에러 문구
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(""); // 이전 에러 지우기
    if (!email || !password || !confirm) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("이메일 형식을 확인해주세요 (예: cookie@email.com)");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
    setSubmitting(true);
    try {
      await signup(email, password);
    } catch (e) {
      setError(friendlyError(e)); // "이미 사용 중인 이메일이에요." 등
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>♥ Cookie</Text>
      <Text style={styles.subtitle}>새 계정 만들기</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (6자 이상)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 확인"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      {/* ▼ 에러 있을 때만 빨간 글씨로 표시 ▼ */}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>회원가입</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>이미 계정이 있으신가요? 로그인</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#fff",
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#111111",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: { textAlign: "center", color: "#888", marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  error: {
    color: "#d33",
    marginBottom: 12,
    marginTop: 2,
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#111111",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { color: "#111111", textAlign: "center", marginTop: 20 },
});