import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  registerForPushNotificationsAsync,
  savePushTokenForUser,
} from "../utils/notifications";

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

  const signup = (email, password) =>
    createUserWithEmailAndPassword(auth, email.trim(), password);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email.trim(), password);

  const logout = () => signOut(auth);

  const value = {
    user,
    profile,
    loading: authLoading || (!!user && profileLoading),
    hasProfile: !!profile,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
