import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { recordSwipeAndCheckMatch } from "../utils/matching";
import { getBlockedIds, showReportBlockMenu, REPORT_HIDE_THRESHOLD } from "../utils/blocking";
import { distanceKm } from "../utils/distance";
import { isAdminUid } from "../adminConfig";
import { getFreeSuperLikeStatus, markFreeSuperLikeUsed } from "../utils/superLike";
import { tryUseLike, DAILY_LIKE_LIMIT } from "../utils/dailyLikes";
import { spendOn, getCookieBalance, COOKIE_PRICES } from "../utils/cookies";
import { useUnreadMatchesCount } from "../utils/unread";
import { useLikesYouCount } from "../utils/likesYou";
import {
  activateBoost,
  boostMinutesLeft,
  BOOST_DURATION_MIN,
  BOOST_RADIUS_KM,
  sortWithBoost,
} from "../utils/boost";
import CookieLogo from "../components/CookieLogo";
import CookieBalance from "../components/CookieBalance";
import FadeOverlay from "../components/FadeOverlay";
import CookieMark from "../components/CookieMark";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONTS } from "../theme";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.28;

export default function DiscoverScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rawList, setRawList] = useState([]); // 필터 전 원본
  const [maxDist, setMaxDist] = useState(50); // 거리 설정 (기본 50km)
  const [filterOpen, setFilterOpen] = useState(false); // 거리 슬라이더를 눌렀을 때만 펼쳐지도록
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const unreadMatches = useUnreadMatchesCount(user?.uid);
  const likesYouCount = useLikesYouCount(user?.uid);
  const hasNotification = unreadMatches + likesYouCount > 0;

  // 부스트 상태: 끝나는 시각(ms). 30초마다 남은 시간을 새로 계산
  const [boostUntil, setBoostUntil] = useState(profile?.boostedUntil ?? 0);
  const [nowTick, setNowTick] = useState(Date.now());
  const boostActive = boostUntil > nowTick;

  useEffect(() => {
    if (boostUntil <= Date.now()) return undefined;
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, [boostUntil]);

  // 매칭 연출용 상태
  const [matchInfo, setMatchInfo] = useState(null); // { matchId, otherUser } or null

  const position = useRef(new Animated.ValueXY()).current;
  const superFlash = useRef(new Animated.Value(0)).current;
  const checkingLike = useRef(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const [swipedSnap, blockedIds] = await Promise.all([
        getDocs(collection(db, "swipes", user.uid, "actions")),
        getBlockedIds(user.uid),
      ]);
      const swipedIds = new Set(swipedSnap.docs.map((d) => d.id));

      const usersSnap = await getDocs(collection(db, "users"));
      const list = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (u) =>
            u.id !== user.uid && !swipedIds.has(u.id) && !blockedIds.has(u.id)
        )
        .filter((u) => !profile?.seekingGender || u.gender === profile.seekingGender)
        .filter((u) => !u.isDummy || isAdminUid(user.uid))
        .filter((u) => (u.reportedBy?.length || 0) < REPORT_HIDE_THRESHOLD);

      setRawList(list);
      setIndex(0);
    } catch (e) {
      Alert.alert("불러오기 실패", e?.message || "다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const candidates = useMemo(() => {
    const myLoc = profile?.location;
    const withDistance = rawList
      .map((u) => {
        let d = null;
        if (myLoc && u.location) {
          d = distanceKm(myLoc.lat, myLoc.lng, u.location.lat, u.location.lng);
        }
        return { ...u, _distance: d };
      })
      .filter((u) => u._distance == null || u._distance <= maxDist);
    // 부스트 중인 사람(내 주변 30km 안)을 앞으로
    return sortWithBoost(withDistance);
  }, [rawList, maxDist, profile?.location]);

  useEffect(() => {
    setIndex(0);
  }, [maxDist]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderMove: Animated.event(
          [null, { dx: position.x, dy: position.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: (_, g) => {
          if (g.dx > SWIPE_THRESHOLD) {
            handleLikeAttempt();
          } else if (g.dx < -SWIPE_THRESHOLD) {
            forceSwipe("left");
          } else {
            resetPosition();
          }
        },
      }),
    [candidates, index, busy]
  );

  const forceSwipe = (direction, isSuper = false) => {
    if (busy) return;
    Animated.timing(position, {
      toValue: { x: direction === "right" ? width * 1.5 : -width * 1.5, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction, isSuper));
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const onSwipeComplete = async (direction, isSuper = false) => {
    const target = candidates[index];
    position.setValue({ x: 0, y: 0 });
    setIndex((i) => i + 1);
    if (!target) return;

    const liked = direction === "right";
    setBusy(true);
    try {
      const matchId = await recordSwipeAndCheckMatch(
        user.uid,
        target.id,
        liked,
        profile?.name,
        isSuper
      );
      if (matchId) {
        setMatchInfo({ matchId, otherUser: target });
      }
    } catch (e) {
      // 조용히 무시
    } finally {
      setBusy(false);
    }
  };

  // 오른쪽(좋아요) 스와이프는 하루 무료 한도부터 체크 — 다 썼으면 쿠키로 추가 구매
  const handleLikeAttempt = async () => {
    if (busy || !current || checkingLike.current) {
      if (!busy) resetPosition();
      return;
    }
    checkingLike.current = true;
    try {
      const ok = await tryUseLike(user.uid);
      if (ok) {
        forceSwipe("right");
        return;
      }

      const balance = await getCookieBalance(user.uid);
      if (balance < COOKIE_PRICES.extraLike) {
        resetPosition();
        Alert.alert(
          "오늘 무료 좋아요를 다 썼어요 🍪",
          `하루 무료 좋아요 ${DAILY_LIKE_LIMIT}개를 다 썼어요. 좋아요를 더 보내려면 쿠키 ${COOKIE_PRICES.extraLike}개가 필요해요. (보유: ${balance}개)\n무료 좋아요는 내일 다시 채워져요.`
        );
        return;
      }

      const spent = await spendOn(user.uid, "extraLike");
      if (spent) {
        forceSwipe("right");
      } else {
        resetPosition();
      }
    } finally {
      checkingLike.current = false;
    }
  };

  const skipCurrent = () => {
    position.setValue({ x: 0, y: 0 });
    setIndex((i) => i + 1);
  };

  const handleReportBlock = () => {
    const target = candidates[index];
    if (!target || busy) return;
    showReportBlockMenu(user.uid, target, {
      onBlocked: skipCurrent,
      onReported: skipCurrent,
    });
  };

  const flashSuper = () => {
    superFlash.setValue(1);
    Animated.timing(superFlash, {
      toValue: 0,
      duration: 700,
      delay: 400,
      useNativeDriver: true,
    }).start();
  };

  const handleSuperLike = async () => {
    if (busy || !current) return;

    const { available, nextAvailableAt } = await getFreeSuperLikeStatus(user.uid);
    if (available) {
      await markFreeSuperLikeUsed(user.uid);
      flashSuper();
      forceSwipe("right", true);
      return;
    }

    const balance = await getCookieBalance(user.uid);
    if (balance < COOKIE_PRICES.superLike) {
      const hoursLeft = nextAvailableAt
        ? Math.max(1, Math.ceil((nextAvailableAt.getTime() - Date.now()) / 3600000))
        : null;
      Alert.alert(
        "슈퍼라이크를 다 썼어요 ⭐",
        hoursLeft
          ? `무료 슈퍼라이크는 ${hoursLeft}시간 후에 다시 생겨요. 지금 쓰려면 쿠키 ${COOKIE_PRICES.superLike}개가 필요해요. (보유: ${balance}개)`
          : `쿠키 ${COOKIE_PRICES.superLike}개가 필요해요. (보유: ${balance}개)`
      );
      return;
    }

    const ok = await spendOn(user.uid, "superLike");
    if (ok) {
      flashSuper();
      forceSwipe("right", true);
    }
  };

  // 부스트 버튼: 켜져 있으면 상태 안내, 꺼져 있으면 쿠키로 켜기
  const onBoostPress = async () => {
    if (boostActive) {
      Alert.alert(
        "부스트 진행 중",
        `내 주변 ${BOOST_RADIUS_KM}km 안의 사람들에게 내 프로필이 먼저 보이고 있어요.\n남은 시간: ${boostMinutesLeft(boostUntil, nowTick)}분`
      );
      return;
    }
    const price = COOKIE_PRICES.boost;
    const balance = await getCookieBalance(user.uid);
    if (balance < price) {
      Alert.alert("쿠키가 부족해요", `부스트에는 쿠키 ${price}개가 필요해요. (보유: ${balance}개)`);
      return;
    }
    Alert.alert(
      "부스트를 켤까요?",
      `${BOOST_DURATION_MIN}분 동안 내 주변 ${BOOST_RADIUS_KM}km 안의 사람들에게 내 프로필이 먼저 보여요.\n\n쿠키 ${price}개 · 보유 ${balance}개`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "켜기",
          onPress: async () => {
            try {
              const res = await activateBoost(user.uid);
              if (!res.ok) {
                Alert.alert("쿠키가 부족해요", "쿠키가 모자라서 부스트를 켜지 못했어요.");
                return;
              }
              setBoostUntil(res.until);
              setNowTick(Date.now());
            } catch (e) {
              Alert.alert("부스트 실패", e?.message || "잠시 후 다시 시도해주세요.");
            }
          },
        },
      ]
    );
  };

  const goToChat = () => {
    if (!matchInfo) return;
    const { matchId, otherUser } = matchInfo;
    setMatchInfo(null);
    navigation.navigate("Chat", { matchId, otherUser });
  };

  const keepSwiping = () => setMatchInfo(null);

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
  });

  const current = candidates[index];
  const next = candidates[index + 1];

  // 스와이프 방향에 따라 서서히 진해지는 LIKE / NOPE 도장
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* 상단 바: 왼쪽 로고, 오른쪽에 알림 아이콘 + 거리 필터 알약 */}
      <View style={styles.filterHeader}>
        <CookieLogo size={22} />
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.boostButton, boostActive && styles.boostButtonActive]}
            onPress={onBoostPress}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color={boostActive ? "#fff" : COLORS.primary} />
            {boostActive && (
              <Text style={styles.boostTime}>{boostMinutesLeft(boostUntil, nowTick)}분</Text>
            )}
          </TouchableOpacity>
          <CookieBalance variant="pill" />
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            {hasNotification && <View style={styles.notificationDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterPill}
            onPress={() => setFilterOpen((v) => !v)}
          >
            <Ionicons name="options-outline" size={15} color={COLORS.textLight} />
            <Text style={styles.filterPillText}>{maxDist}km</Text>
          </TouchableOpacity>
        </View>
      </View>
      {filterOpen && (
        <View style={styles.filterBar}>
          <Slider
            style={{ width: "100%", height: 36 }}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={maxDist}
            onValueChange={setMaxDist}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.primary}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : !current ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>보여줄 카드가 없어요</Text>
          <Text style={styles.emptySubtitle}>거리를 넓히거나 잠시 후 다시 확인해보세요</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadCandidates}>
            <Text style={styles.refreshButtonText}>새로고침</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.deck}>
            {next && (
              <View style={[styles.card, styles.cardBehind]}>
                <ProfileCard person={next} />
              </View>
            )}
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.card,
                {
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { rotate },
                  ],
                },
              ]}
            >
              <ProfileCard key={current.id} person={current} />
              <Animated.View
                pointerEvents="none"
                style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}
              >
                <CookieMark size={34} />
                <Text style={[styles.stampText, { color: COLORS.accent }]}>YUM!</Text>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}
              >
                <Text style={[styles.stampText, { color: "#6B5B4D" }]}>PASS</Text>
              </Animated.View>
              <TouchableOpacity style={styles.moreButton} onPress={handleReportBlock}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={() => forceSwipe("left")}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={36} color={COLORS.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.superLikeWrap}
              onPress={handleSuperLike}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#4FACFE", "#00C2FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.superLikeButton}
              >
                <Ionicons name="star" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.likeWrap}
              onPress={handleLikeAttempt}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.likeButton}
              >
                <Ionicons name="heart" size={38} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Animated.View
        pointerEvents="none"
        style={[styles.superFlashOverlay, { opacity: superFlash }]}
      >
        <Ionicons name="star" size={72} color="#4FACFE" />
        <Text style={styles.superFlashText}>슈퍼라이크!</Text>
      </Animated.View>

      {matchInfo && (
        <CookieMatchOverlay
          matchInfo={matchInfo}
          profile={profile}
          onChat={goToChat}
          onLater={keepSwiping}
        />
      )}
    </SafeAreaView>
  );
}

