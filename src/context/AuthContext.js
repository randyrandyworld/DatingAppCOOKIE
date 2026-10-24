import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  registerForPushNotificationsAsync,
  savePushTokenForUser,
} from "../utils/notifications";
import { refreshLocationIfPermitted } from "../utils/locationRefresh";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // 로그인 상태 감시
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (!firebaseUser) {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return unsub;
  }, []);

  // 로그인된 유저의 프로필 문서 실시간 감시 (프로필 작성 여부 판단용)
  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setProfileLoading(false);
      },
      () => setProfileLoading(false)
    );
    return unsub;
  }, [user]);

  // 로그인 + 프로필 작성이 끝난 유저에 한해, 이 기기의 푸시 토큰을 발급받아 저장
  // (동일 로그인 세션에서 프로필이 갱신될 때마다 중복 등록하지 않도록 uid당 한 번만 실행)
  const registeredTokenUidRef = useRef(null);
  useEffect(() => {
    if (!user || !profile) return;
    if (registeredTokenUidRef.current === user.uid) return;
    registeredTokenUidRef.current = user.uid;

    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushTokenForUser(user.uid, token);
    });
  }, [user, profile]);

  // 로그인 세션당 한 번, 위치 권한을 이미 허용한 사용자라면 조용히 최신 위치로 갱신
  // (프로필 수정 화면에 들어가지 않아도, 앱을 열 때마다 위치가 최신 상태로 유지되도록)
  const refreshedLocationUidRef = useRef(null);
  useEffect(() => {
    if (!user || !profile) return;
    if (refreshedLocationUidRef.current === user.uid) return;
    refreshedLocationUidRef.current = user.uid;

    refreshLocationIfPermitted(user.uid);
  }, [user, profile]);

  const signup = (email, password) =>
    createUserWithEmailAndPassword(auth, email.trim(), password);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email.trim(), password);

  const logout = () => signOut(auth);

  // 비밀번호 찾기 — 가입한 이메일로 "비밀번호 재설정" 메일을 보낸다 (Firebase 기본 제공, 별도 서버 불필요)
  const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

  // 회원 탈퇴 — 보안상 비밀번호로 재인증한 뒤에만 삭제를 진행한다.
  // 내 프로필(users/{uid}) 문서를 지우고 Firebase Auth 계정 자체를 삭제한다.
  // (주의: 매칭/채팅/좋아요 등 다른 컬렉션에 남아있는 흔적까지 전부 지우는 건
  //  서버(Cloud Functions) 없이는 한계가 있어 최소한으로 처리함)
  const deleteAccount = async (password) => {
    const current = auth.currentUser;
    if (!current) throw new Error("로그인 정보가 없어요.");

    const credential = EmailAuthProvider.credential(current.email, password);
    await reauthenticateWithCredential(current, credential);

    try {
      await deleteDoc(doc(db, "users", current.uid));
    } catch (e) {
      // 프로필 삭제가 실패해도 계정 삭제는 계속 진행
    }

    await deleteUser(current);
  };

  const value = {
    user,
    profile,
    loading: authLoading || (!!user && profileLoading),
    hasProfile: !!profile,
    signup,
    login,
    logout,
    resetPassword,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}