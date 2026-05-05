const STORAGE_KEY = "couple-expenses-v1";
const SETTINGS_KEY = "couple-expenses-github-settings-v1";
const SESSION_TOKEN_KEY = "couple-expenses-github-token-v1";
const DEFAULT_GITHUB_SETTINGS = {
  owner: "kim950106",
  repo: "couple-expense-data",
  path: "data/expenses.json",
};

const sampleExpenses = [
  {
    id: crypto.randomUUID(),
    date: "2026-05-05",
    merchant: "스타벅스 성수",
    amount: 6100,
    person: "본인",
    note: "카카오톡 텍스트 자동 인식",
    rawText: "05/05 14:33 스타벅스 성수 6,100원 일시불",
    createdAt: "2026-05-05T14:33:00+09:00",
  },
  {
    id: crypto.randomUUID(),
    date: "2026-05-05",
    merchant: "올리브영 강남",
    amount: 28300,
    person: "여자친구",
    note: "스크린샷 OCR로 저장",
    rawText: "05/05 올리브영 강남 28,300원",
    createdAt: "2026-05-05T16:12:00+09:00",
  },
];

const state = {
  expenses: loadExpenses(),
  filterPerson: "전체",
  currentMode: "paste",
};

const currency = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const elements = {
  monthLabel: document.querySelector("#monthLabel"),
  monthlyTotal: document.querySelector("#monthlyTotal"),
  meTotal: document.querySelector("#meTotal"),
  partnerTotal: document.querySelector("#partnerTotal"),
  heroSummary: document.querySelector("#heroSummary"),
  dayStrip: document.querySelector("#dayStrip"),
  expenseFeed: document.querySelector("#expenseFeed"),
  emptyState: document.querySelector("#emptyState"),
  personFilters: document.querySelector("#personFilters"),
  syncBanner: document.querySelector("#syncBanner"),
  entrySheet: document.querySelector("#entrySheet"),
  settingsSheet: document.querySelector("#settingsSheet"),
  sheetEyebrow: document.querySelector("#sheetEyebrow"),
  sheetTitle: document.querySelector("#sheetTitle"),
  rawTextField: document.querySelector("#rawTextField"),
  imageField: document.querySelector("#imageField"),
  rawMessage: document.querySelector("#rawMessage"),
  receiptImage: document.querySelector("#receiptImage"),
  ocrStatus: document.querySelector("#ocrStatus"),
  personInput: document.querySelector("#personInput"),
  dateInput: document.querySelector("#dateInput"),
  merchantInput: document.querySelector("#merchantInput"),
  amountInput: document.querySelector("#amountInput"),
  noteInput: document.querySelector("#noteInput"),
  githubOwner: document.querySelector("#githubOwner"),
  githubRepo: document.querySelector("#githubRepo"),
  githubPath: document.querySelector("#githubPath"),
  githubToken: document.querySelector("#githubToken"),
  syncPassphrase: document.querySelector("#syncPassphrase"),
};

bindEvents();
hydrateSettings();
setDefaultDate();
render();

function bindEvents() {
  document.querySelector("#openPasteButton").addEventListener("click", () => openEntrySheet("paste"));
  document.querySelector("#openImageButton").addEventListener("click", () => openEntrySheet("image"));
  document.querySelector("#openManualButton").addEventListener("click", () => openEntrySheet("manual"));
  document.querySelector("#openAddButton").addEventListener("click", () => openEntrySheet("manual"));
  document.querySelector("#openSettingsButton").addEventListener("click", openSettingsSheet);
  document.querySelector("#bottomSettingsButton").addEventListener("click", openSettingsSheet);
  document.querySelector("#openSyncButton").addEventListener("click", openSettingsSheet);
  document.querySelector("#parseMessageButton").addEventListener("click", handleParseMessage);
  document.querySelector("#ocrButton").addEventListener("click", handleOcr);
  document.querySelector("#saveEntryButton").addEventListener("click", saveEntry);
  document.querySelector("#resetFormButton").addEventListener("click", resetEntryForm);
  document.querySelector("#exportButton").addEventListener("click", exportJson);
  document.querySelector("#saveGithubButton").addEventListener("click", pushToGitHub);
  document.querySelector("#loadGithubButton").addEventListener("click", loadFromGitHub);

  document.querySelectorAll("[data-close-sheet]").forEach((button) => {
    button.addEventListener("click", () => closeSheet(button.dataset.closeSheet));
  });

  [elements.entrySheet, elements.settingsSheet].forEach((sheet) => {
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) closeSheet(sheet.id);
    });
  });

  elements.personFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-person]");
    if (!button) return;
    state.filterPerson = button.dataset.person;
    render();
  });
}

