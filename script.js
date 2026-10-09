const STORAGE_KEYS = {
  tabs: 'browser-tabs-v2',
  theme: 'browser-theme-v2',
  searchEngine: 'browser-search-engine-v2',
};

const SEARCH_ENGINES = {
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadFromStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSiteName(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return 'New tab';
  }
}

function isLikelySearchQuery(value) {
  if (!value || value.trim() === '') return false;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return false;
  return true;
}

function normalizeUrl(rawValue, engine = state.searchEngine) {
  const value = rawValue.trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/^www\./i.test(value)) {
    return `https://${value}`;
  }

  if (/^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?$/i.test(value)) {
    return `http://${value}`;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) {
    return `https://${value}`;
  }

  if (SEARCH_ENGINES[engine]) {
    return `${SEARCH_ENGINES[engine]}${encodeURIComponent(value)}`;
  }

  return `https://${value}`;
}

function getDisplayTitleForUrl(url) {
  if (!url) return 'New tab';
  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^www\./i, '');
  return hostname || 'New tab';
}

const state = {
  tabs: loadFromStorage(STORAGE_KEYS.tabs, [
    { id: uid(), title: 'Google', url: 'https://www.google.com' },
  ]),
  activeTabId: null,
  theme: loadFromStorage(STORAGE_KEYS.theme, 'dark'),
  searchEngine: loadFromStorage(STORAGE_KEYS.searchEngine, 'google'),
};

const tabsBar = document.getElementById('tabsBar');
const browserFrame = document.getElementById('browserFrame');
const addressBar = document.getElementById('addressBar');
const searchEngineSelect = document.getElementById('searchEngineSelect');
const blockedMessage = document.getElementById('blockedMessage');
const themeToggle = document.getElementById('themeToggle');

function getActiveTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0];
}

function renderTabs() {
  tabsBar.innerHTML = state.tabs
    .map(
      (tab) => `
        <button class="tab ${tab.id === state.activeTabId ? 'active' : ''}" data-tab-id="${tab.id}" type="button">
          <span class="tab-title">${tab.title}</span>
          <span class="tab-close" data-close-tab="${tab.id}" aria-label="Close tab">×</span>
        </button>
      `
    )
    .join('');
}

function updateTheme() {
  document.body.dataset.theme = state.theme;
  themeToggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  saveToStorage(STORAGE_KEYS.theme, state.theme);
}

function ensureActiveTab() {
  if (!state.tabs.length) {
    const newTab = { id: uid(), title: 'Google', url: 'https://www.google.com' };
    state.tabs.push(newTab);
  }

  if (!state.activeTabId || !state.tabs.some((tab) => tab.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0].id;
  }
}

function updateAddressBar() {
  const activeTab = getActiveTab();
  if (activeTab) {
    addressBar.value = activeTab.url || '';
  }
}

function saveTabs() {
  saveToStorage(STORAGE_KEYS.tabs, state.tabs);
}

function createTab(url = 'https://www.google.com', title = 'Google') {
  const newTab = {
    id: uid(),
    title,
    url,
  };

  state.tabs.push(newTab);
  state.activeTabId = newTab.id;
  saveTabs();
  renderTabs();
  loadTab(newTab.id, url);
}

function closeTab(tabId) {
  if (state.tabs.length === 1) {
    return;
  }

  state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
  if (state.activeTabId === tabId) {
    state.activeTabId = state.tabs[state.tabs.length - 1].id;
  }

  saveTabs();
  renderTabs();
  loadTab(state.activeTabId);
}

function loadTab(tabId, overrideUrl) {
  const tab = state.tabs.find((item) => item.id === tabId);
  if (!tab) return;

  state.activeTabId = tabId;
  const finalUrl = overrideUrl || tab.url;
  tab.url = finalUrl;
  tab.title = getDisplayTitleForUrl(finalUrl);
  addressBar.value = finalUrl;
  browserFrame.src = finalUrl;
  blockedMessage.classList.add('hidden');
  renderTabs();
  saveTabs();
}

function navigateTo(rawValue) {
  const activeTab = getActiveTab();
  if (!activeTab) return;

  const url = normalizeUrl(rawValue, state.searchEngine);
  if (!url) return;

  activeTab.url = url;
  activeTab.title = getDisplayTitleForUrl(url);
  state.activeTabId = activeTab.id;
  addressBar.value = url;
  browserFrame.src = url;
  blockedMessage.classList.add('hidden');
  renderTabs();
  saveTabs();
}

function syncFromFrame() {
  const activeTab = getActiveTab();
  if (!activeTab) return;

  const currentSrc = browserFrame.src || activeTab.url;
  try {
    const nextUrl = currentSrc && currentSrc !== 'about:blank' ? currentSrc : activeTab.url;
    activeTab.url = nextUrl;
    activeTab.title = getDisplayTitleForUrl(nextUrl);
    addressBar.value = nextUrl;
    renderTabs();
    saveTabs();
  } catch {
    // ignore invalid frame URL issues
  }
}

searchEngineSelect.value = state.searchEngine;
searchEngineSelect.addEventListener('change', (event) => {
  state.searchEngine = event.target.value;
  saveToStorage(STORAGE_KEYS.searchEngine, state.searchEngine);
  const activeTab = getActiveTab();
  if (activeTab) {
    navigateTo(addressBar.value || activeTab.url);
  }
});

addressBar.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    navigateTo(addressBar.value);
  }
});

document.getElementById('goBtn').addEventListener('click', () => {
  navigateTo(addressBar.value);
});

document.getElementById('newTabBtn').addEventListener('click', () => {
  createTab('https://www.google.com', 'Google');
});

document.getElementById('homeBtn').addEventListener('click', () => {
  const activeTab = getActiveTab();
  navigateTo(activeTab?.url || 'https://www.google.com');
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

themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  updateTheme();
});

browserFrame.addEventListener('load', () => {
  syncFromFrame();
});

browserFrame.addEventListener('error', () => {
  blockedMessage.classList.remove('hidden');
});

tabsBar.addEventListener('click', (event) => {
  const closeTrigger = event.target.closest('[data-close-tab]');
  if (closeTrigger) {
    closeTab(closeTrigger.dataset.closeTab);
    return;
  }

  const tabButton = event.target.closest('[data-tab-id]');
  if (tabButton) {
    loadTab(tabButton.dataset.tabId);
  }
});

updateTheme();
ensureActiveTab();
renderTabs();
updateAddressBar();
searchEngineSelect.value = state.searchEngine;
loadTab(state.activeTabId, getActiveTab().url);
