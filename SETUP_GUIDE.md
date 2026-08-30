# Cookie (데이팅 앱) 실행 가이드

React Native(Expo) + Firebase로 만든 미니멀 데이팅 앱입니다. 사진 인증 없이 이메일 가입만으로 바로 시작할 수 있어요.

기능: 이메일 가입/로그인 · 프로필(사진·이름·나이·성별·소개) · 스와이프 매칭 · 실시간 채팅. 그 외 위치 필터, 푸시 알림, 결제 같은 기능은 의도적으로 뺐습니다.

---

## 0. 먼저 지울 것

프로젝트 폴더 안에 `_delete_this_node_modules` 라는 폴더가 있으면 삭제하세요. 초기 스캐폴딩 중 생긴 부산물이라 그냥 지워도 됩니다 (Finder에서 휴지통으로 보내면 됩니다).

## 1. 준비물

- **Node.js** (v20 이상 권장): https://nodejs.org 에서 설치
- **본인 스마트폰에 Expo Go 앱 설치** (App Store / Play 스토어에서 "Expo Go" 검색)
- **Firebase 계정** (구글 계정만 있으면 무료로 바로 사용 가능)

## 2. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 접속 → "프로젝트 추가" → 이름 입력(예: minglo) → 애널리틱스는 꺼도 무방 → 만들기
2. 왼쪽 메뉴 **Authentication** → "시작하기" → "로그인 방법" 탭 → **이메일/비밀번호** 활성화
3. 왼쪽 메뉴 **Firestore Database** → "데이터베이스 만들기" → 위치는 `asia-northeast3(서울)` 추천 → **테스트 모드**로 시작 (아래 3번에서 규칙을 다시 넣을 거예요)
4. 왼쪽 톱니바퀴 ⚙️ → **프로젝트 설정** → 아래로 스크롤 → "내 앱" → 웹 아이콘(`</>`) 클릭 → 앱 닉네임 아무거나 입력 → 등록하면 `firebaseConfig` 객체가 나옵니다. 이 값을 복사해서 `src/firebaseConfig.js` 파일에 그대로 붙여넣으세요.

> 참고: Firebase **Storage**(사진 저장)는 2026년 2월부터 유료(Blaze) 요금제로 업그레이드해야만 쓸 수 있게 바뀌었어요. 카드 등록 없이 진행하기 위해 이 앱은 사진 저장을 **Cloudinary**(무료, 카드 불필요)로 대신합니다 — 4번 단계에서 설정해요.

## 3. 보안 규칙 설정 (중요)

**Firestore** → 규칙 탭에서 아래 내용으로 교체 후 게시:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /swipes/{userId}/actions/{targetId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /matches/{matchId} {
      allow create: if request.auth != null && request.auth.uid in request.resource.data.users;
      allow read, update: if request.auth != null && request.auth.uid in resource.data.users;
      match /messages/{messageId} {
        allow read, create: if request.auth != null;
      }
    }
    match /blocks/{userId}/blocked/{targetId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /reports/{reportId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.reporterId;
    }
  }
}
```

> 신고/차단 기능을 추가하면서 `blocks`, `reports` 규칙이 새로 생겼어요. 위 전체 내용으로 Firestore 규칙을 다시 교체해주세요 (이전 규칙 위에 이어붙이는 게 아니라 통째로 바꾸는 거예요).

## 4. 사진 저장소 설정 (Cloudinary, 무료)

1. https://cloudinary.com/users/register/free 에서 무료 계정 가입 (카드 등록 없음)
2. 가입 후 대시보드 상단에 보이는 **Cloud name** 을 복사
3. 왼쪽 톱니바퀴 ⚙️(Settings) → **Upload** 탭 → 아래로 스크롤 → "Upload presets" → **Add upload preset** 클릭
4. Signing Mode를 **Unsigned** 로 변경 → Save (자동 생성된 preset 이름을 복사)
5. `src/cloudinaryConfig.js` 파일을 열어 `cloudName`과 `uploadPreset` 값을 방금 복사한 값으로 채우기

## 5. 로컬에서 실행하기

터미널(맥은 "터미널" 앱)을 열고:

```bash
cd 이 프로젝트 폴더 경로
npm install
npx expo start
```

터미널에 QR 코드가 뜨면, 폰의 **Expo Go 앱**으로 스캔하세요 (iPhone은 카메라 앱으로 스캔해도 됨). 같은 와이파이에 폰과 컴퓨터가 연결돼 있어야 합니다.

친구도 같은 방식으로 자기 폰에서 Expo Go로 접속하면, 서로 다른 계정으로 가입해서 실제 매칭·채팅을 테스트할 수 있어요.

## 6. 코드 구조

```
App.js                      앱 진입점, 네비게이션/컨텍스트 연결
src/firebaseConfig.js       ← 여기만 채우면 됨 (Firebase 키)
src/cloudinaryConfig.js     ← 여기만 채우면 됨 (Cloudinary 키)
src/firebase.js             Firebase 초기화 (auth/db)
src/context/AuthContext.js  로그인 상태 + 프로필 존재 여부 관리
src/utils/matching.js       스와이프 기록 + 매칭 성사 로직
src/navigation/             화면 이동 구조 (인증 → 프로필설정 → 메인탭)
src/screens/
  LoginScreen.js            로그인
  SignupScreen.js           회원가입
  ProfileFormScreen.js      프로필 작성/수정 (setup·edit 겸용, 사진 인증 없음)
  DiscoverScreen.js         스와이프 카드 (좌우 드래그 또는 버튼)
  MatchesScreen.js          매칭 목록
  ChatScreen.js             1:1 실시간 채팅
src/utils/blocking.js       신고/차단 로직 + 공용 액션시트 UI
```

Firestore 데이터 구조:
- `users/{uid}`: 프로필 정보
- `swipes/{uid}/actions/{targetUid}`: 내가 누른 좋아요/패스 기록
- `matches/{matchId}`: 매칭 정보 (matchId = 두 uid를 정렬해 합친 값), `blockedBy` 배열에 차단한 쪽 uid가 들어가면 양쪽 매칭 목록에서 숨겨짐
- `matches/{matchId}/messages/{messageId}`: 채팅 메시지
- `blocks/{uid}/blocked/{targetUid}`: 내가 차단한 상대 목록
- `reports/{reportId}`: 신고 기록 (reporterId, targetId, reason) — 앱에서 직접 볼 수는 없고, Firebase 콘솔의 Firestore Database 화면에서 확인 가능

## 7. 알려진 제한 (의도적으로 뺀 것들)

- 위치 기반 필터 없음 — 가입한 모든 유저가 서로에게 노출됩니다
- 푸시 알림 없음 — 앱을 열어야 새 메시지/매칭을 확인할 수 있어요
- 사진 인증 없음 — 의도된 차별화 포인트입니다
- 신고 내용을 관리자가 볼 수 있는 화면 없음 — Firebase 콘솔에서 `reports` 컬렉션을 직접 확인해야 해요
- 매칭 목록 쿼리에 Firestore 복합 색인이 필요할 수 있어요. 앱 실행 중 콘솔에 "색인을 만들어야 합니다" 같은 에러와 링크가 뜨면, 그 링크를 클릭해서 자동 생성하면 됩니다 (1~2분 소요)

## 8. 다음에 추가하면 좋은 것 (선택)

- 위치 반경 필터 (Firestore GeoPoint + 클라이언트 거리 계산)
- 푸시 알림 (Expo Notifications + Firebase Cloud Messaging)
- 앱스토어/플레이스토어 정식 배포 (`eas build`)