function loadExpenses() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return sampleExpenses;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : sampleExpenses;
  } catch {
    return sampleExpenses;
  }
}

function persistExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
}

function render() {
  renderHeader();
  renderTotals();
  renderDays();
  renderFeed();
  renderFilters();
  renderSyncBanner();
}

function renderHeader() {
  const now = new Date();
  elements.monthLabel.textContent = `${now.getMonth() + 1}월 소비 리포트`;
}

function renderTotals() {
  const monthEntries = state.expenses.filter((item) => isCurrentMonth(item.date));
  const totals = monthEntries.reduce(
    (acc, item) => {
      acc.total += item.amount;
      if (item.person === "본인") acc.me += item.amount;
      if (item.person === "여자친구") acc.partner += item.amount;
      return acc;
    },
    { total: 0, me: 0, partner: 0 }
  );

  elements.monthlyTotal.textContent = currency.format(totals.total);
  elements.meTotal.textContent = currency.format(totals.me);
  elements.partnerTotal.textContent = currency.format(totals.partner);
  elements.heroSummary.textContent = `${monthEntries.length}건이 저장되어 있고, 가장 최근 입력은 ${lastSavedText()}`;
}

function renderDays() {
  const groupedByDate = state.expenses
    .filter((item) => isCurrentMonth(item.date))
    .reduce((acc, item) => {
      acc[item.date] ??= [];
      acc[item.date].push(item);
      return acc;
    }, {});

  const orderedDates = Object.keys(groupedByDate).sort((a, b) => (a < b ? 1 : -1));
  elements.dayStrip.innerHTML = "";

  if (!orderedDates.length) {
    elements.dayStrip.innerHTML = `
      <article class="day-card">
        <div>
          <div class="day-date">이번 달 내역 없음</div>
          <div class="amount-caption">첫 소비를 저장해보세요</div>
        </div>
        <strong class="day-total">${currency.format(0)}</strong>
      </article>
    `;
    return;
  }

  orderedDates.forEach((date) => {
    const list = groupedByDate[date];
    const total = list.reduce((sum, entry) => sum + entry.amount, 0);
    const day = document.createElement("article");
    day.className = "day-card";
    day.innerHTML = `
      <div>
        <div class="day-date">${formatDate(date)}</div>
        <div class="amount-caption">${list.length}건 저장됨</div>
      </div>
      <strong class="day-total">${currency.format(total)}</strong>
    `;
    elements.dayStrip.append(day);
  });
}

function renderFeed() {
  const filtered = state.expenses
    .filter((item) => (state.filterPerson === "전체" ? true : item.person === state.filterPerson))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  elements.expenseFeed.innerHTML = "";
  elements.emptyState.hidden = filtered.length > 0;

  filtered.forEach((item) => {
    const row = document.createElement("article");
    row.className = "expense-row";
    row.innerHTML = `
      <div class="expense-meta">
        <div class="merchant-mark">${escapeHtml(item.merchant).slice(0, 1) || "₩"}</div>
        <div class="expense-main">
          <strong>${escapeHtml(item.merchant)}</strong>
          <p class="expense-note">${escapeHtml(item.note || "메모 없음")}</p>
        </div>
      </div>
      <div class="expense-side">
        <strong>${currency.format(Number(item.amount) || 0)}</strong>
        <p class="amount-caption">${formatDate(item.date)}</p>
        <span class="person-chip">${escapeHtml(item.person)}</span>
      </div>
    `;
    elements.expenseFeed.append(row);
  });
}

