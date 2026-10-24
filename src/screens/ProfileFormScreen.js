import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { File, UploadTask, UploadType } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import cloudinaryConfig from "../cloudinaryConfig";
import { calcKoreanAge } from "../utils/matching";
import { COLORS, FONTS } from "../theme";
import CookieBalance from "../components/CookieBalance";
import { showActionSheet } from "../components/ActionSheetHost";

const GENDERS = ["남성", "여성"];
const SEEKING = ["남성", "여성"];
const PHOTO_SLOTS = 3;

const REGIONS = ["서울", "경기·인천", "강원", "충청", "전라", "경상", "제주"];
const RELIGIONS = ["무교", "기독교", "천주교", "불교", "기타", "비공개"];
const DRINKING_OPTIONS = [
  "자주 마셔요",
  "가끔 마셔요",
  "특별한 날에만",
  "거의 안 마셔요",
  "안 마셔요",
  "비공개",
];
const SMOKING_OPTIONS = [
  "안 피워요",
  "술자리에서만",
  "액상형 전자담배",
  "궐련형 전자담배",
  "연초",
  "비공개",
];
const INTERESTS = [
  "운동/헬스",
  "러닝/등산",
  "영화/드라마",
  "음악",
  "독서",
  "요리/맛집",
  "여행",
  "게임",
  "사진",
  "반려동물",
  "카페/디저트",
  "와인/술",
  "패션/뷰티",
  "미술/전시",
  "공연/페스티벌",
  "캠핑/아웃도어",
];

function isValidDate(y, m, d) {
  if (!y || !m || !d) return false;
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d < 1 || d > daysInMonth) return false;
  if (y < 1920 || y > new Date().getFullYear()) return false;
  return true;
}

