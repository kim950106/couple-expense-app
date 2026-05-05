const STORAGE_KEY = "couple-expenses-v1";
const SETTINGS_KEY = "couple-expenses-github-settings-v1";
const DEVICE_TOKEN_KEY = "couple-expenses-github-token-v2";
const DEVICE_PASSPHRASE_KEY = "couple-expenses-passphrase-v2";
const DEFAULT_GITHUB_SETTINGS = {
  owner: "kim950106",
  repo: "couple-expense-data",
  path: "data/expenses.json",
};
const MONTHLY_LIMIT = 500000;
const RESET_DATA_VERSION = "empty-v1";
const APP_PIN = "0311";
const SETTINGS_ACCESS_KEY = "K7m2Qx9Vn4Lp8Rz3";
const AUTO_REFRESH_MS = 60_000;

const state = {
  expenses: loadExpenses(),
  currentMode: "paste",
  pinValue: "",
  autoRefreshTimer: null,
  monthViewMode: "list",
  selectedMonthKey: getCurrentMonthKey(),
  dayDetailDate: "",
  dayDetailKind: "expense",
};

const currency = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const elements = {
  lockScreen: document.querySelector("#lockScreen"),
  appShell: document.querySelector("#appShell"),
  pinForm: document.querySelector("#pinForm"),
  pinError: document.querySelector("#pinError"),
  pinDots: document.querySelector("#pinDots"),
  pinClearButton: document.querySelector("#pinClearButton"),
  monthLabel: document.querySelector("#monthLabel"),
  monthlyTotal: document.querySelector("#monthlyTotal"),
  meTotal: document.querySelector("#meTotal"),
  partnerTotal: document.querySelector("#partnerTotal"),
  heroSummary: document.querySelector("#heroSummary"),
  periodCopy: document.querySelector("#periodCopy"),
  syncCopy: document.querySelector("#syncCopy"),
  entrySheet: document.querySelector("#entrySheet"),
  settingsAccessSheet: document.querySelector("#settingsAccessSheet"),
  settingsSheet: document.querySelector("#settingsSheet"),
  monthSheet: document.querySelector("#monthSheet"),
  dayDetailSheet: document.querySelector("#dayDetailSheet"),
  monthListViewButton: document.querySelector("#monthListViewButton"),
  monthCalendarViewButton: document.querySelector("#monthCalendarViewButton"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  monthNavLabel: document.querySelector("#monthNavLabel"),
  settingsAccessInput: document.querySelector("#settingsAccessInput"),
  settingsAccessError: document.querySelector("#settingsAccessError"),
  openSettingsConfirmButton: document.querySelector("#openSettingsConfirmButton"),
  sheetEyebrow: document.querySelector("#sheetEyebrow"),
  sheetTitle: document.querySelector("#sheetTitle"),
  sheetCopy: document.querySelector("#sheetCopy"),
  rawTextField: document.querySelector("#rawTextField"),
  rawTextLabel: document.querySelector("#rawTextLabel"),
  rawMessage: document.querySelector("#rawMessage"),
  personInput: document.querySelector("#personInput"),
  dateInput: document.querySelector("#dateInput"),
  dateLabel: document.querySelector("#dateLabel"),
  scheduleDateGrid: document.querySelector("#scheduleDateGrid"),
  scheduleStartInput: document.querySelector("#scheduleStartInput"),
  scheduleEndInput: document.querySelector("#scheduleEndInput"),
  entryMainGrid: document.querySelector("#entryMainGrid"),
  merchantLabel: document.querySelector("#merchantLabel"),
  merchantInput: document.querySelector("#merchantInput"),
  amountField: document.querySelector("#amountField"),
  amountInput: document.querySelector("#amountInput"),
  noteInput: document.querySelector("#noteInput"),
  githubOwner: document.querySelector("#githubOwner"),
  githubRepo: document.querySelector("#githubRepo"),
  githubPath: document.querySelector("#githubPath"),
  githubToken: document.querySelector("#githubToken"),
  syncPassphrase: document.querySelector("#syncPassphrase"),
  monthList: document.querySelector("#monthList"),
  monthCalendar: document.querySelector("#monthCalendar"),
  dayDetailTitle: document.querySelector("#dayDetailTitle"),
  dayDetailSummary: document.querySelector("#dayDetailSummary"),
  dayDetailList: document.querySelector("#dayDetailList"),
  clearGithubTokenButton: document.querySelector("#clearGithubTokenButton"),
  refreshNowButton: document.querySelector("#refreshNowButton"),
  pushNowButton: document.querySelector("#pushNowButton"),
};

bindEvents();
hydrateSettings();
setDefaultDate();
render();

function bindEvents() {
  elements.pinForm.addEventListener("submit", handlePinSubmit);
  document.querySelectorAll("[data-pin-key]").forEach((button) => {
    button.addEventListener("click", () => handlePinKey(button.dataset.pinKey));
  });
  elements.pinClearButton.addEventListener("click", clearPinValue);
  document.querySelector("#openPasteButton").addEventListener("click", () => openEntrySheet("paste"));
  document.querySelector("#openScheduleButton").addEventListener("click", () => openEntrySheet("schedule"));
  document.querySelector("#openManualButton").addEventListener("click", () => openEntrySheet("manual"));
  document.querySelector("#openAddButton").addEventListener("click", () => openEntrySheet("manual"));
  document.querySelector("#openMonthListButton").addEventListener("click", () => openMonthSheet("list"));
  document.querySelector("#openMonthCalendarButton").addEventListener("click", () => openMonthSheet("calendar"));
  elements.pushNowButton.addEventListener("click", pushToGitHub);
  elements.monthListViewButton.addEventListener("click", () => setMonthViewMode("list"));
  elements.monthCalendarViewButton.addEventListener("click", () => setMonthViewMode("calendar"));
  elements.prevMonthButton.addEventListener("click", () => moveSelectedMonth(-1));
  elements.nextMonthButton.addEventListener("click", () => moveSelectedMonth(1));
  elements.refreshNowButton.addEventListener("click", refreshNow);
  document.querySelector("#openSettingsButton").addEventListener("click", openSettingsAccessSheet);
  elements.openSettingsConfirmButton.addEventListener("click", handleSettingsAccess);
  elements.settingsAccessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSettingsAccess();
    }
  });
  document.querySelector("#parseMessageButton").addEventListener("click", handleParseMessage);
  document.querySelector("#saveEntryButton").addEventListener("click", saveEntry);
  document.querySelector("#resetFormButton").addEventListener("click", resetEntryForm);
  document.querySelector("#saveGithubButton").addEventListener("click", pushToGitHub);
  document.querySelector("#loadGithubButton").addEventListener("click", loadFromGitHub);
  elements.clearGithubTokenButton.addEventListener("click", clearGithubToken);
  elements.monthList.addEventListener("click", handleMonthListClick);
  elements.monthCalendar.addEventListener("click", handleMonthCalendarClick);
  elements.dayDetailList.addEventListener("click", handleMonthListClick);

  document.querySelectorAll("[data-close-sheet]").forEach((button) => {
    button.addEventListener("click", () => closeSheet(button.dataset.closeSheet));
  });

  [elements.entrySheet, elements.settingsAccessSheet, elements.settingsSheet, elements.monthSheet, elements.dayDetailSheet].forEach((sheet) => {
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) closeSheet(sheet.id);
    });
  });
}

