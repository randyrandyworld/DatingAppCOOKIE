import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FadeOverlay from "../components/FadeOverlay";
import { calcKoreanAge } from "../utils/matching";
import { COLORS, FONTS } from "../theme";

const { width } = Dimensions.get("window");

export default function UserProfileScreen({ route }) {
  const { otherUser } = route.params;
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = otherUser?.photos?.length ? otherUser.photos : [null];
  const displayAge = otherUser?.birthDate ? calcKoreanAge(otherUser.birthDate) : otherUser?.age;

  const goPrev = () => setPhotoIndex((i) => (i > 0 ? i - 1 : i));
  const goNext = () => setPhotoIndex((i) => (i < photos.length - 1 ? i + 1 : i));

  const metaItems = [
    otherUser?._distance != null
      ? { icon: "location-outline", text: `${otherUser._distance.toFixed(1)}km` }
      : null,
    otherUser?.region ? { icon: "navigate-outline", text: otherUser.region } : null,
    otherUser?.height ? { icon: "resize-outline", text: `${otherUser.height}cm` } : null,
    otherUser?.religion ? { icon: "sparkles-outline", text: otherUser.religion } : null,
    otherUser?.drinking ? { icon: "wine-outline", text: otherUser.drinking } : null,
    otherUser?.smoking ? { icon: "cloud-outline", text: otherUser.smoking } : null,
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
      <View style={styles.photoWrap}>
        <Image source={{ uri: photos[photoIndex] }} style={styles.photo} resizeMode="cover" />

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

        <FadeOverlay height={160} />
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>
          {otherUser?.name}
          <Text style={styles.age}>  {displayAge}</Text>
        </Text>

        {metaItems.length > 0 && (
          <View style={styles.metaRow}>
            {metaItems.map((m, i) => (
              <View key={i} style={styles.metaChip}>
                <Ionicons name={m.icon} size={14} color={COLORS.primary} />
                <Text style={styles.metaChipText}>{m.text}</Text>
              </View>
            ))}
          </View>
        )}

        {!!otherUser?.job && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>직업</Text>
            <View style={styles.jobRow}>
              <Ionicons name="briefcase-outline" size={17} color={COLORS.primary} />
              <Text style={styles.sectionText}>{otherUser.job}</Text>
            </View>
          </View>
        )}

        {!!otherUser?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>자기소개</Text>
            <Text style={styles.sectionText}>{otherUser.bio}</Text>
          </View>
        )}

        {otherUser?.interests?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>취미·관심사</Text>
            <View style={styles.interestRow}>
              {otherUser.interests.map((tag) => (
                <View key={tag} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{tag}</Text>
                </View>
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
  photoWrap: {
    width: "100%",
    height: width * 1.2,
    backgroundColor: COLORS.border,
  },
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
    top: 14,
    left: 14,
    right: 14,
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
  card: {
    marginTop: -28,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 10,
  },
  name: { fontSize: 28, fontFamily: FONTS.heading, color: COLORS.text },
  age: { fontSize: 24, fontFamily: FONTS.regular, color: COLORS.textLight },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  metaChipText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primaryDark },
  section: { marginTop: 22 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.textLight,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  jobRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionText: { fontSize: 15, color: COLORS.text, lineHeight: 22, fontFamily: FONTS.regular },
  interestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  interestChipText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primaryDark },
});