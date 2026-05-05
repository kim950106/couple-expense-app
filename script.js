const STORAGE_KEY = "couple-expenses-v1";
const SETTINGS_KEY = "couple-expenses-github-settings-v1";
const SESSION_TOKEN_KEY = "couple-expenses-github-token-v1";
const DEFAULT_GITHUB_SETTINGS = {
  owner: "kim950106",
  repo: "couple-expense-data",
  path: "data/expenses.json",
};
const MONTHLY_LIMIT = 500000;
const RESET_DATA_VERSION = "empty-v1";

const state = {
  expenses: loadExpenses(),
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
  periodCopy: document.querySelector("#periodCopy"),
  entrySheet: document.querySelector("#entrySheet"),
  monthSheet: document.querySelector("#monthSheet"),
  settingsSheet: document.querySelector("#settingsSheet"),
  sheetEyebrow: document.querySelector("#sheetEyebrow"),
  sheetTitle: document.querySelector("#sheetTitle"),
  sheetCopy: document.querySelector("#sheetCopy"),
  rawTextField: document.querySelector("#rawTextField"),
  rawTextLabel: document.querySelector("#rawTextLabel"),
  imageField: document.querySelector("#imageField"),
  imageFieldLabel: document.querySelector("#imageFieldLabel"),
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
  monthList: document.querySelector("#monthList"),
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
  document.querySelector("#openMonthSheetButton").addEventListener("click", openMonthSheet);
  document.querySelector("#openSettingsButton").addEventListener("click", openSettingsSheet);
  document.querySelector("#parseMessageButton").addEventListener("click", handleParseMessage);
  document.querySelector("#ocrButton").addEventListener("click", handleOcr);
  document.querySelector("#saveEntryButton").addEventListener("click", saveEntry);
  document.querySelector("#resetFormButton").addEventListener("click", resetEntryForm);
  document.querySelector("#saveGithubButton").addEventListener("click", pushToGitHub);
  document.querySelector("#loadGithubButton").addEventListener("click", loadFromGitHub);

  document.querySelectorAll("[data-close-sheet]").forEach((button) => {
    button.addEventListener("click", () => closeSheet(button.dataset.closeSheet));
  });

  [elements.entrySheet, elements.monthSheet, elements.settingsSheet].forEach((sheet) => {
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) closeSheet(sheet.id);
    });
  });
}

