import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import cloudinaryConfig from "../cloudinaryConfig";

const GENDERS = ["남성", "여성", "기타"];
const SEEKING = ["남성", "여성"];
const PHOTO_SLOTS = 3;

export default function ProfileFormScreen({ mode = "setup", navigation }) {
  const { user, profile, logout } = useAuth();
  const existing = mode === "edit" ? profile : null;

  const [name, setName] = useState(existing?.name || "");
  const [age, setAge] = useState(existing?.age ? String(existing.age) : "");
  const [gender, setGender] = useState(existing?.gender || "");
  const [seekingGender, setSeekingGender] = useState(existing?.seekingGender || "");
  const [bio, setBio] = useState(existing?.bio || "");
  const [photos, setPhotos] = useState(
    existing?.photos?.length
      ? [...existing.photos, ...Array(PHOTO_SLOTS - existing.photos.length).fill(null)]
      : Array(PHOTO_SLOTS).fill(null)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");   // 빨간 경고
  const [okMsg, setOkMsg] = useState("");    // 초록 알림

  const pickPhoto = async (index) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("사진을 선택하려면 갤러리 접근 권한이 필요해요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      aspect: [3, 4],
      allowsEditing: true,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = uri;
      return next;
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const uploadIfNeeded = async (uri, index) => {
    if (!uri) return null;
    if (uri.startsWith("http")) return uri;

    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: `photo_${index}.jpg`,
    });
    formData.append("upload_preset", cloudinaryConfig.uploadPreset);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    if (!data.secure_url) {
      throw new Error(data.error?.message || "사진 업로드에 실패했어요.");
    }
    return data.secure_url;
  };

  // 위치 받기 (최대 6초, 못 받아도 저장은 계속 진행 — 절대 안 멈춤)
  const getMyLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return null;
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({}),
        new Promise((resolve) => setTimeout(() => resolve(null), 6000)),
      ]);
      if (!pos) return null;
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      return null;
    }
  };

  const onSave = async () => {
    setError("");
    setOkMsg("");
    const ageNum = Number(age);

    // ▼ 필수값 하나씩 체크 → 빨간 글씨로 안내 (웹에서도 보임)
    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!ageNum) { setError("나이를 입력해주세요."); return; }
    if (!gender) { setError("성별을 선택해주세요."); return; }
    if (!seekingGender) { setError("만나고 싶은 성별을 선택해주세요."); return; }
    if (ageNum < 18) { setError("만 18세 이상만 이용할 수 있어요."); return; }
    const chosenPhotos = photos.filter(Boolean);
    if (chosenPhotos.length === 0) { setError("사진을 최소 1장 등록해주세요."); return; }

    setSaving(true);
    try {
      const location = await getMyLocation();

      const uploadedUrls = await Promise.all(
        photos.map((uri, idx) => uploadIfNeeded(uri, idx))
      );
      const finalPhotos = uploadedUrls.filter(Boolean);

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: name.trim(),
          age: ageNum,
          gender,
          seekingGender,
          bio: bio.trim(),
          photos: finalPhotos,
          ...(location ? { location } : {}),
          updatedAt: serverTimestamp(),
          ...(mode === "setup" ? { createdAt: serverTimestamp() } : {}),
        },
        { merge: true }
      );

      if (mode === "edit") {
        setOkMsg("프로필이 저장됐어요.");
      }
      // setup이면 저장되는 순간 AuthContext가 감지해서 메인으로 자동 이동
    } catch (e) {
      setError("저장 실패: " + (e?.message || "다시 시도해주세요."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {mode === "setup" ? "프로필을 만들어주세요" : "내 프로필"}
      </Text>
      <Text style={styles.subtitle}>
        사진 인증 없이 바로 시작할 수 있어요. 나를 잘 보여주는 사진과 소개를 채워보세요.
      </Text>

      <Text style={styles.label}>사진 (최소 1장)</Text>
      <View style={styles.photoRow}>
        {photos.map((uri, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.photoSlot}
            onPress={() => pickPhoto(idx)}
            onLongPress={() => uri && removePhoto(idx)}
          >
            {uri ? (
              <Image source={{ uri }} style={styles.photoImg} />
            ) : (
              <Text style={styles.photoPlus}>+</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.hint}>사진을 길게 누르면 삭제돼요</Text>

      <Text style={styles.label}>이름</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="닉네임 또는 이름" />

      <Text style={styles.label}>나이</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="예: 27"
        keyboardType="number-pad"
      />

      <Text style={styles.label}>내 성별</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genderChip, gender === g && styles.genderChipActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>만나고 싶은 성별</Text>
      <View style={styles.genderRow}>
        {SEEKING.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genderChip, seekingGender === g && styles.genderChipActive]}
            onPress={() => setSeekingGender(g)}
          >
            <Text style={[styles.genderChipText, seekingGender === g && styles.genderChipTextActive]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>자기소개</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={setBio}
        placeholder="나를 소개해보세요"
        multiline
        maxLength={200}
      />

      {/* ▼ 경고/알림 표시 ▼ */}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!okMsg && <Text style={styles.ok}>{okMsg}</Text>}

      <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>
            {mode === "setup" ? "시작하기" : "저장하기"}
          </Text>
        )}
      </TouchableOpacity>

      {mode === "edit" && (
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 60, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#888", marginBottom: 24, lineHeight: 20 },
  label: { fontWeight: "700", marginBottom: 8, marginTop: 16, fontSize: 14 },
  hint: { color: "#aaa", fontSize: 12, marginTop: 4 },
  photoRow: { flexDirection: "row", gap: 10 },
  photoSlot: {
    width: 96,
    height: 128,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: "100%", height: "100%" },
  photoPlus: { fontSize: 28, color: "#bbb" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  bioInput: { minHeight: 90, textAlignVertical: "top" },
  genderRow: { flexDirection: "row", gap: 10 },
  genderChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fafafa",
  },
  genderChipActive: { backgroundColor: "#111111", borderColor: "#111111" },
  genderChipText: { color: "#555", fontWeight: "600" },
  genderChipTextActive: { color: "#fff" },
  error: { color: "#d33", marginTop: 16, fontSize: 14, textAlign: "center" },
  ok: { color: "#1a8f3c", marginTop: 16, fontSize: 14, textAlign: "center" },
  saveButton: {
    backgroundColor: "#111111",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  logoutButton: { alignItems: "center", marginTop: 20 },
  logoutButtonText: { color: "#999" },
});