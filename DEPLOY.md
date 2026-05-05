# GitHub 배포 가이드

이 프로젝트는 서버 없이 아래 2개 저장소로 운영하는 걸 기준으로 합니다.

- `public repo`: 웹앱 화면
- `private repo`: 암호화된 지출 데이터

예시 이름:

- public: `couple-expense-app`
- private: `couple-expense-data`

## 1. public repo 만들기

GitHub에서 새 public 저장소를 만듭니다.

예:

- Repository name: `couple-expense-app`
- Visibility: `Public`

이 폴더의 파일을 public repo에 올립니다.

필요 파일:

- `index.html`
- `styles.css`
- `script.js`
- `.nojekyll`
- `README.md`

## 2. GitHub Pages 켜기

public repo에서:

1. `Settings`
2. `Pages`
3. `Deploy from a branch`
4. Branch는 `main`, Folder는 `/ (root)`
5. 저장

잠시 후 아래 형태 주소로 열립니다.

- `https://<github-id>.github.io/<repo-name>/`

## 3. private repo 만들기

GitHub에서 새 private 저장소를 만듭니다.

예:

- Repository name: `couple-expense-data`
- Visibility: `Private`

빈 저장소여도 됩니다.

## 4. 토큰 만들기

GitHub에서 `Fine-grained personal access token`을 만듭니다.

추천 설정:

- Repository access: `Only select repositories`
- 선택 저장소: `couple-expense-data`
- Permission:
  - `Contents: Read and write`

주의:

- public repo 권한은 줄 필요 없습니다.
- 이 토큰은 앱 화면의 설정창에 직접 넣습니다.

## 5. 앱에서 입력할 값

웹앱 설정창에서 아래처럼 넣습니다.

- `GitHub Owner`: 본인 GitHub 아이디
- `Private Repo 이름`: `couple-expense-data`
- `저장 파일 경로`: `data/expenses.json`
- `Personal Access Token`: 방금 만든 토큰
- `암호화 비밀번호`: 두 사람만 아는 비밀번호

## 6. 첫 저장

1. 카카오톡 카드 메시지 붙여넣기
2. 자동 분석
3. 저장하기
4. 설정 열기
5. `GitHub로 저장하기`

그러면 private repo의 `data/expenses.json`에 암호화된 파일이 생성됩니다.

## 7. 여자친구 쪽 설정

여자친구 아이폰에서도 같은 웹 주소를 엽니다.

그리고 설정창에서 같은 값을 넣습니다.

- GitHub Owner
- Private Repo 이름
- 저장 파일 경로
- Personal Access Token
- 암호화 비밀번호

토큰은 각자 따로 만들어도 되고, 하나를 같이 써도 됩니다.

더 안전한 쪽은:

- 각자 GitHub 계정 생성
- private repo collaborator 초대
- 각자 자기 토큰 사용

## 8. 추천 운영 방식

- 웹앱 코드는 public repo
- 실제 지출 데이터는 private repo
- 저장 전후로 `GitHub에서 불러오기` 한 번 눌러 최신 상태 확인

## 9. 주의할 점

- 이 구조는 서버가 없어서 충돌 관리가 아주 강하지는 않습니다.
- 두 사람이 동시에 아주 짧은 시간 안에 저장하면 마지막 저장이 덮어쓸 수 있습니다.
- 그래서 실사용할 때는:
  1. 먼저 `GitHub에서 불러오기`
  2. 기록 추가
  3. `GitHub로 저장하기`

이 흐름이 가장 안전합니다.

## 10. 나중에 더 좋게 바꿀 수 있는 것

- iPhone 단축어와 연결해서 붙여넣기 단계를 줄이기
- 충돌 감지 추가
- 월별 파일 분리
- 카테고리 자동 분류
