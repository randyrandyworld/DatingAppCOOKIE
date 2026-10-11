import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getLikesYouList } from "../utils/likesYou";
import { spendOn, getCookieBalance, COOKIE_PRICES } from "../utils/cookies";
import { recordSwipeAndCheckMatch } from "../utils/matching";
import { COLORS, FONTS } from "../theme";

export default function LikesYouScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [unlocked, setUnlocked] = useState({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getLikesYouList(user.uid);
      setPeople(list);
    } finally {
      setLoading(false);
    }
  };

  const unlock = async (person) => {
    const balance = await getCookieBalance(user.uid);
    if (balance < COOKIE_PRICES.seeWhoLikedMe) {
      Alert.alert(
        "쿠키가 부족해요 🍪",
        `열람하려면 쿠키 ${COOKIE_PRICES.seeWhoLikedMe}개가 필요해요. (보유: ${balance}개)`
      );
      return;
    }
    const ok = await spendOn(user.uid, "seeWhoLikedMe");
    if (ok) setUnlocked((prev) => ({ ...prev, [person.id]: true }));
  };

  const matchBack = async (person) => {
    try {
      const matchId = await recordSwipeAndCheckMatch(user.uid, person.id, true, profile?.name);
      setPeople((prev) => prev.filter((p) => p.id !== person.id));
      if (matchId) {
        Alert.alert("🍪 매칭됐어요!", `${person.name}님과 매칭됐어요`, [
          { text: "나중에", style: "cancel" },
          { text: "대화하기", onPress: () => navigation.navigate("Chat", { matchId, otherUser: person }) },
        ]);
      }
    } catch (e) {
      Alert.alert("오류", e?.message || "다시 시도해주세요.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (people.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>아직 날 좋아요한 사람이 없어요</Text>
        <Text style={styles.emptySubtitle}>매력적인 프로필을 꾸며보는 건 어때요?</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={people}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => {
        const isUnlocked = unlocked[item.id];
        return (
          <View style={styles.card}>
            {item._isSuper && (
              <View style={styles.superBadge}>
                <Ionicons name="star" size={12} color="#fff" />
              </View>
            )}

            <Image source={{ uri: item.photos?.[0] }} style={styles.photo} />
            {!isUnlocked && (
              <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
            )}

            <View style={styles.nameTag}>
              <Text style={styles.nameTagText}>
                {item.name}, {item.age}
              </Text>
            </View>

            {!isUnlocked ? (
              <TouchableOpacity style={styles.unlockButton} onPress={() => unlock(item)}>
                <Ionicons name="lock-closed" size={14} color="#fff" />
                <Text style={styles.unlockButtonText}>
                  {COOKIE_PRICES.seeWhoLikedMe}개로 보기
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.matchButton} onPress={() => matchBack(item)}>
                <Ionicons name="heart" size={14} color="#fff" />
                <Text style={styles.matchButtonText}>매칭하기</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}

const CARD_GAP = 12;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: COLORS.bg,
  },
  emptyTitle: { fontSize: 18, marginBottom: 6, color: COLORS.text, fontFamily: FONTS.heading },
  emptySubtitle: { color: COLORS.textLight, textAlign: "center" },
  list: { padding: CARD_GAP, backgroundColor: COLORS.bg },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    flex: 1,
    aspectRatio: 0.75,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  photo: { width: "100%", height: "100%" },
  superBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#4FACFE",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  nameTag: {
    position: "absolute",
    bottom: 44,
    left: 10,
    right: 10,
  },
  nameTagText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: FONTS.bold,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  unlockButton: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(43,29,20,0.75)",
    borderRadius: 14,
    paddingVertical: 8,
  },
  unlockButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  matchButton: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 8,
  },
  matchButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});