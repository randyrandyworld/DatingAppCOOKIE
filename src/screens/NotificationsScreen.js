import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getNotificationFeed } from "../utils/notificationsFeed";
import { COLORS, FONTS } from "../theme";

function timeAgo(date) {
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const feed = await getNotificationFeed(user.uid);
      setItems(feed);
    } finally {
      setLoading(false);
    }
  };

  const onPressItem = (item) => {
    if (item.type === "match") {
      navigation.navigate("Chat", { matchId: item.matchId, otherUser: item.otherUser });
    } else {
      navigation.navigate("Main", { screen: "LikesYou" });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>아직 알림이 없어요</Text>
        <Text style={styles.emptySubtitle}>좋아요나 매칭이 생기면 여기서 알려줄게요</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const iconName =
          item.type === "match" ? "heart" : item.type === "superlike" ? "star" : "heart-outline";
        const iconColor =
          item.type === "match" ? COLORS.primary : item.type === "superlike" ? "#4FACFE" : COLORS.accent;
        const text =
          item.type === "match"
            ? `${item.otherUser?.name || "상대"}님과 매칭됐어요`
            : item.type === "superlike"
            ? `${item.otherUser?.name || "누군가"}님이 슈퍼라이크를 보냈어요`
            : `${item.otherUser?.name || "누군가"}님이 좋아요를 눌렀어요`;

        return (
          <TouchableOpacity style={styles.row} onPress={() => onPressItem(item)}>
            <View>
              <Image source={{ uri: item.otherUser?.photos?.[0] }} style={styles.avatar} />
              <View style={[styles.iconBadge, { backgroundColor: iconColor }]}>
                <Ionicons name={iconName} size={11} color="#fff" />
              </View>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{text}</Text>
              <Text style={styles.rowTime}>{timeAgo(item.at)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        );
      }}
    />
  );
}

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
  list: { backgroundColor: COLORS.bg, paddingVertical: 8, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
  },
  iconBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, color: COLORS.text, fontFamily: FONTS.bold },
  rowTime: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
});