import React from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../theme";
import { LEGAL_LINKS, MIN_AGE } from "../legal/legalConfig";

// 가입 화면의 약관 동의 체크 목록 (그라데이션 배경 위에 올라가는 흰 글씨 버전)
// value: { age, terms, privacy, location } 각각 true/false
const ITEMS = [
  { key: "age", label: `만 ${MIN_AGE}세 이상입니다` },
  { key: "terms", label: "서비스 이용약관 동의", link: "terms" },
  { key: "privacy", label: "개인정보 수집·이용 동의", link: "privacy" },
  { key: "location", label: "위치기반서비스 이용약관 동의", link: "location" },
];

export const EMPTY_CONSENT = { age: false, terms: false, privacy: false, location: false };
export const allRequiredChecked = (v) => ITEMS.every((i) => v[i.key]);

const openLink = (linkKey) => {
  const url = LEGAL_LINKS[linkKey];
  if (!url) {
    Alert.alert("준비 중이에요", "약관 문서가 곧 공개될 예정이에요.");
    return;
  }
  Linking.openURL(url).catch(() => Alert.alert("열 수 없어요", "잠시 후 다시 시도해주세요."));
};

export default function ConsentChecklist({ value, onChange }) {
  const allChecked = allRequiredChecked(value);
  const toggleAll = () => {
    const next = !allChecked;
    onChange({ age: next, terms: next, privacy: next, location: next });
  };

  return (
    <View style={styles.box}>
      <TouchableOpacity style={styles.row} onPress={toggleAll} activeOpacity={0.8}>
        <Ionicons
          name={allChecked ? "checkbox" : "square-outline"}
          size={22}
          color="#fff"
        />
        <Text style={styles.allText}>전체 동의</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      {ITEMS.map((item) => (
        <View key={item.key} style={styles.row}>
          <TouchableOpacity
            style={styles.rowMain}
            onPress={() => onChange({ ...value, [item.key]: !value[item.key] })}
            activeOpacity={0.8}
          >
            <Ionicons
              name={value[item.key] ? "checkbox" : "square-outline"}
              size={20}
              color="#fff"
            />
            <Text style={styles.text}>
              <Text style={styles.required}>[필수] </Text>
              {item.label}
            </Text>
          </TouchableOpacity>
          {item.link && (
            <TouchableOpacity onPress={() => openLink(item.link)} hitSlop={8}>
              <Text style={styles.viewLink}>보기</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 6, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 7, gap: 10 },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  allText: { color: "#fff", fontSize: 16, fontFamily: FONTS.heading },
  text: { flex: 1, color: "#fff", fontSize: 14, fontFamily: FONTS.regular },
  required: { fontFamily: FONTS.bold },
  viewLink: { color: "#fff", fontSize: 13, fontFamily: FONTS.bold, textDecorationLine: "underline" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.35)", marginVertical: 4 },
});
