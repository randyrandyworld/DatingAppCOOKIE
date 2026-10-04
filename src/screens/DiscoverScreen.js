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
import CookieLogo from "../components/CookieLogo";
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

  // 매칭 연출용 상태
  const [matchInfo, setMatchInfo] = useState(null); // { matchId, otherUser } or null

  const position = useRef(new Animated.ValueXY()).current;

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
    return rawList
      .map((u) => {
        let d = null;
        if (myLoc && u.location) {
          d = distanceKm(myLoc.lat, myLoc.lng, u.location.lat, u.location.lng);
        }
        return { ...u, _distance: d };
      })
      .filter((u) => u._distance == null || u._distance <= maxDist);
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
            forceSwipe("right");
          } else if (g.dx < -SWIPE_THRESHOLD) {
            forceSwipe("left");
          } else {
            resetPosition();
          }
        },
      }),
    [candidates, index, busy]
  );

  const forceSwipe = (direction) => {
    if (busy) return;
    Animated.timing(position, {
      toValue: { x: direction === "right" ? width * 1.5 : -width * 1.5, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const onSwipeComplete = async (direction) => {
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
        profile?.name
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
      {/* 거리 필터 — 평소엔 작은 알약 버튼 하나만, 누르면 슬라이더가 펼쳐짐 (화면 위쪽을 너무 차지하지 않도록) */}
      <View style={styles.filterHeader}>
        <CookieLogo size={26} />
        <TouchableOpacity
          style={styles.filterPill}
          onPress={() => setFilterOpen((v) => !v)}
        >
          <Ionicons name="options-outline" size={15} color={COLORS.textLight} />
          <Text style={styles.filterPillText}>{maxDist}km</Text>
        </TouchableOpacity>
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
                <Text style={[styles.stampText, { color: COLORS.accent }]}>LIKE</Text>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}
              >
                <Text style={[styles.stampText, { color: "#6B5B4D" }]}>NOPE</Text>
              </Animated.View>
              <TouchableOpacity style={styles.moreButton} onPress={handleReportBlock}>
                <Text style={styles.moreButtonText}>⋯</Text>
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
              style={styles.likeWrap}
              onPress={() => forceSwipe("right")}
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

  // 처음 만들었던 느낌 그대로, 화면 곳곳에 흩뿌려진 쿠키 컨페티
  const confettiPositions = [
    { top: "7%", left: "10%", size: 40, rotate: "-15deg", opacity: 0.9 },
    { top: "12%", left: "76%", size: 28, rotate: "18deg", opacity: 0.55 },
    { top: "24%", left: "40%", size: 18, rotate: "5deg", opacity: 0.45 },
    { top: "20%", left: "62%", size: 22, rotate: "-8deg", opacity: 0.7 },
    { top: "76%", left: "12%", size: 30, rotate: "12deg", opacity: 0.6 },
    { top: "84%", left: "70%", size: 38, rotate: "-10deg", opacity: 0.9 },
    { top: "68%", left: "84%", size: 20, rotate: "6deg", opacity: 0.5 },
    { top: "90%", left: "40%", size: 18, rotate: "-20deg", opacity: 0.45 },
  ];

  return (
    <LinearGradient
      colors={COLORS.gradientBg}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.matchOverlay}
    >
      {confettiPositions.map((c, i) => (
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

      <Animated.Text style={[styles.cookieTitle, { transform: [{ translateY: bounce }] }]}>
        COOKIE!
      </Animated.Text>
      <Text style={styles.matchSubtitle}>
        {matchInfo.otherUser?.name}님과 서로 좋아요를 눌렀어요
      </Text>
      {matchInfo.otherUser?._distance != null && (
        <Text style={styles.matchDistance}>
          나와 {matchInfo.otherUser._distance.toFixed(1)}km 거리
        </Text>
      )}

      <Animated.View style={[styles.matchPhotos, { transform: [{ scale: pop }] }]}>
        <Image source={{ uri: profile?.photos?.[0] }} style={styles.matchPhoto} />
        <View style={styles.matchCookieBadge}>
          <CookieMark size={34} />
        </View>
        <Image source={{ uri: matchInfo.otherUser?.photos?.[0] }} style={styles.matchPhoto} />
      </Animated.View>

      <TouchableOpacity style={styles.matchChatButton} onPress={onChat}>
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
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 12,
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
    gap: 36,
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
    fontSize: 58,
    fontFamily: FONTS.logo,
    letterSpacing: -1,
    marginBottom: 8,
    textShadowColor: "rgba(120,40,10,0.35)",
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 0,
  },
  matchSubtitle: {
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 6,
    textAlign: "center",
    fontWeight: "600",
  },
  matchDistance: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 20,
  },
  matchPhotos: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  matchPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  matchCookieBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -16,
    zIndex: 1,
  },
  matchCookieText: { fontSize: 22 },
  matchChatButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 30,
    paddingVertical: 17,
    paddingHorizontal: 46,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  matchChatButtonText: { color: COLORS.accent, fontFamily: FONTS.heading, fontSize: 17 },
  matchLaterButton: { paddingVertical: 8 },
  matchLaterButtonText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
});
