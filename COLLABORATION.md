# 둘이서 같이 개발하는 방법

Cookie 앱 코드는 GitHub 저장소로 공유되고 있어요. 각자 자기 컴퓨터에 코드를 받아서, 각자 Claude(Cowork)랑 작업하고, GitHub으로 서로 합치는 방식이에요.

## 매번 작업할 때 순서

**시작하기 전에 (꼭!):**
1. GitHub Desktop 열기
2. 위쪽 **Fetch origin** 클릭 → **Pull origin** 클릭 (상대방이 올린 최신 코드 받기)
3. 이걸 안 하고 작업하면 서로 다른 버전을 고치게 돼서 나중에 합치기 힘들어져요

**작업할 때:**
- Cowork에서 이 프로젝트 폴더를 "연결된 폴더"로 선택하고, 원하는 기능을 요청하면 Claude가 코드를 고쳐줘요
- 폰에서 확인하려면 터미널에서:
  ```bash
  npx expo start
  ```
  (같은 와이파이 안 되면 `npx expo start --tunnel`)

**끝났으면:**
1. GitHub Desktop으로 돌아가기
2. 왼쪽 아래 **Summary**에 뭘 했는지 한 줄로 적기 (예: "위치 필터 추가")
3. **Commit to main** 클릭
4. 오른쪽 위 **Push origin** 클릭

## 충돌(같은 부분을 둘 다 고쳤을 때)

Pull 했는데 "충돌(conflict)"이 뜨면, 당황하지 말고 그 화면 그대로 스크린샷 찍어서 Claude한테 보여주세요. 어떤 파일이 충돌났는지 보고 같이 정리해드릴 수 있어요.

**충돌을 아예 줄이는 방법**: 시작하기 전에 서로 "나 OO 화면/기능 할게" 하고 한마디 해주는 게 제일 확실해요. 같은 파일을 동시에 안 건드리면 충돌은 거의 안 나요.

## 친구가 처음 이 프로젝트에 참여할 때 (한 번만)

1. GitHub 초대 수락
2. GitHub Desktop 설치 + 로그인
3. Node.js 설치 (https://nodejs.org, LTS 버전)
4. GitHub Desktop에서 **File → Clone Repository** → 이 저장소 선택 → Clone
5. 터미널에서 그 폴더로 이동 후:
   ```bash
   npm install
   npx expo start
   ```
6. Cowork 열어서 방금 클론한 폴더를 "연결된 폴더"로 선택 → 이제 이 대화처럼 Claude한테 기능 요청 가능


## Firestore 규칙 (보안) — 꼭 읽어주세요

- 규칙 전체는 저장소의 `firestore.rules` 파일에 있어요. Firebase 콘솔 → Firestore → 규칙 에 **통째로 붙여넣고 게시**해야 실제로 적용돼요 (파일만 바꾼다고 자동 적용되지 않아요).
- **새 컬렉션을 만들거나, 쿠키/부스트/좋아요 한도/신고처럼 "돈·권한과 관련된" 필드를 바꾸면 규칙도 같이 고쳐야 해요.** 안 고치면 권한 오류(permission-denied)가 나요.
- 쿠키는 앱에서 "줄이는 것"만 가능해요(쓰기). 늘리는 건 가입 보너스(가입 시 30개)와 관리자 도구만 가능 — 나중에 결제는 서버(Cloud Functions)에서 처리할 예정.
- 생년월일·성별·키는 가입 후 변경 불가 (규칙에서도 막혀 있어요).
- 관리자 UID는 `src/adminConfig.js` 와 `firestore.rules` 두 곳에 있고 항상 같아야 해요.
