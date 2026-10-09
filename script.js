const DEFAULT_HOME = 'https://www.google.com';
const STORAGE_KEYS = {
  bookmarks: 'mini-browser-bookmarks',
  history: 'mini-browser-history',
};

const state = {
  bookmarks: loadFromStorage(STORAGE_KEYS.bookmarks, [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'YouTube', url: 'https://www.youtube.com' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  ]),
  history: loadFromStorage(STORAGE_KEYS.history, []),
  currentUrl: DEFAULT_HOME,
};

const browserFrame = document.getElementById('browserFrame');
const addressBar = document.getElementById('addressBar');
const bookmarkList = document.getElementById('bookmarkList');
const bookmarkDetailList = document.getElementById('bookmarkDetailList');
const historyList = document.getElementById('historyList');
const savedPagesCount = document.getElementById('savedPagesCount');
const blockedMessage = document.getElementById('blockedMessage');

const navButtons = document.querySelectorAll('.nav-button');
const viewPanels = {
  home: document.getElementById('homeView'),
  bookmarks: document.getElementById('bookmarksView'),
  history: document.getElementById('historyView'),
};

function loadFromStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeUrl(value) {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return `https://${trimmed}`;
}

function getDomainLabel(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return 'site';
  }
}

function renderBookmarks() {
  const items = state.bookmarks.slice(0, 5);
  bookmarkList.innerHTML = items
    .map(
      (item) => `
        <div class="bookmark-item">
          <div class="bookmark-name">
            <span class="bookmark-favicon">${getDomainLabel(item.url).slice(0, 1).toUpperCase()}</span>
            <a class="bookmark-link" href="${item.url}" target="_blank" rel="noreferrer">${item.name}</a>
          </div>
          <button class="secondary-button small" data-url="${item.url}" data-action="open-bookmark">Open</button>
        </div>
      `
    )
    .join('');

  bookmarkDetailList.innerHTML = state.bookmarks.length
    ? state.bookmarks
        .map(
          (item) => `
            <div class="detail-item">
              <div class="bookmark-name">
                <span class="bookmark-favicon">${getDomainLabel(item.url).slice(0, 1).toUpperCase()}</span>
                <div>
                  <div>${item.name}</div>
                  <small style="color: var(--muted);">${item.url}</small>
                </div>
              </div>
              <div>
                <button class="primary-button small" data-url="${item.url}" data-action="open-bookmark">Open</button>
              </div>
            </div>
          `
        )
        .join('')
    : '<div class="empty-state">No bookmarks yet.</div>';

  savedPagesCount.textContent = String(state.bookmarks.length);
}

function renderHistory() {
  if (!state.history.length) {
    historyList.innerHTML = '<div class="empty-state">No browsing history yet.</div>';
    return;
  }

  historyList.innerHTML = state.history
    .slice()
    .reverse()
    .map(
      (item) => `
        <div class="history-item">
          <div>
            <strong>${item.label}</strong>
            <div style="color: var(--muted); font-size: 0.8rem; margin-top: 4px;">${item.url}</div>
          </div>
          <button class="secondary-button small" data-url="${item.url}" data-action="open-bookmark">Visit</button>
        </div>
      `
    )
    .join('');
}

function addHistoryEntry(url) {
  const label = getDomainLabel(url);
  const exists = state.history.some((item) => item.url === url);

  if (exists) {
    return;
  }

  state.history.push({ url, label });
  if (state.history.length > 15) {
    state.history = state.history.slice(-15);
  }
  saveToStorage(STORAGE_KEYS.history, state.history);
  renderHistory();
}

function selectView(name) {
  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === name);
  });

  Object.entries(viewPanels).forEach(([key, panel]) => {
    panel.classList.toggle('active', key === name);
  });
}

function loadPage(url) {
  const safeUrl = normalizeUrl(url);
  if (!safeUrl) {
    return;
  }

  state.currentUrl = safeUrl;
  addressBar.value = safeUrl;
  browserFrame.src = safeUrl;
  blockedMessage.classList.add('hidden');
  addHistoryEntry(safeUrl);
}

function addCurrentPageBookmark() {
  const url = state.currentUrl || DEFAULT_HOME;
  const name = getDomainLabel(url);

  const exists = state.bookmarks.some((item) => item.url === url);
  if (!exists) {
    state.bookmarks.push({ name, url });
    saveToStorage(STORAGE_KEYS.bookmarks, state.bookmarks);
    renderBookmarks();
  }
}

function handleOpenBookmark(url) {
  loadPage(url);
  selectView('home');
}

browserFrame.addEventListener('load', () => {
  const url = browserFrame.src;
  if (!url) return;

  const normalized = normalizeUrl(url.replace(/^about:blank$/, ''));
  if (normalized) {
    addressBar.value = normalized;
  }
});

browserFrame.addEventListener('error', () => {
  blockedMessage.classList.remove('hidden');
});

addressBar.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    loadPage(addressBar.value);
    selectView('home');
  }
});

document.getElementById('goBtn').addEventListener('click', () => {
  loadPage(addressBar.value);
  selectView('home');
});

document.getElementById('homeBtn').addEventListener('click', () => {
  loadPage(DEFAULT_HOME);
  selectView('home');
});

document.getElementById('backBtn').addEventListener('click', () => {
  browserFrame.contentWindow?.history.back();
});

document.getElementById('forwardBtn').addEventListener('click', () => {
  browserFrame.contentWindow?.history.forward();
});

document.getElementById('refreshBtn').addEventListener('click', () => {
  browserFrame.contentWindow?.location.reload();
});

document.getElementById('addBookmarkBtn').addEventListener('click', addCurrentPageBookmark);

document.querySelectorAll('[data-home-url]').forEach((button) => {
  button.addEventListener('click', () => {
    loadPage(button.dataset.homeUrl);
    selectView('home');
  });
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectView(button.dataset.view);
  });
});

document.addEventListener('click', (event) => {
  const openButton = event.target.closest('[data-action="open-bookmark"]');
  if (openButton) {
    handleOpenBookmark(openButton.dataset.url);
  }
});

renderBookmarks();
renderHistory();
addressBar.value = DEFAULT_HOME;
loadPage(DEFAULT_HOME);
selectView('home');
