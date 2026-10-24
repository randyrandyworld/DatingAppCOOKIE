// 친구 추천 — 유저마다 고유 추천코드를 갖고, 가입할 때 추천코드를 입력하면
// 추천인과 신규 가입자 둘 다에게 쿠키 30개씩 지급한다.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { addCookies } from "./cookies";

export const REFERRAL_BONUS_COOKIES = 30;

// 헷갈리는 0/O, 1/I는 빼고 6자리 코드
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// 코드로 소유자 찾기
async function findUserByReferralCode(code) {
  if (!code) return null;
  const q = query(collection(db, "users"), where("referralCode", "==", code), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// 내 추천코드가 없으면 하나 만들어서 저장 (겹치면 다시 뽑아서 절대 안 겹치게)
export async function ensureReferralCode(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const existingCode = snap.exists() ? snap.data().referralCode : null;
  if (existingCode) return existingCode;

  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const owner = await findUserByReferralCode(code);
    if (!owner) break;
    code = randomCode();
  }

  await setDoc(doc(db, "users", uid), { referralCode: code }, { merge: true });
  return code;
}

// 가입 직후, 입력한 추천코드가 있으면 추천인/신규가입자 둘 다에게 쿠키 30개씩 지급
// 반환: { applied: true/false }
export async function applyReferralCode(newUid, enteredCode) {
  const code = (enteredCode || "").trim().toUpperCase();
  if (!code) return { applied: false };

  const mySnap = await getDoc(doc(db, "users", newUid));
  if (mySnap.exists() && mySnap.data().referredBy) {
    return { applied: false }; // 이미 추천코드를 적용받았음 (중복 방지)
  }

  const owner = await findUserByReferralCode(code);
  if (!owner || owner.id === newUid) {
    return { applied: false, reason: "invalid" };
  }

  await addCookies(owner.id, REFERRAL_BONUS_COOKIES);
  await addCookies(newUid, REFERRAL_BONUS_COOKIES);
  await setDoc(doc(db, "users", newUid), { referredBy: owner.id }, { merge: true });

  return { applied: true, referrerName: owner.name || "" };
}