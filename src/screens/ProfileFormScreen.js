import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import cloudinaryConfig from "../cloudinaryConfig";

const GENDERS = ["남성", "여성", "기타"];
const PHOTO_SLOTS = 3;

export default function ProfileFormScreen({ mode = "setup", navigation }) {
  const { user, profile, logout } = useAuth();
  const existing = mode === "edit" ? profile : null;

  const [name, setName] = useState(existing?.name || "");
  const [age, setAge] = useState(existing?.age ? String(existing.age) : "");
  const [gender, setGender] = useState(existing?.gender || "");
  const [bio, setBio] = useState(existing?.bio || "");
  const [photos, setPhotos] = useState(
    existing?.photos?.length
      ? [...existing.photos, ...Array(PHOTO_SLOTS - existing.photos.length).fill(null)]
      : Array(PHOTO_SLOTS).fill(null)
  );
  const [saving, setSaving] = useState(false);

  const pickPhoto = async (index) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진을 선택하려면 갤러리 접근 권한이 필요해요.");
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
    if (uri.startsWith("http")) return uri; // 이미 업로드된 사진은 그대로 재사용

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

  const onSave = async () => {
    const ageNum = Number(age);
    if (!name.trim() || !ageNum || !gender) {
      Alert.alert("입력 확인", "이름, 나이, 성별은 필수예요.");
      return;
    }
    if (ageNum < 18) {
      Alert.alert("가입 제한", "데이팅 앱은 만 18세 이상만 이용할 수 있어요.");
      return;
    }
    const chosenPhotos = photos.filter(Boolean);
    if (chosenPhotos.length === 0) {
      Alert.alert("입력 확인", "사진을 최소 1장 등록해주세요.");
      return;
    }

    setSaving(true);
    try {
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
          bio: bio.trim(),
          photos: finalPhotos,
          updatedAt: serverTimestamp(),
          ...(mode === "setup" ? { createdAt: serverTimestamp() } : {}),
        },
        { merge: true }
      );

      if (mode === "edit") {
        Alert.alert("저장됨", "프로필이 업데이트됐어요.");
      }
      // mode === "setup"이면 AuthContext가 profile 문서를 감지해서
      // 자동으로 메인 화면으로 전환됨
    } catch (e) {
      Alert.alert("저장 실패", e?.message || "다시 시도해주세요.");
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

      <Text style={styles.label}>성별</Text>
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

      <Text style={styles.label}>자기소개</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={setBio}
        placeholder="나를 소개해보세요"
        multiline
        maxLength={200}
      />

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
  genderChipActive: { backgroundColor: "#FF4B6E", borderColor: "#FF4B6E" },
  genderChipText: { color: "#555", fontWeight: "600" },
  genderChipTextActive: { color: "#fff" },
  saveButton: {
    backgroundColor: "#FF4B6E",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  logoutButton: { alignItems: "center", marginTop: 20 },
  logoutButtonText: { color: "#999" },
});
