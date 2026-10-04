import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { showReportBlockMenu } from "../utils/blocking";
import { sendPushNotificationToUser } from "../utils/notifications";
import { markMatchAsRead } from "../utils/unread";
import { COLORS } from "../theme";

export default function ChatScreen({ route, navigation }) {
  const { matchId, otherUser } = route.params;
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [closed, setClosed] = useState(false); // 차단/매칭 끊김 상태면 더 이상 메시지를 보낼 수 없음
  const listRef = useRef(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          style={styles.headerTitleRow}
          onPress={() => navigation.navigate("UserProfile", { otherUser })}
        >
          <Image source={{ uri: otherUser?.photos?.[0] }} style={styles.headerAvatar} />
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUser?.name || "채팅"}
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={onReportBlock} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>⋯</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, otherUser]);

  const onReportBlock = () => {
    if (!otherUser) return;
    showReportBlockMenu(user.uid, otherUser, {
      allowUnmatch: true,
      onUnmatched: () => navigation.goBack(),
      onBlocked: () => navigation.goBack(),
      onReported: () => navigation.goBack(),
    });
  };

  useEffect(() => {
    const q = query(
      collection(db, "matches", matchId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [matchId]);

  // 매칭 문서를 구독해서 상대/내가 매칭을 끊거나 차단하면 입력창을 막는다
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "matches", matchId), (snap) => {
      const d = snap.data() || {};
      setClosed(!!(d.blockedBy || []).length || !!(d.unmatchedBy || []).length);
    });
    return unsub;
  }, [matchId]);

  // 채팅방에 들어오면 "읽음" 처리 — 매칭 탭 빨간 뱃지가 사라짐
  useEffect(() => {
    if (matchId && user?.uid) {
      markMatchAsRead(matchId, user.uid);
    }
  }, [matchId, user?.uid, messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || closed) return;
    setText("");
    await addDoc(collection(db, "matches", matchId, "messages"), {
      senderId: user.uid,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "matches", matchId), {
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
      lastSenderId: user.uid,
    });

    if (otherUser?.id) {
      sendPushNotificationToUser(otherUser.id, {
        title: profile?.name || "새 메시지",
        body: trimmed,
        data: { type: "message", matchId, otherUser: { id: user.uid, name: profile?.name } },
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: COLORS.bg }}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === user.uid;
          return (
            <View
              style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
            >
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                  {item.text}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {closed ? (
        <View style={styles.closedBar}>
          <Text style={styles.closedText}>매칭이 종료된 대화예요. 더 이상 메시지를 보낼 수 없어요.</Text>
        </View>
      ) : (
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="메시지를 입력하세요"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={send}>
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerButton: { paddingHorizontal: 12, paddingVertical: 6 },
  headerButtonText: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.border },
  headerName: { fontSize: 16, fontWeight: "700", maxWidth: 160, color: COLORS.text },
  list: { padding: 16 },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextTheirs: { color: COLORS.text },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
    backgroundColor: COLORS.card,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendButtonText: { color: "#fff", fontWeight: "700" },
  closedBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
  },
  closedText: { color: COLORS.textLight },
});