function renderFilters() {
  elements.personFilters.querySelectorAll("[data-person]").forEach((button) => {
    button.classList.toggle("active", button.dataset.person === state.filterPerson);
  });
}

function renderSyncBanner() {
  const settings = loadSettings();
  const hasSessionToken = Boolean(sessionStorage.getItem(SESSION_TOKEN_KEY));
  if (settings.owner && settings.repo && settings.path) {
    elements.syncBanner.innerHTML = `
      <div>
        <strong>${escapeHtml(settings.owner)}/${escapeHtml(settings.repo)} 준비됨</strong>
        <p>${escapeHtml(settings.path)} 파일에 ${hasSessionToken ? "암호화 동기화할 수 있어요." : "세션 토큰을 넣으면 바로 동기화할 수 있어요."}</p>
      </div>
      <button class="ghost-button" id="openSyncButtonInline">다시 설정</button>
    `;
    document.querySelector("#openSyncButtonInline").addEventListener("click", openSettingsSheet);
    return;
  }

  elements.syncBanner.innerHTML = `
    <div>
      <strong>GitHub 동기화 준비 전</strong>
      <p>지금은 이 기기 브라우저에 저장되고 있어요.</p>
    </div>
    <button class="ghost-button" id="openSyncButtonInline">동기화 설정</button>
  `;
  document.querySelector("#openSyncButtonInline").addEventListener("click", openSettingsSheet);
}

function openEntrySheet(mode) {
  state.currentMode = mode;
  elements.sheetEyebrow.textContent =
    mode === "paste" ? "텍스트 자동 분석" : mode === "image" ? "스크린샷 OCR" : "수동 입력";
  elements.sheetTitle.textContent =
    mode === "paste" ? "메시지 붙여넣기" : mode === "image" ? "사진으로 입력" : "직접 기록 추가";
  elements.rawTextField.hidden = mode === "manual";
  elements.imageField.hidden = mode !== "image";

  if (mode === "manual") {
    elements.rawMessage.value = "";
  }

  elements.entrySheet.hidden = false;
}

function openSettingsSheet() {
  hydrateSettings();
  elements.settingsSheet.hidden = false;
}

function closeSheet(sheetId) {
  document.getElementById(sheetId).hidden = true;
}

function resetEntryForm() {
  elements.rawMessage.value = "";
  elements.receiptImage.value = "";
  elements.personInput.value = "본인";
  elements.merchantInput.value = "";
  elements.amountInput.value = "";
  elements.noteInput.value = "";
  elements.ocrStatus.textContent = "이미지 OCR은 기기 성능에 따라 조금 시간이 걸릴 수 있어요.";
  setDefaultDate();
}

function setDefaultDate() {
  elements.dateInput.value = new Date().toISOString().slice(0, 10);
}

function handleParseMessage() {
  const parsed = parseExpenseMessage(elements.rawMessage.value);
  applyParsedData(parsed);
  elements.noteInput.value = elements.noteInput.value || "카카오톡 메시지에서 자동 추출";
}

async function handleOcr() {
  const file = elements.receiptImage.files[0];
  if (!file) {
    elements.ocrStatus.textContent = "먼저 스크린샷 이미지를 선택해 주세요.";
    return;
  }

  elements.ocrStatus.textContent = "문자를 읽는 중이에요...";

  try {
    const result = await Tesseract.recognize(file, "kor+eng");
    const text = result.data.text.trim();
    elements.rawMessage.value = text;
    elements.ocrStatus.textContent = text ? "문자 인식이 끝났어요. 아래 내용으로 자동 분석해요." : "문자를 찾지 못했어요.";
    if (text) handleParseMessage();
  } catch (error) {
    elements.ocrStatus.textContent = "OCR 중 오류가 발생했어요. 텍스트 붙여넣기로 다시 시도해 주세요.";
    console.error(error);
  }
}

