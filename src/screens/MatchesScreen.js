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
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function MatchesScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    // orderBy를 Firestore 쿼리에 같이 넣으면 복합 색인(composite index)이 필요해서
    // 색인이 없으면 onSnapshot이 조용히 실패해(매칭이 생겨도 목록엔 안 뜸) 클라이언트에서 정렬해요.
    const q = query(
      collection(db, "matches"),
      where("users", "array-contains", user.uid)
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const rows = await Promise.all(
          snap.docs
            .filter((d) => !(d.data().blockedBy || []).length) // 나 또는 상대가 차단했으면 목록에서 숨김
            .map(async (d) => {
              const data = d.data();
              const otherUid = data.users.find((u) => u !== user.uid);
              const otherSnap = await getDoc(doc(db, "users", otherUid));
              return {
                id: d.id,
                otherUser: otherSnap.exists()
                  ? { id: otherSnap.id, ...otherSnap.data() }
                  : { id: otherUid, name: "알 수 없음" },
                lastMessage: data.lastMessage,
                lastMessageAt: data.lastMessageAt?.toMillis?.() ?? 0,
              };
            })
        );
        rows.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        setMatches(rows);
        setLoading(false);
      },
      (e) => {
        console.error("매칭 목록 불러오기 실패:", e);
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>아직 매칭이 없어요</Text>
        <Text style={styles.emptySubtitle}>홈 화면에서 좋아요를 눌러보세요</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            navigation.navigate("Chat", {
              matchId: item.id,
              otherUser: item.otherUser,
            })
          }
        >
          <Image
            source={{ uri: item.otherUser.photos?.[0] }}
            style={styles.avatar}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowName}>{item.otherUser.name}</Text>
            <Text style={styles.rowMessage} numberOfLines={1}>
              {item.lastMessage || "매칭됐어요! 인사를 건네보세요"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { color: "#888" },
  list: { padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eee",
    marginRight: 14,
  },
  rowText: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "700" },
  rowMessage: { color: "#888", marginTop: 2 },
});
