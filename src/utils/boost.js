// 부스트: 쿠키를 써서 일정 시간 동안, 내 주변 일정 반경 안의 사람들에게 내 프로필을 먼저 보여준다.
//  - users/{uid}.boostedUntil 에 "끝나는 시각(ms)"을 저장
//  - 홈 카드 목록을 만들 때, 부스트 중인 사람이 (보는 사람 기준) BOOST_RADIUS_KM 안에 있으면 목록 맨 앞으로 올린다
import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { COOKIE_PRICES } from "./cookies";

export const BOOST_DURATION_MIN = 30;
export const BOOST_RADIUS_KM = 30;

export const isBoosted = (user, now = Date.now()) => (user?.boostedUntil ?? 0) > now;

export const boostMinutesLeft = (boostedUntil, now = Date.now()) =>
  Math.max(0, Math.ceil(((boostedUntil ?? 0) - now) / 60000));

// 부스트 켜기: 쿠키 차감과 종료 시각 저장을 "한 번의 쓰기"로 처리한다 (규칙: 부스트는 쿠키 10개 차감과 함께일 때만 허용).
// ⚠️ COOKIE_PRICES.boost 를 바꾸면 firestore.rules 의 숫자(10)도 같이 바꿔야 해요.
// 반환: { ok: true, until } | { ok: false, reason: "cookies" }
export async function activateBoost(uid) {
  const price = COOKIE_PRICES.boost;
  const until = Date.now() + BOOST_DURATION_MIN * 60 * 1000;
  const ref = doc(db, "users", uid);
  const ok = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const balance = snap.exists() ? snap.data().cookies ?? 0 : 0;
    if (balance < price) return false;
    tx.update(ref, { cookies: balance - price, boostedUntil: until });
    return true;
  });
  return ok ? { ok: true, until } : { ok: false, reason: "cookies" };
}

// 카드 후보 정렬: 반경 안에서 부스트 중인 사람을 앞으로 (나머지 순서는 그대로 유지)
export function sortWithBoost(list, now = Date.now()) {
  const boosted = [];
  const rest = [];
  for (const u of list) {
    const inRange = u._distance != null && u._distance <= BOOST_RADIUS_KM;
    (isBoosted(u, now) && inRange ? boosted : rest).push(u);
  }
  boosted.sort((a, b) => a._distance - b._distance);
  return [...boosted, ...rest];
}