export function CookieMatchOverlay({ matchInfo, profile, onChat, onLater }) {
  const bounce = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -14, duration: 420, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 420, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // 우리만의 가미: 화면 구석에 살짝 놓인 쿠키 마크 (과하지 않게)
  const accents = [
    { top: "9%", left: "8%", size: 34, rotate: "-16deg", opacity: 0.35 },
    { top: "16%", left: "82%", size: 22, rotate: "14deg", opacity: 0.3 },
    { top: "86%", left: "84%", size: 36, rotate: "-12deg", opacity: 0.3 },
    { top: "82%", left: "6%", size: 20, rotate: "10deg", opacity: 0.3 },
  ];

  return (
    <LinearGradient
      colors={COLORS.gradientBg}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.matchOverlay}
    >
      {accents.map((c, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.confettiEmoji,
            { top: c.top, left: c.left, opacity: c.opacity, transform: [{ rotate: c.rotate }] },
          ]}
        >
          <CookieMark size={c.size} variant="white" />
        </View>
      ))}

      <Animated.Text style={[styles.cookieTitle, { transform: [{ translateY: bounce }, { rotate: "-6deg" }] }]}>
        COOKIE!
      </Animated.Text>
      <Text style={styles.matchSubtitle}>
        {matchInfo.otherUser?.name}님과 서로 좋아요를 눌렀어요
      </Text>
      {matchInfo.otherUser?._distance != null && (
        <View style={styles.matchDistanceRow}>
          <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.9)" />
          <Text style={styles.matchDistance}>
            나와 {matchInfo.otherUser._distance.toFixed(1)}km 거리
          </Text>
        </View>
      )}

      <Animated.View style={[styles.matchPhotos, { transform: [{ scale: pop }] }]}>
        <Image
          source={{ uri: profile?.photos?.[0] }}
          style={[styles.matchPhoto, styles.matchPhotoLeft]}
        />
        <Image
          source={{ uri: matchInfo.otherUser?.photos?.[0] }}
          style={[styles.matchPhoto, styles.matchPhotoRight]}
        />
        <View style={styles.matchCookieBadge}>
          <CookieMark size={40} />
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.matchChatButton} onPress={onChat} activeOpacity={0.85}>
        <Text style={styles.matchChatButtonText}>대화 시작하기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.matchLaterButton} onPress={onLater}>
        <Text style={styles.matchLaterButtonText}>나중에 할게요</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

