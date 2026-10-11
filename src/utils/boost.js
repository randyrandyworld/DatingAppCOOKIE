// 부스트: 쿠키를 써서 일정 시간 동안, 내 주변 일정 반경 안의 사람들에게 내 프로필을 먼저 보여준다.
//  - users/{uid}.boostedUntil 에 "끝나는 시각(ms)"을 저장
//  - 홈 카드 목록을 만들 때, 부스트 중인 사람이 (보는 사람 기준) BOOST_RADIUS_KM 안에 있으면 목록 맨 앞으로 올린다
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { addCookies, COOKIE_PRICES, spendOn } from "./cookies";

export const BOOST_DURATION_MIN = 30;
export const BOOST_RADIUS_KM = 30;

export const isBoosted = (user, now = Date.now()) => (user?.boostedUntil ?? 0) > now;

export const boostMinutesLeft = (boostedUntil, now = Date.now()) =>
  Math.max(0, Math.ceil(((boostedUntil ?? 0) - now) / 60000));

// 부스트 켜기: 쿠키 차감 → 종료 시각 저장. 저장에 실패하면 쿠키를 돌려준다.
// 반환: { ok: true, until } | { ok: false, reason: "cookies" }
export async function activateBoost(uid) {
  const paid = await spendOn(uid, "boost");
  if (!paid) return { ok: false, reason: "cookies" };

  const until = Date.now() + BOOST_DURATION_MIN * 60 * 1000;
  try {
    await updateDoc(doc(db, "users", uid), { boostedUntil: until });
  } catch (e) {
    await addCookies(uid, COOKIE_PRICES.boost).catch(() => {});
    throw e;
  }
  return { ok: true, until };
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