function loadExpenses() {
  if (localStorage.getItem(`${STORAGE_KEY}-version`) !== RESET_DATA_VERSION) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}-version`, RESET_DATA_VERSION);
    return [];
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
}

function render() {
  renderHeader();
  renderTotals();
  renderMonthList();
}

function renderHeader() {
  const now = new Date();
  elements.monthLabel.textContent = `${now.getMonth() + 1}월`;
  elements.periodCopy.textContent = formatCurrentMonthPeriod(now);
}

function renderTotals() {
  const monthEntries = state.expenses.filter((item) => isCurrentMonth(item.date));
  const totals = monthEntries.reduce(
    (acc, item) => {
      acc.total += item.amount;
      if (item.person === "지은") acc.me += item.amount;
      if (item.person === "현철") acc.partner += item.amount;
      return acc;
    },
    { total: 0, me: 0, partner: 0 }
  );
  const remain = Math.max(MONTHLY_LIMIT - totals.total, 0);

  elements.monthlyTotal.textContent = currency.format(totals.total);
  elements.meTotal.textContent = currency.format(totals.me);
  elements.partnerTotal.textContent = currency.format(totals.partner);
  elements.heroSummary.textContent = `총 50만원 중 ${currency.format(remain)} 남음`;
}

function openEntrySheet(mode) {
  state.currentMode = mode;
  const config = getEntrySheetConfig(mode);
  elements.sheetEyebrow.textContent = config.eyebrow;
  elements.sheetTitle.textContent = config.title;
  elements.sheetCopy.textContent = config.copy;
  elements.rawTextField.hidden = mode !== "paste";
  elements.imageField.hidden = mode !== "image";
  elements.rawMessage.placeholder = config.placeholder;
  elements.rawTextLabel.textContent = config.rawTextLabel || "카카오톡 메시지";
  elements.imageFieldLabel.textContent = config.imageFieldLabel || "영수증 사진";
  document.querySelector("#parseMessageButton").textContent = config.parseButtonLabel || "입력하기";
  document.querySelector("#ocrButton").textContent = config.imageButtonLabel || "영수증 입력";
  elements.ocrStatus.textContent = config.imageHelperText || "영수증 내용이 자동으로 채워져요.";

  if (mode === "manual") {
    elements.rawMessage.value = "";
  }

  elements.entrySheet.hidden = false;
}

function getEntrySheetConfig(mode) {
  if (mode === "paste") {
    return {
      eyebrow: "문자 저장",
      title: "문자 붙여넣기",
      copy: "삼성카드 문자만 붙여넣어요.",
      placeholder: "예: 삼성9161승인 김*철\n5,900원 일시불\n05/05 00:13 씨유(CU)대방디엠",
      rawTextLabel: "삼성카드 메시지",
      parseButtonLabel: "문자 입력",
    };
  }

  if (mode === "image") {
    return {
      eyebrow: "영수증 저장",
      title: "영수증 입력",
      copy: "영수증 내용만 채워요.",
      placeholder: "",
      imageFieldLabel: "영수증 사진",
      imageButtonLabel: "영수증 입력",
      imageHelperText: "영수증 내용이 자동으로 채워져요.",
    };
  }

  return {
    eyebrow: "직접 저장",
    title: "직접 입력",
    copy: "금액과 가맹점을 바로 적어요.",
    placeholder: "직접 입력은 위 칸 없이 아래만 써도 돼요.",
  };
}

function openMonthSheet() {
  renderMonthList();
  elements.monthSheet.hidden = false;
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
  elements.personInput.value = "지은";
  elements.merchantInput.value = "";
  elements.amountInput.value = "";
  elements.noteInput.value = "";
  elements.ocrStatus.textContent = "영수증 내용이 자동으로 채워져요.";
  setDefaultDate();
}

function setDefaultDate() {
  elements.dateInput.value = new Date().toISOString().slice(0, 10);
}

function handleParseMessage() {
  const parsed = parseExpenseMessage(elements.rawMessage.value);
  applyParsedData(parsed);
  elements.noteInput.value = elements.noteInput.value || "문자 추출";
}

async function handleOcr() {
  const file = elements.receiptImage.files[0];
  if (!file) {
    elements.ocrStatus.textContent = "먼저 영수증 사진을 넣어 주세요.";
    return;
  }

  elements.ocrStatus.textContent = "영수증 내용을 넣는 중이에요.";

  try {
    const result = await Tesseract.recognize(file, "kor+eng");
    const text = result.data.text.trim();
    elements.rawMessage.value = text;
    elements.ocrStatus.textContent = text ? "영수증 내용이 채워졌어요." : "영수증 내용을 찾지 못했어요.";
    if (text) handleParseMessage();
  } catch (error) {
    elements.ocrStatus.textContent = "영수증 입력이 안 됐어요. 다시 시도해 주세요.";
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

function renderMonthList() {
  const grouped = state.expenses.reduce((acc, item) => {
    const key = item.date.slice(0, 7);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});

  const months = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));
  elements.monthList.innerHTML = "";

  if (!months.length) {
    elements.monthList.innerHTML = `
      <article class="month-card">
        <div class="month-head">
          <strong class="month-title">내역 없음</strong>
          <strong class="month-total">${currency.format(0)}</strong>
        </div>
      </article>
    `;
    return;
  }

  months.forEach((monthKey) => {
    const items = grouped[monthKey].sort((a, b) => (a.date < b.date ? 1 : -1));
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const card = document.createElement("article");
    card.className = "month-card";
    card.innerHTML = `
      <div class="month-head">
        <strong class="month-title">${formatMonthLabel(monthKey)}</strong>
        <strong class="month-total">${currency.format(total)}</strong>
      </div>
      ${items
        .map(
          (item) => `
            <div class="month-item">
              <div>
                <div class="month-store">${escapeHtml(item.merchant)}</div>
                <div class="month-meta">${escapeHtml(item.person)} · ${formatDayLabel(item.date)}</div>
              </div>
              <div>
                <div class="month-total">${currency.format(item.amount)}</div>
                <div class="month-amount">${escapeHtml(item.note || "")}</div>
              </div>
            </div>
          `
        )
        .join("")}
    `;
    elements.monthList.append(card);
  });
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

  const samsungParsed = parseSamsungCardMessage(lines, text);
  if (samsungParsed) {
    return samsungParsed;
  }

  const amountMatch = text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : "";

  const date =
    parseDate(text, /(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})/) ||
    parseDate(text, /(\d{1,2})[\/.-]\s*(\d{1,2})/) ||
    parseDate(text, /(\d{1,2})월\s*(\d{1,2})일/) ||
    new Date().toISOString().slice(0, 10);

  const person = detectPerson(text);
  const merchant = extractMerchant(lines, text, amountMatch?.[0]);

  return {
    person,
    date,
    merchant,
    amount,
    note: /일시불/.test(text) ? "일시불" : "",
  };
}

function parseSamsungCardMessage(lines, text) {
  if (!/삼성\d{4}승인/.test(text)) return null;

  const ownerLine = lines.find((line) => /삼성\d{4}승인/.test(line)) || "";
  const amountLine = lines.find((line) => /원/.test(line)) || "";
  const merchantLine = lines.find((line) => /\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}/.test(line)) || "";

  const amountMatch = amountLine.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : "";

  const date = parseDate(merchantLine || text, /(\d{1,2})[\/.-]\s*(\d{1,2})/) || new Date().toISOString().slice(0, 10);
  const merchant = merchantLine
    .replace(/^\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\s*/, "")
    .trim() || "가맹점 미확인";

  return {
    person: detectPerson(ownerLine || text),
    date,
    merchant,
    amount,
    note: /일시불/.test(amountLine) ? "일시불" : "",
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

function detectPerson(text) {
  if (/현철|김\*?철|[가-힣]\*철/.test(text)) return "현철";
  if (/지은|이\*?은|[가-힣]\*은/.test(text)) return "지은";
  return "지은";
}

function isCurrentMonth(dateString) {
  const today = new Date();
  const date = new Date(`${dateString}T00:00:00`);
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${Number(year)}.${Number(month)}`;
}

function formatDayLabel(dateString) {
  const [, month, day] = dateString.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatCurrentMonthPeriod(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return `${formatDateDot(start)} - ${formatDateDot(end)}`;
}

function formatDateDot(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