function ProfileCard({ person }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = person.photos?.length ? person.photos : [null];

  const goPrev = () => setPhotoIndex((i) => (i > 0 ? i - 1 : i));
  const goNext = () => setPhotoIndex((i) => (i < photos.length - 1 ? i + 1 : i));

  return (
    <>
      <Image
        source={{ uri: photos[photoIndex] }}
        style={styles.photo}
        resizeMode="cover"
      />

      <View style={styles.tapZones} pointerEvents="box-none">
        <Pressable style={styles.tapZoneLeft} onPress={goPrev} />
        <Pressable style={styles.tapZoneRight} onPress={goNext} />
      </View>

      {photos.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="none">
          {photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      <FadeOverlay height={260} />
      <View style={styles.infoBox} pointerEvents="none">
        <Text style={styles.name}>
          {person.name}
          <Text style={styles.age}>  {person.age}</Text>
        </Text>
        {person._distance != null && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#fff" />
            <Text style={styles.distance}>{person._distance.toFixed(1)}km 거리</Text>
          </View>
        )}
        {(!!person.job || !!person.height) && (
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={18} color="#fff" />
            <Text style={styles.distance}>
              {[person.job, person.height ? `${person.height}cm` : null].filter(Boolean).join(" · ")}
            </Text>
          </View>
        )}
        {!!person.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {person.bio}
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  notificationButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  boostButton: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  boostButtonActive: { backgroundColor: COLORS.primary },
  boostTime: { color: "#fff", fontSize: 12, fontFamily: FONTS.bold },
  notificationDot: {
    position: "absolute",
    top: 4,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterPillText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.textLight },
  filterBar: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, marginBottom: 6, color: COLORS.text, fontFamily: FONTS.heading },
  emptySubtitle: { color: COLORS.textLight, textAlign: "center" },
  refreshButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: { color: "#fff", fontWeight: "700" },
  deck: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    position: "absolute",
    width: width - 20,
    top: 0,
    bottom: 4,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
    shadowColor: "#2B1D14",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardBehind: { transform: [{ scale: 0.95 }] },
  stamp: {
    position: "absolute",
    top: 48,
    borderWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stampLike: { left: 24, borderColor: COLORS.accent, transform: [{ rotate: "-14deg" }] },
  stampNope: { right: 24, borderColor: "#6B5B4D", transform: [{ rotate: "14deg" }] },
  stampText: { fontSize: 38, fontFamily: FONTS.logo, letterSpacing: 2 },
  moreButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(59,38,22,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreButtonText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  photo: { width: "100%", height: "100%" },
  tapZones: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  tapZoneLeft: { flex: 1 },
  tapZoneRight: { flex: 1 },
  dotsRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: { backgroundColor: "#fff" },
  infoBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  name: { color: "#fff", fontSize: 32, fontFamily: FONTS.heading },
  age: { fontSize: 28, fontFamily: FONTS.regular },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 7 },
  distance: { color: "rgba(255,255,255,0.95)", fontSize: 15, fontFamily: FONTS.bold },
  bio: { color: "rgba(255,255,255,0.92)", marginTop: 4, fontSize: 15 },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingBottom: 14,
    paddingTop: 10,
  },
  actionButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    shadowColor: "#2B1D14",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  passButton: {},
  superLikeWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#2E86DE",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  superLikeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  superFlashOverlay: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  superFlashText: {
    marginTop: 8,
    color: "#4FACFE",
    fontSize: 20,
    fontFamily: FONTS.heading,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  likeWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginTop: -4,
    shadowColor: "#E8542B",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  likeButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
  },

  matchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    overflow: "hidden",
  },
  confettiEmoji: { position: "absolute" },
  cookieTitle: {
    color: "#FFFFFF",
    fontSize: 66,
    fontFamily: FONTS.logo,
    letterSpacing: -1,
    marginBottom: 8,
    textShadowColor: "rgba(120,40,10,0.28)",
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 0,
  },
  matchSubtitle: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 6,
    textAlign: "center",
    fontFamily: FONTS.bold,
  },
  matchDistanceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  matchDistance: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  matchPhotos: {
    width: 260,
    height: 190,
    marginTop: 36,
    marginBottom: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  matchPhoto: {
    position: "absolute",
    width: 134,
    height: 178,
    borderRadius: 22,
    borderWidth: 5,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.3)",
    shadowColor: "#5A1E05",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  matchPhotoLeft: { left: 0, transform: [{ rotate: "-8deg" }] },
  matchPhotoRight: { right: 0, transform: [{ rotate: "8deg" }] },
  matchCookieBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5A1E05",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  matchChatButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingVertical: 17,
    paddingHorizontal: 54,
    shadowColor: "#5A1E05",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  matchChatButtonText: { color: COLORS.primary, fontFamily: FONTS.heading, fontSize: 18 },
  matchLaterButton: { paddingVertical: 12, marginTop: 8 },
  matchLaterButtonText: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontFamily: FONTS.bold },
});