function handlePinSubmit(event) {
  event.preventDefault();
  if (state.pinValue !== APP_PIN) {
    elements.pinError.hidden = false;
    resetPinValue();
    return;
  }

  elements.pinError.hidden = true;
  elements.lockScreen.hidden = true;
  elements.appShell.hidden = false;
  startAutoRefresh();
  void loadFromGitHub({ silent: true, closeOnSuccess: false, updateStatus: true });
}

function handlePinKey(value) {
  if (state.pinValue.length >= 4) return;
  state.pinValue += value;
  elements.pinError.hidden = true;
  renderPinDots();
  if (state.pinValue.length === 4) {
    handlePinSubmit(new Event("submit"));
  }
}

function clearPinValue() {
  state.pinValue = state.pinValue.slice(0, -1);
  renderPinDots();
}

function resetPinValue() {
  state.pinValue = "";
  renderPinDots();
}

function renderPinDots() {
  const dots = elements.pinDots.querySelectorAll(".pin-dot");
  dots.forEach((dot, index) => {
    dot.classList.toggle("filled", index < state.pinValue.length);
  });
}

function openSettingsAccessSheet() {
  elements.settingsAccessInput.value = "";
  elements.settingsAccessError.hidden = true;
  elements.settingsAccessSheet.hidden = false;
}

