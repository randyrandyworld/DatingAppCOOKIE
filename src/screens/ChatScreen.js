import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FlatList,
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

export default function ChatScreen({ route, navigation }) {
  const { matchId, otherUser } = route.params;
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: otherUser?.name || "채팅",
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

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await addDoc(collection(db, "matches", matchId, "messages"), {
      senderId: user.uid,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "matches", matchId), {
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerButton: { paddingHorizontal: 12, paddingVertical: 6 },
  headerButtonText: { fontSize: 22, fontWeight: "800", color: "#333" },
  list: { padding: 16 },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: "#FF4B6E", borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "#f0f0f0", borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextTheirs: { color: "#222" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: "#fafafa",
  },
  sendButton: {
    backgroundColor: "#FF4B6E",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendButtonText: { color: "#fff", fontWeight: "700" },
});