function applyParsedData(parsed) {
  if (parsed.person) elements.personInput.value = parsed.person;
  if (parsed.date) elements.dateInput.value = parsed.date;
  if (parsed.merchant) elements.merchantInput.value = parsed.merchant;
  if (parsed.amount) elements.amountInput.value = parsed.amount;
  if (parsed.note && !elements.noteInput.value) elements.noteInput.value = parsed.note;
}

function saveEntry() {
  const merchant = elements.merchantInput.value.trim();
  const amount = Number(elements.amountInput.value);
  if (!merchant || !amount) {
    alert("가맹점과 금액은 꼭 입력해 주세요.");
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    person: elements.personInput.value,
    date: elements.dateInput.value || new Date().toISOString().slice(0, 10),
    merchant,
    amount,
    note: elements.noteInput.value.trim(),
    rawText: elements.rawMessage.value.trim(),
    createdAt: new Date().toISOString(),
  };

  state.expenses = [entry, ...state.expenses];
  persistExpenses();
  render();
  closeSheet("entrySheet");
  resetEntryForm();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.expenses, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `expenses-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function hydrateSettings() {
  const settings = loadSettings();
  elements.githubOwner.value = settings.owner || "";
  elements.githubRepo.value = settings.repo || "";
  elements.githubPath.value = settings.path || "data/expenses.json";
  elements.githubToken.value = sessionStorage.getItem(SESSION_TOKEN_KEY) || "";
  elements.syncPassphrase.value = "";
}

function loadSettings() {
  try {
    return {
      ...DEFAULT_GITHUB_SETTINGS,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
    };
  } catch {
    return { ...DEFAULT_GITHUB_SETTINGS };
  }
}

function saveSettings() {
  const settings = {
    owner: elements.githubOwner.value.trim(),
    repo: elements.githubRepo.value.trim(),
    path: elements.githubPath.value.trim() || "data/expenses.json",
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  const token = elements.githubToken.value.trim();
  if (token) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return settings;
}

async function loadFromGitHub() {
  const settings = saveSettings();
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || elements.githubToken.value.trim();
  const passphrase = elements.syncPassphrase.value;
  if (!isGitHubConfigured(settings, token)) {
    alert("Owner, Repo, Path, Token을 모두 입력해 주세요.");
    return;
  }

  try {
    const response = await fetch(githubFileUrl(settings), {
      headers: githubHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`GitHub load failed: ${response.status}`);
    }

    const payload = await response.json();
    const content = atob(payload.content.replace(/\n/g, ""));
    const raw = JSON.parse(content);
    const parsed = Array.isArray(raw) ? raw : await decryptPayload(raw, passphrase);
    if (!Array.isArray(parsed)) throw new Error("Invalid data");

    state.expenses = parsed;
    persistExpenses();
    render();
    closeSheet("settingsSheet");
    alert("GitHub에서 내역을 불러왔어요.");
  } catch (error) {
    console.error(error);
    alert("GitHub에서 불러오지 못했어요. 저장소와 토큰 권한을 확인해 주세요.");
  }
}

async function pushToGitHub() {
  const settings = saveSettings();
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || elements.githubToken.value.trim();
  const passphrase = elements.syncPassphrase.value;
  if (!isGitHubConfigured(settings, token)) {
    alert("Owner, Repo, Path, Token을 모두 입력해 주세요.");
    return;
  }

  if (!passphrase) {
    alert("암호화 비밀번호를 입력해 주세요.");
    return;
  }

  try {
    let sha;
    const existing = await fetch(githubFileUrl(settings), {
      headers: githubHeaders(token),
    });

    if (existing.ok) {
      const payload = await existing.json();
      sha = payload.sha;
    }

    const encryptedPayload = await encryptPayload(state.expenses, passphrase);
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(encryptedPayload, null, 2))));
    const response = await fetch(githubFileUrl(settings), {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify({
        message: `Update expenses ${new Date().toISOString()}`,
        content,
        sha,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub save failed: ${response.status}`);
    }

    renderSyncBanner();
    closeSheet("settingsSheet");
    alert("GitHub private repo로 저장했어요.");
  } catch (error) {
    console.error(error);
    alert("GitHub 저장에 실패했어요. repo 이름, path, token 권한을 다시 확인해 주세요.");
  }
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

