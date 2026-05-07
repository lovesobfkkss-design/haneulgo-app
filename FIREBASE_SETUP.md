# Firebase 설정 가이드

이 가이드를 따라 Firebase를 설정하면 모든 기기에서 데이터가 실시간으로 동기화됩니다!

## 1단계: Firebase 프로젝트 생성

1. **Firebase 콘솔** 접속
   - https://console.firebase.google.com/ 방문
   - Google 계정으로 로그인

2. **프로젝트 추가** 클릭
   - 프로젝트 이름 입력: `하늘고-배부-앱` (또는 원하는 이름)
   - Google Analytics 비활성화해도 됨 (선택사항)
   - "프로젝트 만들기" 클릭

## 2단계: Realtime Database 설정

1. 좌측 메뉴에서 **"빌드" > "Realtime Database"** 클릭

2. **"데이터베이스 만들기"** 클릭

3. **위치 선택**: `asia-southeast1` (싱가포르 - 한국과 가까움) 선택

4. **보안 규칙 선택**:
   - "테스트 모드에서 시작" 선택 (일단 테스트용)
   - "사용 설정" 클릭

   ⚠️ **중요**: 나중에 보안 규칙을 업데이트해야 합니다!

## 3단계: 웹 앱 추가 및 구성 정보 가져오기

1. Firebase 콘솔 메인 페이지로 이동

2. **"웹"** 아이콘 클릭 (`</>` 모양)

3. 앱 닉네임 입력: `하늘고-배부-웹` (또는 원하는 이름)

4. "Firebase 호스팅 설정" 체크 **해제**

5. **"앱 등록"** 클릭

6. **Firebase SDK 구성 정보**가 표시됩니다. 다음과 같은 형태:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebasedatabase.app",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxxxxxx"
};
```

7. **이 정보를 복사해서 저장**해두세요! (메모장에 붙여넣기)

## 4단계: index.html 파일 수정

1. **index.html 파일 열기**
   - 코드 에디터(VS Code, 메모장 등)로 `index.html` 파일을 엽니다

2. **Firebase 설정 부분 찾기**
   - 파일 상단에서 `const firebaseConfig = {` 를 찾습니다 (약 752번째 줄)

3. **설정 정보 교체**
   - 3단계에서 복사한 Firebase 설정 정보로 교체합니다

   **변경 전:**
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY_HERE",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

   **변경 후 (예시):**
   ```javascript
   const firebaseConfig = {
       apiKey: "AIzaSyDxVxxxxxxxxxxxxxxxxxxx",
       authDomain: "haneul-baebu.firebaseapp.com",
       databaseURL: "https://haneul-baebu-default-rtdb.firebaseio.com",
       projectId: "haneul-baebu",
       storageBucket: "haneul-baebu.appspot.com",
       messagingSenderId: "123456789012",
       appId: "1:123456789012:web:abcdefghijk"
   };
   ```

4. **파일 저장**
   - `Ctrl + S` (Windows) 또는 `Cmd + S` (Mac)으로 저장합니다

## 5단계: 보안 규칙 업데이트 (나중에)

현재는 테스트 모드라 누구나 접근 가능합니다. 나중에 다음 규칙으로 변경하세요:

Firebase 콘솔 > Realtime Database > 규칙 탭:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

더 강력한 보안이 필요하면 인증을 추가할 수 있습니다.

---

## 완료 후 테스트

1. **브라우저에서 index.html 열기**
   - 파일을 더블클릭하거나 브라우저로 드래그

2. **Firebase 연결 확인**
   - 제목 아래에 **"🔥 Firebase 연결됨 - 모든 기기에서 실시간 동기화"** 메시지가 보이면 성공!
   - 만약 **"⚠️ localStorage 모드"** 메시지가 보이면 설정을 다시 확인하세요

3. **브라우저 콘솔 확인** (F12 키)
   - "✅ Firebase 연결 성공!" 메시지가 있으면 성공
   - 에러가 있으면 설정을 다시 확인하세요

4. **실시간 동기화 테스트**
   - PC에서 학생 추가하기
   - 핸드폰에서 새로고침
   - 추가한 학생이 보이면 성공! 🎉

## 문제 해결

### "⚠️ localStorage 모드" 메시지가 계속 뜸
- `index.html`에서 `firebaseConfig` 설정이 제대로 교체되었는지 확인
- `apiKey`가 `"YOUR_API_KEY_HERE"`인지 확인 (이면 안 됨!)

### 콘솔에 에러 메시지
- Firebase 콘솔에서 `databaseURL`을 다시 확인
- Realtime Database가 활성화되었는지 확인

### 데이터가 저장 안 됨
- Firebase 콘솔 > Realtime Database > 데이터 탭에서 확인
- 보안 규칙이 읽기/쓰기를 허용하는지 확인

---

## 혜택

✅ **모든 기기에서 실시간 동기화**
- PC에서 추가한 학생이 핸드폰에서 즉시 보임
- 핸드폰에서 체크한 내용이 PC에 즉시 반영
- 여러 명이 동시에 사용 가능

✅ **자동 백업**
- 데이터가 클라우드에 저장되어 안전
- 기기를 잃어버려도 데이터 유지

✅ **무료!**
- Firebase 무료 플랜으로 충분히 사용 가능
