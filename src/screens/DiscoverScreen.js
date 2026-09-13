import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { recordSwipeAndCheckMatch } from "../utils/matching";
import { getBlockedIds, showReportBlockMenu } from "../utils/blocking";
import { distanceKm } from "../utils/distance";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.28;

export default function DiscoverScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rawList, setRawList] = useState([]); // 필터 전 원본
  const [maxDist, setMaxDist] = useState(50); // 거리 설정 (기본 50km)
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

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
        // ▼ 만나고 싶은 성별 필터 (내 seekingGender와 상대 gender가 같은 사람만)
        .filter((u) => !profile?.seekingGender || u.gender === profile.seekingGender);

      setRawList(list);
      setIndex(0);
    } catch (e) {
      Alert.alert("불러오기 실패", e?.message || "다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // ▼ 거리 필터 + 각 카드에 거리(_distance) 붙이기
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
      // 거리를 모르면(둘 중 하나라도 위치 없음) 일단 보여주고,
      // 알면 설정한 maxDist 이내만 보여줌
      .filter((u) => u._distance == null || u._distance <= maxDist);
  }, [rawList, maxDist, profile?.location]);

  // 거리 슬라이더 움직이면 카드 처음부터 다시
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
        Alert.alert("매칭 성공! 🎉", `${target.name}님과 매칭됐어요!`, [
          { text: "나중에", style: "cancel" },
          {
            text: "채팅하기",
            onPress: () =>
              navigation.navigate("Chat", { matchId, otherUser: target }),
          },
        ]);
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

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
  });

  const current = candidates[index];
  const next = candidates[index + 1];

  return (
    <View style={styles.container}>
      {/* 거리 설정 슬라이더 */}
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>거리 {maxDist}km 이내</Text>
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={1}
          maximumValue={100}
          step={1}
          value={maxDist}
          onValueChange={setMaxDist}
          minimumTrackTintColor="#FF4B6E"
          maximumTrackTintColor="#eee"
          thumbTintColor="#FF4B6E"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF4B6E" />
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
              <ProfileCard person={current} />
              <TouchableOpacity style={styles.moreButton} onPress={handleReportBlock}>
                <Text style={styles.moreButtonText}>⋯</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={() => forceSwipe("left")}
            >
              <Text style={styles.actionIcon}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => forceSwipe("right")}
            >
              <Text style={[styles.actionIcon, styles.likeIcon]}>♥</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function ProfileCard({ person }) {
  return (
    <>
      <Image
        source={{ uri: person.photos?.[0] }}
        style={styles.photo}
        resizeMode="cover"
      />
      <View style={styles.infoBox}>
        <Text style={styles.name}>
          {person.name}, {person.age}
        </Text>
        {person._distance != null && (
          <Text style={styles.distance}>📍 {person._distance.toFixed(1)}km 거리</Text>
        )}
        {!!person.bio && <Text style={styles.bio}>{person.bio}</Text>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  filterBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterLabel: { fontWeight: "700", fontSize: 14, color: "#333" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { color: "#888", textAlign: "center" },
  refreshButton: {
    marginTop: 24,
    backgroundColor: "#FF4B6E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: { color: "#fff", fontWeight: "700" },
  deck: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    position: "absolute",
    width: width * 0.88,
    height: "78%",
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardBehind: { top: 10, transform: [{ scale: 0.96 }] },
  moreButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreButtonText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  photo: { width: "100%", height: "100%" },
  infoBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  name: { color: "#fff", fontSize: 22, fontWeight: "800" },
  distance: { color: "#fff", marginTop: 2, fontSize: 13, fontWeight: "600" },
  bio: { color: "#fff", marginTop: 4, fontSize: 14 },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
    paddingBottom: 28,
    paddingTop: 8,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  passButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" },
  likeButton: { backgroundColor: "#FF4B6E" },
  actionIcon: { fontSize: 26, color: "#555" },
  likeIcon: { color: "#fff" },
});