// 관리자(개발자) 전용 화면 — 계정을 새로 만들지 않고도 화면/기능을 확인하기 위한 도구 모음.
// MainTabs에서 adminConfig.js의 ADMIN_UIDS에 든 계정에게만 탭이 보여요.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { isAdminUid } from "../adminConfig";
import { COLORS, FONTS } from "../theme";
import { CookieMatchOverlay } from "./DiscoverScreen";
import {
  clearDummyData,
  DUMMY_COUNT,
  dummyPhoto,
  isDummyId,
  seedDummyUsers,
  sendDummyReply,
} from "../utils/dummyUsers";

export default function AdminScreen() {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dummyMatches, setDummyMatches] = useState([]);

  // 더미 유저와 매칭된 목록 (채팅 답장 버튼용)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "matches"), where("users", "array-contains", user.uid));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const rows = await Promise.all(
          snap.docs
            .filter((d) => (d.data().users || []).some(isDummyId))
            .map(async (d) => {
              const data = d.data();
              const dummyId = data.users.find(isDummyId);
              const s = await getDoc(doc(db, "users", dummyId));
              return {
                matchId: d.id,
                dummyId,
                name: s.exists() ? s.data().name : dummyId,
                lastMessage: data.lastMessage || "",
              };
            })
        );
        rows.sort((a, b) => a.dummyId.localeCompare(b.dummyId));
        setDummyMatches(rows);
      },
      () => {}
    );
    return unsub;
  }, [user?.uid]);

  if (!isAdminUid(user?.uid)) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>관리자 계정이 아니에요.</Text>
      </View>
    );
  }

  // 작업 실행 + 실패 시 이유 안내 (대부분 Firestore 규칙 미게시)
  const run = async (label, fn) => {
    if (busy) return;
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      const hint =
        e?.code === "permission-denied"
          ? "Firestore 규칙에 관리자 권한이 아직 없는 것 같아요. 규칙을 게시했는지, 규칙 속 UID가 내 UID와 같은지 확인해주세요.\n\n"
          : "";
      Alert.alert("실패", hint + (e?.message || String(e)));
    } finally {
      setBusy("");
    }
  };

  const onSeed = () =>
    run("seed", async () => {
      await seedDummyUsers({ myUid: user.uid, myProfile: profile });
      setNote(
        `더미 ${DUMMY_COUNT}명을 준비했어요. 홈 탭에서 카드를 확인하세요 — 앞의 3명(소개글에 💘 표시)은 이미 나를 좋아요 한 상태라 오른쪽으로 넘기면 바로 매칭돼요.`
      );
    });

  const onClear = () =>
    Alert.alert("더미 데이터 삭제", "더미 유저와 그와 관련된 내 스와이프·매칭·채팅을 모두 지워요. 진행할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () =>
          run("clear", async () => {
            const n = await clearDummyData({ myUid: user.uid });
            setNote(`더미 ${n}명과 관련 데이터를 삭제했어요.`);
          }),
      },
    ]);

  const onReply = (row, delayMs) => {
    const send = () => sendDummyReply({ myUid: user.uid, dummyId: row.dummyId });
    if (delayMs > 0) {
      setNote(`${row.name}의 답장이 ${delayMs / 1000}초 뒤에 도착해요. 채팅방이나 다른 탭에서 기다려보세요.`);
      setTimeout(() => send().catch(() => {}), delayMs);
    } else {
      run("reply", async () => {
        const msg = await send();
        setNote(`${row.name}: "${msg}" 를 보냈어요.`);
      });
    }
  };

  const previewMatch = {
    matchId: "preview",
    otherUser: { name: "지우 (더미)", photos: [dummyPhoto(0, 0)], _distance: 3.2 },
  };
  const closePreview = () => setPreviewOpen(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>관리자 모드 🛠</Text>
      <Text style={styles.muted}>
        테스트용 도구예요. 더미 유저는 관리자 계정에게만 보이고, 진짜 사용자에게는 노출되지 않아요.
      </Text>
      <Text style={styles.uid} selectable>
        내 UID: {user.uid}
      </Text>

      {!!busy && (
        <View style={styles.busyRow}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.muted}> 처리 중...</Text>
        </View>
      )}
      {!!note && <Text style={styles.note}>{note}</Text>}

      <Section title="화면 미리보기" desc="서버 없이 가짜 데이터로 바로 띄워봐요.">
        <Btn label="🍪 매칭 연출 (COOKIE!) 보기" onPress={() => setPreviewOpen(true)} />
      </Section>

      <Section
        title="더미 유저"
        desc={`가짜 프로필 ${DUMMY_COUNT}명을 만들어요. 다시 누르면 나와의 스와이프·매칭·채팅이 처음 상태로 초기화돼요.`}
      >
        <Btn label={`더미 유저 ${DUMMY_COUNT}명 만들기 / 초기화`} onPress={onSeed} disabled={!!busy} />
        <Btn label="더미 데이터 전부 삭제" kind="danger" onPress={onClear} disabled={!!busy} />
      </Section>

      <Section
        title="더미 채팅 답장"
        desc="더미와 매칭된 뒤, 더미가 나에게 메시지를 보낸 것처럼 만들어요 (읽음 처리·안읽음 뱃지 테스트)."
      >
        {dummyMatches.length === 0 ? (
          <Text style={styles.muted}>아직 더미와 매칭된 게 없어요. 홈에서 💘 더미를 오른쪽으로 넘겨보세요.</Text>
        ) : (
          dummyMatches.map((row) => (
            <View key={row.matchId} style={styles.replyRow}>
              <Text style={styles.replyName}>{row.name}</Text>
              {!!row.lastMessage && (
                <Text style={styles.muted} numberOfLines={1}>
                  마지막 메시지: {row.lastMessage}
                </Text>
              )}
              <View style={styles.btnRow}>
                <Btn small label="바로 답장" onPress={() => onReply(row, 0)} disabled={!!busy} />
                <Btn small kind="outline" label="5초 뒤 답장" onPress={() => onReply(row, 5000)} />
              </View>
            </View>
          ))
        )}
      </Section>

      <Modal visible={previewOpen} animationType="fade" onRequestClose={closePreview}>
        <View style={{ flex: 1 }}>
          <CookieMatchOverlay
            matchInfo={previewMatch}
            profile={profile}
            onChat={() => {
              closePreview();
              Alert.alert("미리보기", "미리보기에서는 채팅방으로 이동하지 않아요.");
            }}
            onLater={closePreview}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

function Section({ title, desc, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!desc && <Text style={styles.sectionDesc}>{desc}</Text>}
      <View style={{ gap: 10, marginTop: 12 }}>{children}</View>
    </View>
  );
}

function Btn({ label, onPress, kind = "primary", disabled, small }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        small && styles.btnSmall,
        kind === "danger" && styles.btnDanger,
        kind === "outline" && styles.btnOutline,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.btnText, kind === "outline" && { color: COLORS.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  title: { fontSize: 22, color: COLORS.text, fontFamily: FONTS.heading, marginBottom: 6 },
  muted: { color: COLORS.textLight, fontSize: 13, lineHeight: 19 },
  uid: { color: COLORS.textLight, fontSize: 11, marginTop: 8 },
  busyRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  note: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 16, color: COLORS.text, fontFamily: FONTS.heading },
  sectionDesc: { marginTop: 4, color: COLORS.textLight, fontSize: 12, lineHeight: 18 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnSmall: { flex: 1, paddingVertical: 10 },
  btnDanger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  btnOutline: { backgroundColor: "transparent" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  replyRow: { paddingTop: 4, paddingBottom: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  replyName: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginTop: 8, marginBottom: 2 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 8 },
});
