# 우리 카드 가계부

아이폰에서 카카오톡 카드 사용 알림을 복사하거나 스크린샷으로 올려서 지출을 저장하는 모바일 웹앱입니다.

## 들어있는 기능

- 카카오톡 카드 메시지 붙여넣기 후 자동 파싱
- 스크린샷 업로드 후 OCR 시도
- 본인 / 여자친구 사용자 분리
- 메모 저장
- 일자별 / 월별 합계 표시
- 브라우저 `localStorage` 저장
- GitHub private repo 암호화 동기화

## 파일

- `index.html`: 화면 구조
- `styles.css`: 모바일 UI
- `script.js`: 파싱, 저장, OCR, GitHub 암호화 동기화

## 로컬 실행

```bash
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173` 열기

## GitHub 배포

배포 순서는 [DEPLOY.md](/Users/kimhyunchul/Documents/지은/DEPLOY.md)에 정리되어 있습니다.

## GitHub 배포 추천 구조

### 1. 웹앱용 public repo

- 이 폴더 내용을 public 저장소에 업로드
- GitHub Pages 활성화

### 2. 데이터용 private repo

- 예: `couple-expenses-data`
- 파일 경로 예: `data/expenses.json`

## 앱 안에서 넣을 GitHub 설정

- `Owner`: GitHub 아이디
- `Private Repo 이름`: 예: `couple-expenses-data`
- `저장 파일 경로`: 예: `data/expenses.json`
- `Personal Access Token`: private repo `Contents` 읽기/쓰기 가능한 토큰
- `암호화 비밀번호`: 두 사람만 아는 비밀번호

## 추천 토큰 권한

- Fine-grained personal access token
- Repository access: 데이터 저장소만 선택
- Permissions:
  - `Contents: Read and write`

## 사용 흐름

1. 카카오톡 카드 사용 메시지 복사
2. 웹앱에서 `메시지 붙여넣기`
3. 자동 분석 결과 확인
4. 메모 보완 후 저장
5. 필요할 때 `GitHub로 저장하기`

## 사진 입력

- 스크린샷 업로드 후 OCR을 실행합니다.
- 이미지 품질이나 카드사 문구 형태에 따라 인식 정확도 차이가 있습니다.
- OCR 결과가 어색하면 텍스트를 수정한 뒤 저장하면 됩니다.

## 주의

- GitHub 토큰은 `localStorage`에 남기지 않고 현재 브라우저 세션에만 잠깐 보관합니다.
- GitHub에 저장되는 파일은 암호화된 JSON입니다.
- public repo에는 실제 사용내역 JSON을 올리지 않는 걸 권장합니다.
- 완전 자동 수집보다는 `복사/붙여넣기` 또는 `스크린샷 업로드` 흐름에 맞춘 MVP입니다.