function githubFileUrl(settings) {
  return `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${settings.path}`;
}

function isGitHubConfigured(settings, token) {
  return settings.owner && settings.repo && settings.path && token;
}

async function encryptPayload(expenses, passphrase) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const encoded = new TextEncoder().encode(JSON.stringify(expenses));
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    encrypted: true,
    version: 1,
    algorithm: "AES-GCM",
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(new Uint8Array(cipherBuffer)),
  };
}

async function decryptPayload(payload, passphrase) {
  if (!payload?.encrypted) return payload;
  if (!passphrase) {
    throw new Error("Missing passphrase");
  }

  const key = await deriveKey(passphrase, base64ToUint8Array(payload.salt));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToUint8Array(payload.iv) },
    key,
    base64ToUint8Array(payload.ciphertext)
  );

  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseExpenseMessage(rawText) {
  const text = rawText.replace(/\s+/g, " ").trim();
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const amountMatch = text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : "";

  const date =
    parseDate(text, /(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})/) ||
    parseDate(text, /(\d{1,2})[\/.-]\s*(\d{1,2})/) ||
    parseDate(text, /(\d{1,2})월\s*(\d{1,2})일/) ||
    new Date().toISOString().slice(0, 10);

  const person = /여자친구|여친|wife|partner/i.test(text) ? "여자친구" : "본인";
  const merchant = extractMerchant(lines, text, amountMatch?.[0]);

  return {
    person,
    date,
    merchant,
    amount,
    note: /일시불/.test(text) ? "일시불 결제" : "",
  };
}

function parseDate(text, pattern) {
  const match = text.match(pattern);
  if (!match) return "";

  let year;
  let month;
  let day;

  if (match.length >= 4) {
    year = match[1].length === 4 ? Number(match[1]) : new Date().getFullYear();
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    year = new Date().getFullYear();
    month = Number(match[1]);
    day = Number(match[2]);
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractMerchant(lines, text, amountToken) {
  const ignoreWords = [
    "카드",
    "승인",
    "결제",
    "사용",
    "일시불",
    "할부",
    "누적",
    "잔액",
    "원",
    "krw",
    "카카오",
    "알림",
  ];

  const candidates = [
    ...lines,
    ...text.split(/ {2,}/),
  ].map((value) => value.trim());

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (amountToken && candidate.includes(amountToken)) continue;
    if (ignoreWords.some((word) => candidate.includes(word))) continue;
    if (!/[가-힣A-Za-z]/.test(candidate)) continue;
    if (candidate.length < 2) continue;
    return candidate.replace(/\b\d{1,2}[:.]\d{2}\b/g, "").trim();
  }

  const fallback = text
    .replace(amountToken || "", "")
    .replace(/\d{1,2}[\/.-]\d{1,2}/g, "")
    .replace(/\d{1,2}:\d{2}/g, "")
    .replace(/일시불|승인|결제|사용/g, "")
    .trim();

  return fallback || "가맹점 미확인";
}

function isCurrentMonth(dateString) {
  const today = new Date();
  const date = new Date(`${dateString}T00:00:00`);
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function lastSavedText() {
  if (!state.expenses.length) return "아직 없어요.";
  const latest = [...state.expenses].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  return `${latest.person} · ${latest.merchant}`;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
