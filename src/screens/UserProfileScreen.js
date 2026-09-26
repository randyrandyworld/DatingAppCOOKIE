import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme";

export default function UserProfileScreen({ route }) {
  const { otherUser } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: otherUser?.photos?.[0] }} style={styles.photo} />

      <View style={styles.infoSection}>
        <Text style={styles.name}>
          {otherUser?.name}
          {otherUser?.age ? `, ${otherUser.age}` : ""}
        </Text>

        <View style={styles.metaRow}>
          {otherUser?.height ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>📏 {otherUser.height}cm</Text>
            </View>
          ) : null}
          {otherUser?._distance != null ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>📍 {otherUser._distance.toFixed(1)}km</Text>
            </View>
          ) : null}
        </View>

        {!!otherUser?.job && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>직업</Text>
            <Text style={styles.sectionText}>💼 {otherUser.job}</Text>
          </View>
        )}

        {!!otherUser?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>자기소개</Text>
            <Text style={styles.sectionText}>{otherUser.bio}</Text>
          </View>
        )}

        {otherUser?.photos?.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>사진 더보기</Text>
            <View style={styles.morePhotosRow}>
              {otherUser.photos.slice(1).map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.smallPhoto} />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 60 },
  photo: { width: "100%", height: 420, backgroundColor: COLORS.border },
  infoSection: { padding: 24 },
  name: { fontSize: 26, fontWeight: "800", marginBottom: 12, color: COLORS.text },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  metaChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  metaChipText: { fontSize: 13, fontWeight: "700", color: COLORS.primaryDark },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textLight,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  morePhotosRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallPhoto: { width: 90, height: 120, borderRadius: 10, backgroundColor: COLORS.border },
});