function handleSettingsAccess() {
  if (elements.settingsAccessInput.value.trim() !== SETTINGS_ACCESS_KEY) {
    elements.settingsAccessError.hidden = false;
    elements.settingsAccessInput.value = "";
    return;
  }

  elements.settingsAccessError.hidden = true;
  closeSheet("settingsAccessSheet");
  openSettingsSheet();
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
  renderMonthSheetContent();
  renderSyncState();
}

function renderHeader() {
  const now = new Date();
  elements.monthLabel.textContent = `${now.getMonth() + 1}월`;
  elements.periodCopy.textContent = formatCurrentMonthPeriod(now);
}

function renderTotals() {
  const monthEntries = state.expenses.filter((item) => isExpense(item) && isCurrentMonth(item.date));
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
  elements.scheduleDateGrid.hidden = mode !== "schedule";
  elements.amountField.hidden = mode === "schedule";
  elements.dateInput.parentElement.hidden = mode === "schedule";
  elements.rawMessage.placeholder = config.placeholder;
  elements.rawTextLabel.textContent = config.rawTextLabel || "카카오톡 메시지";
  elements.dateLabel.textContent = config.dateLabel || "결제일";
  elements.merchantLabel.textContent = config.merchantLabel || "가맹점";
  elements.merchantInput.placeholder = config.merchantPlaceholder || "예: 스타벅스 성수";
  document.querySelector("#parseMessageButton").textContent = config.parseButtonLabel || "입력하기";

  if (mode === "manual" || mode === "schedule") {
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

  if (mode === "schedule") {
    return {
      eyebrow: "일정 저장",
      title: "일정 입력",
      copy: "장소와 기간만 적어요.",
      placeholder: "",
      merchantLabel: "장소",
      merchantPlaceholder: "예: 성수 팝업스토어",
    };
  }

  return {
    eyebrow: "직접 저장",
    title: "직접 입력",
    copy: "금액과 가맹점을 바로 적어요.",
    placeholder: "직접 입력은 위 칸 없이 아래만 써도 돼요.",
  };
}

function openMonthSheet(mode = state.monthViewMode) {
  state.monthViewMode = mode;
  if (!state.selectedMonthKey) {
    state.selectedMonthKey = getCurrentMonthKey();
  }
  renderMonthSheetContent();
  elements.monthSheet.hidden = false;
}

function setMonthViewMode(mode) {
  state.monthViewMode = mode;
  renderMonthSheetContent();
}

function renderMonthSheetContent() {
  renderMonthViewSwitch();
  renderMonthNav();
  renderMonthList();
  renderMonthCalendar();
}

function renderMonthViewSwitch() {
  const isList = state.monthViewMode === "list";
  elements.monthList.hidden = !isList;
  elements.monthCalendar.hidden = isList;
  elements.monthListViewButton.classList.toggle("active", isList);
  elements.monthCalendarViewButton.classList.toggle("active", !isList);
}

function renderMonthNav() {
  elements.monthNavLabel.textContent = formatMonthNavLabel(state.selectedMonthKey);
}

function moveSelectedMonth(offset) {
  state.selectedMonthKey = shiftMonthKey(state.selectedMonthKey, offset);
  renderMonthSheetContent();
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
  elements.personInput.value = "지은";
  elements.merchantInput.value = "";
  elements.amountInput.value = "";
  elements.noteInput.value = "";
  setDefaultDate();
}

function setDefaultDate() {
  const today = todayLocal();
  elements.dateInput.value = today;
  elements.scheduleStartInput.value = today;
  elements.scheduleEndInput.value = today;
}

function handleParseMessage() {
  const parsed = parseExpenseMessage(elements.rawMessage.value);
  applyParsedData(parsed);
  elements.noteInput.value = elements.noteInput.value || "문자 추출";
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
  let entry;

  if (state.currentMode === "schedule") {
    const startDate = elements.scheduleStartInput.value || todayLocal();
    const endDate = elements.scheduleEndInput.value || startDate;
    if (!merchant) {
      alert("장소는 꼭 입력해 주세요.");
      return;
    }
    if (endDate < startDate) {
      alert("기간을 다시 확인해 주세요.");
      return;
    }
    entry = {
      id: crypto.randomUUID(),
      type: "schedule",
      person: elements.personInput.value,
      place: merchant,
      startDate,
      endDate,
      note: elements.noteInput.value.trim(),
      createdAt: new Date().toISOString(),
    };
  } else {
    const amount = Number(elements.amountInput.value);
    if (!merchant || !amount) {
      alert("가맹점과 금액은 꼭 입력해 주세요.");
      return;
    }
    entry = {
      id: crypto.randomUUID(),
      type: "expense",
      person: elements.personInput.value,
      date: elements.dateInput.value || todayLocal(),
      merchant,
      amount,
      note: elements.noteInput.value.trim(),
      rawText: elements.rawMessage.value.trim(),
      createdAt: new Date().toISOString(),
    };
  }

  state.expenses = [entry, ...state.expenses];
  persistExpenses();
  render();
  closeSheet("entrySheet");
  resetEntryForm();
}

function renderMonthList() {
  const monthKey = state.selectedMonthKey;
  const items = state.expenses
    .filter((item) => isExpense(item) && item.date.startsWith(monthKey))
    .sort((a, b) => (a.date < b.date ? 1 : -1) || (a.createdAt < b.createdAt ? 1 : -1));
  elements.monthList.innerHTML = "";

  if (!items.length) {
    elements.monthList.innerHTML = `
      <article class="month-card">
        <div class="month-head">
          <strong class="month-title">${formatMonthLabel(monthKey)}</strong>
          <strong class="month-total">${currency.format(0)}</strong>
        </div>
        <div class="month-meta">내역 없음</div>
      </article>
    `;
    return;
  }

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
            <div class="month-item-side">
              <div class="month-total">${currency.format(item.amount)}</div>
              <div class="month-amount">${escapeHtml(item.note || "")}</div>
              <button class="month-cancel" type="button" data-expense-id="${escapeHtml(item.id)}">취소</button>
            </div>
          </div>
        `
      )
      .join("")}
  `;
  elements.monthList.append(card);
}

function renderMonthCalendar() {
  const [yearText, monthText] = state.selectedMonthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const monthKey = state.selectedMonthKey;
  const expenseItems = state.expenses.filter((item) => isExpense(item) && item.date.startsWith(monthKey));
  const scheduleItems = state.expenses.filter((item) => isSchedule(item) && isScheduleInMonth(item, year, month));
  const expenseByDate = expenseItems.reduce((acc, item) => {
    acc[item.date] ??= [];
    acc[item.date].push(item);
    return acc;
  }, {});
  const scheduleByDate = {};
  scheduleItems.forEach((item) => {
    getDatesInRange(item.startDate, item.endDate).forEach((dateKey) => {
      if (!dateKey.startsWith(monthKey)) return;
      scheduleByDate[dateKey] ??= [];
      scheduleByDate[dateKey].push(item);
    });
  });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push('<div class="calendar-cell empty" aria-hidden="true"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    const expenseItemsForDay = expenseByDate[dateKey] || [];
    const scheduleItemsForDay = scheduleByDate[dateKey] || [];
    const expenseTotal = expenseItemsForDay.reduce((sum, item) => sum + item.amount, 0);
    const hasExpense = expenseItemsForDay.length > 0;
    const hasSchedule = scheduleItemsForDay.length > 0;
    const stateClass = hasExpense && hasSchedule ? " split" : hasExpense ? " expense-only" : hasSchedule ? " schedule-only" : "";
    let body = "";

    if (hasExpense && hasSchedule) {
      body = `
        <button class="calendar-layer expense half" type="button" data-calendar-date="${dateKey}" data-calendar-kind="expense">
          <span class="calendar-sum">${formatCompactCurrency(expenseTotal)}</span>
        </button>
        <button class="calendar-layer schedule half" type="button" data-calendar-date="${dateKey}" data-calendar-kind="schedule">
          <span class="calendar-schedule-label">${escapeHtml(getSchedulePreview(scheduleItemsForDay[0], true))}</span>
        </button>
      `;
    } else if (hasExpense) {
      body = `
        <button class="calendar-layer expense full" type="button" data-calendar-date="${dateKey}" data-calendar-kind="expense">
          <span class="calendar-sum">${formatCompactCurrency(expenseTotal)}</span>
        </button>
      `;
    } else if (hasSchedule) {
      body = `
        <button class="calendar-layer schedule full" type="button" data-calendar-date="${dateKey}" data-calendar-kind="schedule">
          <span class="calendar-schedule-label">${escapeHtml(getSchedulePreview(scheduleItemsForDay[0], false))}</span>
        </button>
      `;
    }

    cells.push(`
      <div class="calendar-cell${stateClass}${hasExpense || hasSchedule ? " active" : ""}">
        <div class="calendar-day">${day}</div>
        <div class="calendar-body">
          ${body}
        </div>
      </div>
    `);
  }

  elements.monthCalendar.innerHTML = `
    <article class="calendar-card">
      <div class="calendar-head">
        <strong class="month-title">${formatMonthLabel(monthKey)}</strong>
        <strong class="month-total">${currency.format(expenseItems.reduce((sum, item) => sum + item.amount, 0))}</strong>
      </div>
      <div class="calendar-weekdays">
        ${["일", "월", "화", "수", "목", "금", "토"]
          .map((label) => `<span>${label}</span>`)
          .join("")}
      </div>
      <div class="calendar-grid">
        ${cells.join("")}
      </div>
      ${expenseItems.length || scheduleItems.length ? "" : '<div class="month-meta calendar-empty-copy">이 달에는 저장된 내역이 없어요.</div>'}
    </article>
  `;
}

function handleMonthCalendarClick(event) {
  const target = event.target.closest("[data-calendar-date][data-calendar-kind]");
  if (!target) return;

  openDayDetailSheet(target.dataset.calendarDate, target.dataset.calendarKind);
}

function openDayDetailSheet(dateKey, kind = "expense") {
  state.dayDetailDate = dateKey;
  state.dayDetailKind = kind;
  const items = state.expenses
    .filter((item) => (kind === "schedule" ? isScheduleOnDate(item, dateKey) : isExpense(item) && item.date === dateKey))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  elements.dayDetailTitle.textContent = kind === "schedule" ? `${formatDateLabel(dateKey)} 일정` : formatDateLabel(dateKey);
  elements.dayDetailSummary.textContent =
    kind === "schedule"
      ? `${items.length}건`
      : `${currency.format(items.reduce((sum, item) => sum + item.amount, 0))} · ${items.length}건`;

  if (!items.length) {
    elements.dayDetailList.innerHTML = `
      <article class="month-card">
        <div class="month-head">
          <strong class="month-title">내역 없음</strong>
          <strong class="month-total">${currency.format(0)}</strong>
        </div>
      </article>
    `;
  } else {
    elements.dayDetailList.innerHTML = items
      .map(
        (item) => `
          <article class="day-detail-item">
            <div>
              <div class="month-store">${escapeHtml(kind === "schedule" ? `장소 · ${item.place}` : item.merchant)}</div>
              <div class="month-meta">${
                kind === "schedule"
                  ? `${escapeHtml(item.person)} · ${formatDateLabel(item.startDate)} - ${formatDateLabel(item.endDate)}`
                  : `${escapeHtml(item.person)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}`
              }</div>
            </div>
            <div class="day-detail-side">
              <div class="month-total">${kind === "schedule" ? `메모 · ${escapeHtml(item.note || "-")}` : currency.format(item.amount)}</div>
              <button class="month-cancel" type="button" data-expense-id="${escapeHtml(item.id)}">${kind === "schedule" ? "삭제" : "취소"}</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  elements.dayDetailSheet.hidden = false;
}

function hydrateSettings() {
  const settings = loadSettings();
  elements.githubOwner.value = settings.owner || "";
  elements.githubRepo.value = settings.repo || "";
  elements.githubPath.value = settings.path || "data/expenses.json";
  elements.githubToken.value = localStorage.getItem(DEVICE_TOKEN_KEY) || "";
  elements.syncPassphrase.value = localStorage.getItem(DEVICE_PASSPHRASE_KEY) || "";
}

function clearGithubToken() {
  localStorage.removeItem(DEVICE_TOKEN_KEY);
  localStorage.removeItem(DEVICE_PASSPHRASE_KEY);
  elements.githubToken.value = "";
  elements.syncPassphrase.value = "";
  alert("이 디바이스의 연결 정보를 지웠어요.");
  renderSyncState();
}

function handleMonthListClick(event) {
  const button = event.target.closest("[data-expense-id]");
  if (!button) return;

  removeExpenseById(button.dataset.expenseId);
}

function removeExpenseById(expenseId) {
  const target = state.expenses.find((item) => item.id === expenseId);
  if (!target) {
    alert("이미 지워진 내역이에요.");
    return;
  }

  const itemLabel = isSchedule(target)
    ? `${target.place} 일정`
    : `${target.merchant} ${currency.format(target.amount)}`;
  const confirmed = window.confirm(`${itemLabel} ${isSchedule(target) ? "일정을 삭제할까요?" : "내역을 취소할까요?"}`);
  if (!confirmed) return;

  state.expenses = state.expenses.filter((item) => item.id !== expenseId);
  persistExpenses();
  render();
  if (!elements.dayDetailSheet.hidden && state.dayDetailDate) {
    openDayDetailSheet(state.dayDetailDate, state.dayDetailKind);
  }
  alert(`${isSchedule(target) ? "일정을 삭제했어요." : "내역을 취소했어요."} GitHub에 저장한 내용이면 다시 저장해야 반영돼요.`);
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
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  const passphrase = elements.syncPassphrase.value.trim();
  if (passphrase) {
    localStorage.setItem(DEVICE_PASSPHRASE_KEY, passphrase);
  }
  renderSyncState();
  return settings;
}

async function loadFromGitHub(options = {}) {
  const { silent = false, closeOnSuccess = true, updateStatus = false } = options;
  const settings = saveSettings();
  const token = localStorage.getItem(DEVICE_TOKEN_KEY) || elements.githubToken.value.trim();
  const passphrase = localStorage.getItem(DEVICE_PASSPHRASE_KEY) || elements.syncPassphrase.value.trim();
  if (!isGitHubConfigured(settings, token)) {
    if (!silent) alert("Owner, Repo, Path, Token을 모두 입력해 주세요.");
    if (updateStatus) {
      elements.syncCopy.textContent = "토큰 입력 후 새로고침";
    }
    return false;
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
    if (closeOnSuccess) closeSheet("settingsSheet");
    if (updateStatus) {
      elements.syncCopy.textContent = `${formatSyncTime(new Date())} 새로고침`;
    }
    if (!silent) alert("GitHub에서 내역을 불러왔어요.");
    return true;
  } catch (error) {
    console.error(error);
    if (updateStatus) {
      elements.syncCopy.textContent = "새로고침 실패";
    }
    if (!silent) alert("GitHub에서 불러오지 못했어요. 저장소와 토큰 권한을 확인해 주세요.");
    return false;
  }
}

async function pushToGitHub() {
  const settings = saveSettings();
  const token = localStorage.getItem(DEVICE_TOKEN_KEY) || elements.githubToken.value.trim();
  const passphrase = localStorage.getItem(DEVICE_PASSPHRASE_KEY) || elements.syncPassphrase.value.trim();
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

    closeSheet("settingsSheet");
    elements.syncCopy.textContent = `${formatSyncTime(new Date())} 저장됨`;
    alert("GitHub private repo로 저장했어요.");
  } catch (error) {
    console.error(error);
    alert("GitHub 저장에 실패했어요. repo 이름, path, token 권한을 다시 확인해 주세요.");
  }
}

function refreshNow() {
  void loadFromGitHub({ silent: false, closeOnSuccess: false, updateStatus: true });
}

function startAutoRefresh() {
  if (state.autoRefreshTimer) return;

  state.autoRefreshTimer = window.setInterval(() => {
    if (elements.appShell.hidden) return;
    const settings = loadSettings();
    const token = localStorage.getItem(DEVICE_TOKEN_KEY);
    const passphrase = localStorage.getItem(DEVICE_PASSPHRASE_KEY);
    if (!isGitHubConfigured(settings, token) || !passphrase) return;
    void loadFromGitHub({ silent: true, closeOnSuccess: false, updateStatus: true });
  }, AUTO_REFRESH_MS);
}

function renderSyncState() {
  const token = localStorage.getItem(DEVICE_TOKEN_KEY);
  const passphrase = localStorage.getItem(DEVICE_PASSPHRASE_KEY);
  elements.syncCopy.textContent = token && passphrase ? "1분마다 자동 새로고침" : "수동 새로고침 가능";
}

function formatSyncTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateLabel(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${year}.${month}.${day}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(monthKey, offset) {
  const [yearText, monthText] = monthKey.split("-");
  const moved = new Date(Number(yearText), Number(monthText) - 1 + offset, 1);
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthNavLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${Number(month)}월`;
}

function getSchedulePreview(item, hasExpense) {
  if (hasExpense) {
    return item.note || item.place || "일정";
  }

  return item.note || item.place || "일정";
}

function isExpense(item) {
  return (item.type || "expense") === "expense";
}

function isSchedule(item) {
  return item.type === "schedule";
}

function isScheduleOnDate(item, dateKey) {
  return isSchedule(item) && item.startDate <= dateKey && item.endDate >= dateKey;
}

function isScheduleInMonth(item, year, monthIndex) {
  if (!isSchedule(item)) return false;
  const monthStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, "0")}`;
  return item.startDate <= monthEnd && item.endDate >= monthStart;
}

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  while (cursor <= end) {
    dates.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLocal() {
  return formatLocalDate(new Date());
}

function formatCompactCurrency(value) {
  if (value >= 10000) {
    const amount = Math.round((value / 10000) * 10) / 10;
    return `${amount}만`;
  }

  if (value >= 1000) {
    return `${Math.round(value / 1000)}천`;
  }

  return `${value}`;
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
    todayLocal();

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

  const date = parseDate(merchantLine || text, /(\d{1,2})[\/.-]\s*(\d{1,2})/) || todayLocal();
  const merchant = merchantLine.replace(/^\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\s*/, "").trim() || "가맹점 미확인";

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
  const ignoreWords = ["카드", "승인", "결제", "사용", "일시불", "할부", "누적", "잔액", "원", "krw", "카카오", "알림"];
  const candidates = [...lines, ...text.split(/ {2,}/)].map((value) => value.trim());

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