export default function ProfileFormScreen({ mode = "setup", navigation }) {
  const { user, profile, logout, deleteAccount } = useAuth();
  const existing = mode === "edit" ? profile : null;
  const birthLocked = !!existing?.birthDate;
  const heightLocked = !!existing?.height;
  const genderLocked = !!existing?.gender;

  const [existingY, existingM, existingD] = existing?.birthDate
    ? existing.birthDate.split("-")
    : ["", "", ""];

  const [name, setName] = useState(existing?.name || "");
  const [birthYear, setBirthYear] = useState(existingY ? String(Number(existingY)) : "");
  const [birthMonth, setBirthMonth] = useState(existingM ? String(Number(existingM)) : "");
  const [birthDay, setBirthDay] = useState(existingD ? String(Number(existingD)) : "");
  const [gender, setGender] = useState(existing?.gender || "");
  const [seekingGender, setSeekingGender] = useState(existing?.seekingGender || "");
  const [height, setHeight] = useState(existing?.height ? String(existing.height) : "");
  const [job, setJob] = useState(existing?.job || "");
  const [bio, setBio] = useState(existing?.bio || "");
  const [region, setRegion] = useState(existing?.region || "");
  const [religion, setReligion] = useState(existing?.religion || "");
  const [drinking, setDrinking] = useState(existing?.drinking || "");
  const [smoking, setSmoking] = useState(existing?.smoking || "");
  const [interests, setInterests] = useState(existing?.interests || []);
  const [photos, setPhotos] = useState(
    existing?.photos?.length
      ? [...existing.photos, ...Array(PHOTO_SLOTS - existing.photos.length).fill(null)]
      : Array(PHOTO_SLOTS).fill(null)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // 회원 탈퇴 — 비밀번호 재확인 모달
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openDeleteConfirm = () => {
    showActionSheet({
      title: "정말 탈퇴하시겠어요?",
      message: "내 프로필이 삭제되고 되돌릴 수 없어요.",
      buttons: [
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: () => {
            setDeleteError("");
            setDeletePassword("");
            setDeleteModalOpen(true);
          },
        },
        { text: "취소", style: "cancel" },
      ],
    });
  };

  const onConfirmDelete = async () => {
    if (!deletePassword) {
      setDeleteError("비밀번호를 입력해주세요.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePassword);
      // 성공하면 로그인 상태가 바뀌면서 자동으로 로그인 화면으로 이동함
    } catch (e) {
      const code = e?.code || "";
      setDeleteError(
        code.includes("wrong-password") || code.includes("invalid-credential")
          ? "비밀번호가 올바르지 않아요."
          : e?.message || "탈퇴에 실패했어요. 다시 시도해주세요."
      );
    } finally {
      setDeleting(false);
    }
  };

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

  const toggleInterest = (tag) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const uploadIfNeeded = async (uri, index) => {
    if (!uri) return null;
    if (uri.startsWith("http")) return uri;

    if (Platform.OS === "web") {
      const formData = new FormData();
      const blob = await (await fetch(uri)).blob();
      formData.append("file", blob);
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
    }

    const file = new File(uri);
    const task = new UploadTask(
      file,
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        httpMethod: "POST",
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        mimeType: "image/jpeg",
        parameters: { upload_preset: cloudinaryConfig.uploadPreset },
      }
    );

    const result = await task.uploadAsync();
    let data;
    try {
      data = JSON.parse(result.body);
    } catch (e) {
      throw new Error("사진 업로드에 실패했어요.");
    }
    if (!data.secure_url) {
      throw new Error(data.error?.message || "사진 업로드에 실패했어요.");
    }
    return data.secure_url;
  };

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

    const y = Number(birthYear);
    const m = Number(birthMonth);
    const d = Number(birthDay);
    const heightNum = Number(height);

    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!isValidDate(y, m, d)) { setError("생년월일을 정확히 입력해주세요."); return; }
    const birthDate = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const ageNum = calcKoreanAge(birthDate);
    if (!gender) { setError("성별을 선택해주세요."); return; }
    if (!seekingGender) { setError("만나고 싶은 성별을 선택해주세요."); return; }
    if (ageNum < 18) { setError("만 18세 이상만 이용할 수 있어요."); return; }
    if (!heightNum) { setError("키를 입력해주세요."); return; }
    if (!region) { setError("활동 지역을 선택해주세요."); return; }
    if (!religion) { setError("종교를 선택해주세요."); return; }
    if (!drinking) { setError("음주 여부를 선택해주세요."); return; }
    if (!smoking) { setError("흡연 여부를 선택해주세요."); return; }
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
          birthDate,
          age: ageNum,
          gender,
          seekingGender,
          height: heightNum,
          job: job.trim(),
          bio: bio.trim(),
          region,
          religion,
          drinking,
          smoking,
          interests,
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
    } catch (e) {
      setError("저장 실패: " + (e?.message || "다시 시도해주세요."));
    } finally {
      setSaving(false);
    }
  };

  const ChipGroup = ({ options, value, onChange }) => (
    <View style={styles.chipWrap}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.optionChip, value === opt && styles.optionChipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.optionChipText, value === opt && styles.optionChipTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const previewAge =
    isValidDate(Number(birthYear), Number(birthMonth), Number(birthDay))
      ? calcKoreanAge(
          `${String(Number(birthYear)).padStart(4, "0")}-${String(Number(birthMonth)).padStart(2, "0")}-${String(Number(birthDay)).padStart(2, "0")}`
        )
      : null;

  return (
    <>
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {mode === "setup" ? "프로필을 만들어주세요" : "내 프로필"}
      </Text>
      <Text style={styles.subtitle}>
        사진 인증 없이 바로 시작할 수 있어요. 나를 잘 보여주는 사진과 소개를 채워보세요.
      </Text>

      {mode === "edit" && <CookieBalance variant="card" />}

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

      <Text style={styles.label}>생년월일</Text>
      {birthLocked ? (
        <View style={styles.lockedRow}>
          <Ionicons name="lock-closed" size={15} color={COLORS.textLight} />
          <Text style={styles.lockedText}>
            {existingY}년 {Number(existingM)}월 {Number(existingD)}일 (만 {existing.age ?? previewAge}세)
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateInputYear]}
              value={birthYear}
              onChangeText={setBirthYear}
              placeholder="YYYY"
              keyboardType="number-pad"
              maxLength={4}
            />
            <TextInput
              style={[styles.input, styles.dateInputSmall]}
              value={birthMonth}
              onChangeText={setBirthMonth}
              placeholder="MM"
              keyboardType="number-pad"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.dateInputSmall]}
              value={birthDay}
              onChangeText={setBirthDay}
              placeholder="DD"
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          {previewAge != null && (
            <Text style={styles.hint}>만 {previewAge}세 — 저장하면 생년월일은 더 이상 바꿀 수 없어요</Text>
          )}
        </>
      )}

      <Text style={styles.label}>내 성별</Text>
      {genderLocked ? (
        <View style={styles.lockedRow}>
          <Ionicons name="lock-closed" size={15} color={COLORS.textLight} />
          <Text style={styles.lockedText}>{existing.gender}</Text>
        </View>
      ) : (
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
      )}

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

      <Text style={styles.label}>키 (cm)</Text>
      {heightLocked ? (
        <View style={styles.lockedRow}>
          <Ionicons name="lock-closed" size={15} color={COLORS.textLight} />
          <Text style={styles.lockedText}>{existing.height}cm</Text>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          placeholder="예: 175"
          keyboardType="number-pad"
        />
      )}

      <Text style={styles.label}>직업</Text>
      <TextInput
        style={styles.input}
        value={job}
        onChangeText={setJob}
        placeholder="예: 우주비행사 😄"
      />

      <Text style={styles.label}>활동 지역</Text>
      <ChipGroup options={REGIONS} value={region} onChange={setRegion} />

      <Text style={styles.label}>종교</Text>
      <ChipGroup options={RELIGIONS} value={religion} onChange={setReligion} />

      <Text style={styles.label}>음주</Text>
      <ChipGroup options={DRINKING_OPTIONS} value={drinking} onChange={setDrinking} />

      <Text style={styles.label}>흡연</Text>
      <ChipGroup options={SMOKING_OPTIONS} value={smoking} onChange={setSmoking} />

      <Text style={styles.label}>취미/관심사</Text>
      <View style={styles.chipWrap}>
        {INTERESTS.map((tag) => {
          const active = interests.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.optionChip, active && styles.optionChipActive]}
              onPress={() => toggleInterest(tag)}
            >
              <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
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

      {mode === "edit" && (
        <TouchableOpacity style={styles.deleteAccountButton} onPress={openDeleteConfirm}>
          <Text style={styles.deleteAccountButtonText}>회원 탈퇴</Text>
        </TouchableOpacity>
      )}
    </ScrollView>

    <Modal
      visible={deleteModalOpen}
      transparent
      animationType="fade"
      onRequestClose={() => !deleting && setDeleteModalOpen(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>비밀번호 확인</Text>
          <Text style={styles.modalDesc}>
            탈퇴를 진행하려면 현재 비밀번호를 입력해주세요.
          </Text>
          <TextInput
            style={styles.input}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="비밀번호"
            placeholderTextColor={COLORS.textLight}
            secureTextEntry
            autoFocus
          />
          {!!deleteError && <Text style={styles.error}>{deleteError}</Text>}

          <TouchableOpacity
            style={styles.deleteConfirmButton}
            onPress={onConfirmDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteConfirmButtonText}>탈퇴하기</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setDeleteModalOpen(false)}
            disabled={deleting}
          >
            <Text style={styles.modalCancelButtonText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 60, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6, color: COLORS.text, fontFamily: FONTS.heading },
  subtitle: { color: COLORS.textLight, marginBottom: 24, lineHeight: 20 },
  label: { fontWeight: "700", marginBottom: 8, marginTop: 16, fontSize: 14, color: COLORS.text },
  hint: { color: COLORS.textLight, fontSize: 12, marginTop: 4 },
  photoRow: { flexDirection: "row", gap: 10 },
  photoSlot: {
    width: 96,
    height: 128,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: "100%", height: "100%" },
  photoPlus: { fontSize: 28, color: COLORS.accent },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: COLORS.card,
    color: COLORS.text,
  },
  bioInput: { minHeight: 90, textAlignVertical: "top" },
  dateRow: { flexDirection: "row", gap: 10 },
  dateInputYear: { flex: 1.3, textAlign: "center" },
  dateInputSmall: { flex: 1, textAlign: "center" },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  lockedText: { fontSize: 15, color: COLORS.text, fontWeight: "600" },
  genderRow: { flexDirection: "row", gap: 10 },
  genderChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  genderChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genderChipText: { color: COLORS.textLight, fontWeight: "600" },
  genderChipTextActive: { color: "#fff" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionChipText: { color: COLORS.textLight, fontWeight: "600", fontSize: 13 },
  optionChipTextActive: { color: "#fff" },
  error: { color: COLORS.danger, marginTop: 16, fontSize: 14, textAlign: "center" },
  ok: { color: "#1a8f3c", marginTop: 16, fontSize: 14, textAlign: "center" },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  logoutButton: { alignItems: "center", marginTop: 20 },
  logoutButtonText: { color: COLORS.textLight },
  deleteAccountButton: { alignItems: "center", marginTop: 14 },
  deleteAccountButtonText: { color: COLORS.danger, fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20,10,5,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontFamily: FONTS.heading, color: COLORS.text, marginBottom: 8 },
  modalDesc: { fontSize: 13, color: COLORS.textLight, lineHeight: 19, marginBottom: 16 },
  deleteConfirmButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  deleteConfirmButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalCancelButton: { alignItems: "center", marginTop: 14 },
  modalCancelButtonText: { color: COLORS.textLight, fontSize: 14 },
});