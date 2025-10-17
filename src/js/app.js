const MAX_WINDOWS = 4;

const appCatalog = [
  {
    id: 'conversation',
    name: '대화형 AI',
    apps: [
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        url: 'https://chat.openai.com/',
        icon: 'CG',
        accent: 'linear-gradient(135deg, rgba(10, 132, 255, 0.45), rgba(100, 210, 255, 0.35))',
      },
      {
        id: 'claude',
        name: 'Claude',
        url: 'https://claude.ai/',
        icon: 'CL',
        accent: 'linear-gradient(135deg, rgba(175, 82, 222, 0.45), rgba(255, 204, 0, 0.35))',
      },
      {
        id: 'gemini',
        name: 'Gemini',
        url: 'https://gemini.google.com/',
        icon: 'GM',
        accent: 'linear-gradient(135deg, rgba(48, 176, 255, 0.45), rgba(123, 82, 255, 0.3))',
      },
      {
        id: 'pi',
        name: 'Pi',
        url: 'https://pi.ai/',
        icon: 'PI',
        accent: 'linear-gradient(135deg, rgba(255, 159, 10, 0.45), rgba(255, 69, 58, 0.3))',
      },
    ],
  },
  {
    id: 'creative',
    name: '이미지 & 비디오',
    apps: [
      {
        id: 'midjourney',
        name: 'Midjourney',
        url: 'https://www.midjourney.com/',
        icon: 'MJ',
        accent: 'linear-gradient(135deg, rgba(255, 114, 92, 0.45), rgba(255, 59, 48, 0.3))',
      },
      {
        id: 'dalle',
        name: 'DALL·E',
        url: 'https://labs.openai.com/',
        icon: 'DE',
        accent: 'linear-gradient(135deg, rgba(255, 214, 10, 0.45), rgba(255, 59, 48, 0.25))',
      },
      {
        id: 'runwayml',
        name: 'RunwayML',
        url: 'https://runwayml.com/',
        icon: 'RW',
        accent: 'linear-gradient(135deg, rgba(88, 86, 214, 0.45), rgba(0, 122, 255, 0.3))',
      },
      {
        id: 'pika',
        name: 'Pika Labs',
        url: 'https://pika.art/',
        icon: 'PK',
        accent: 'linear-gradient(135deg, rgba(255, 69, 58, 0.45), rgba(255, 149, 0, 0.3))',
      },
    ],
  },
  {
    id: 'research',
    name: '리서치 & 문서',
    apps: [
      {
        id: 'perplexity',
        name: 'Perplexity',
        url: 'https://www.perplexity.ai/',
        icon: 'PX',
        accent: 'linear-gradient(135deg, rgba(90, 200, 250, 0.45), rgba(0, 113, 164, 0.35))',
      },
      {
        id: 'notion-ai',
        name: 'Notion AI',
        url: 'https://www.notion.so/product/ai',
        icon: 'NA',
        accent: 'linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(174, 174, 178, 0.25))',
      },
      {
        id: 'elicit',
        name: 'Elicit',
        url: 'https://elicit.org/',
        icon: 'EL',
        accent: 'linear-gradient(135deg, rgba(52, 199, 89, 0.45), rgba(48, 209, 88, 0.3))',
      },
      {
        id: 'mem',
        name: 'Mem',
        url: 'https://get.mem.ai/',
        icon: 'MM',
        accent: 'linear-gradient(135deg, rgba(255, 69, 58, 0.4), rgba(10, 132, 255, 0.3))',
      },
    ],
  },
  {
    id: 'coding',
    name: '코딩 어시스턴트',
    apps: [
      {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        url: 'https://github.com/copilot',
        icon: 'GC',
        accent: 'linear-gradient(135deg, rgba(52, 199, 89, 0.45), rgba(48, 209, 88, 0.3))',
      },
      {
        id: 'cursor',
        name: 'Cursor',
        url: 'https://www.cursor.com/',
        icon: 'CS',
        accent: 'linear-gradient(135deg, rgba(94, 92, 230, 0.45), rgba(52, 199, 89, 0.3))',
      },
      {
        id: 'replit-ghostwriter',
        name: 'Replit Ghostwriter',
        url: 'https://replit.com/site/ghostwriter',
        icon: 'RG',
        accent: 'linear-gradient(135deg, rgba(255, 45, 85, 0.45), rgba(255, 159, 10, 0.3))',
      },
      {
        id: 'codewhisperer',
        name: 'CodeWhisperer',
        url: 'https://aws.amazon.com/codewhisperer/',
        icon: 'CW',
        accent: 'linear-gradient(135deg, rgba(48, 209, 88, 0.45), rgba(10, 132, 255, 0.3))',
      },
    ],
  },
  {
    id: 'audio',
    name: '음성 & 음악',
    apps: [
      {
        id: 'suno',
        name: 'Suno',
        url: 'https://suno.com/',
        icon: 'SN',
        accent: 'linear-gradient(135deg, rgba(255, 45, 85, 0.45), rgba(88, 86, 214, 0.3))',
      },
      {
        id: 'elevenlabs',
        name: 'ElevenLabs',
        url: 'https://elevenlabs.io/',
        icon: 'EV',
        accent: 'linear-gradient(135deg, rgba(255, 159, 10, 0.45), rgba(255, 69, 58, 0.3))',
      },
      {
        id: 'voiceflow',
        name: 'Voiceflow',
        url: 'https://www.voiceflow.com/',
        icon: 'VF',
        accent: 'linear-gradient(135deg, rgba(10, 132, 255, 0.45), rgba(88, 86, 214, 0.3))',
      },
    ],
  },
];

const appLookup = new Map();
const categoryLookup = new Map();

const MAX_CANVASES = 6;
let canvasIdCounter = 1;

const state = {
  canvases: new Map(), // key: canvasId, value: { id, name, windows: Map }
  activeCanvasId: null,
  draggedApp: null,
};

const sidebarList = document.getElementById('ai-app-list');
const workspaceCanvas = document.getElementById('workspace-canvas');
const workspaceStatus = document.getElementById('workspace-status');
const windowTemplate = document.getElementById('window-template');
const quickCommand = document.getElementById('quick-command');
const composerFeedback = document.getElementById('composer-feedback');
const canvasTabsList = document.getElementById('canvas-tabs');
const addCanvasBtn = document.getElementById('add-canvas-btn');

const FEEDBACK_DURATION = 2400;
let feedbackTimeoutId;

const CANVAS_STORAGE_KEY = 'aispace-canvases';

// 명령어 매핑: AI 이름과 약어를 연결
const commandMap = {
  // 대화형 AI
  '/c': 'chatgpt',
  '/chat': 'chatgpt',
  '/chatgpt': 'chatgpt',
  '/cl': 'claude',
  '/claude': 'claude',
  '/g': 'gemini',
  '/gem': 'gemini',
  '/gemini': 'gemini',
  '/p': 'pi',
  '/pi': 'pi',
  // 이미지 & 비디오
  '/m': 'midjourney',
  '/mj': 'midjourney',
  '/mid': 'midjourney',
  '/midjourney': 'midjourney',
  '/d': 'dalle',
  '/dalle': 'dalle',
  '/r': 'runwayml',
  '/run': 'runwayml',
  '/runway': 'runwayml',
  '/pk': 'pika',
  '/pika': 'pika',
  // 리서치 & 문서
  '/px': 'perplexity',
  '/perp': 'perplexity',
  '/perplexity': 'perplexity',
  '/n': 'notion-ai',
  '/notion': 'notion-ai',
  '/e': 'elicit',
  '/elicit': 'elicit',
  '/mem': 'mem',
  // 코딩 어시스턴트
  '/gc': 'github-copilot',
  '/copilot': 'github-copilot',
  '/cs': 'cursor',
  '/cursor': 'cursor',
  '/rg': 'replit-ghostwriter',
  '/replit': 'replit-ghostwriter',
  '/cw': 'codewhisperer',
  '/code': 'codewhisperer',
  // 음성 & 음악
  '/s': 'suno',
  '/suno': 'suno',
  '/ev': 'elevenlabs',
  '/eleven': 'elevenlabs',
  '/v': 'voiceflow',
  '/voice': 'voiceflow',
};

const themeToggleInput = document.getElementById('theme-toggle');

const THEME_STORAGE_KEY = 'aispace-theme';
const THEME_OPTIONS = {
  light: 'light',
  dark: 'dark',
};

function applyThemePreference(theme) {
  const root = document.documentElement;
  if (!Object.values(THEME_OPTIONS).includes(theme)) {
    root.removeAttribute('data-theme');
    return;
  }
  root.setAttribute('data-theme', theme === THEME_OPTIONS.dark ? 'dark' : 'light');
  if (themeToggleInput) {
    themeToggleInput.checked = theme === THEME_OPTIONS.dark;
  }
}

function loadInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored) {
    applyThemePreference(stored);
    return stored;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = prefersDark ? THEME_OPTIONS.dark : THEME_OPTIONS.light;
  applyThemePreference(initialTheme);
  return initialTheme;
}

function initThemeToggle() {
  const currentTheme = loadInitialTheme();
  if (!themeToggleInput) return;
  themeToggleInput.checked = currentTheme === THEME_OPTIONS.dark;
  themeToggleInput.addEventListener('change', (event) => {
    const shouldEnableDark = event.target.checked;
    const nextTheme = shouldEnableDark ? THEME_OPTIONS.dark : THEME_OPTIONS.light;
    applyThemePreference(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  });
}

function createSidebarItem(app) {
  const item = document.createElement('button');
  item.className = 'sidebar__app';
  item.type = 'button';
  item.draggable = true;
  item.setAttribute('data-app-id', app.id);
  item.setAttribute('data-category-id', app.categoryId);
  item.setAttribute('aria-label', `${app.name} 창 열기`);
  if (app.accent) {
    item.style.setProperty('--app-accent', app.accent);
  }

  const iconHolder = document.createElement('div');
  iconHolder.className = 'sidebar__app-icon';
  iconHolder.textContent = app.icon;

  const name = document.createElement('span');
  name.className = 'sidebar__app-name';
  name.textContent = app.name;

  item.append(iconHolder, name);
  return item;
}

function buildLookups() {
  appCatalog.forEach((category) => {
    categoryLookup.set(category.id, category);
    category.apps.forEach((app) => {
      appLookup.set(app.id, { ...app, categoryId: category.id });
    });
  });
}

function renderSidebar() {
  if (!sidebarList) return;
  sidebarList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  appCatalog.forEach((category) => {
    category.apps.forEach((app) => {
      const appWithCategory = { ...app, categoryId: category.id };
      appLookup.set(appWithCategory.id, appWithCategory);
      const item = createSidebarItem(appWithCategory);
      fragment.appendChild(item);
    });
  });

  sidebarList.appendChild(fragment);
}

// ============ Canvas Management ============

function getActiveCanvas() {
  return state.canvases.get(state.activeCanvasId);
}

function createCanvas(name = null) {
  if (state.canvases.size >= MAX_CANVASES) {
    showToast(`최대 ${MAX_CANVASES}개의 캔버스까지 생성할 수 있습니다.`);
    return null;
  }
  
  const canvasId = `canvas-${canvasIdCounter++}`;
  const canvasName = name || `캔버스 ${state.canvases.size + 1}`;
  
  const canvas = {
    id: canvasId,
    name: canvasName,
    windows: new Map(),
  };
  
  state.canvases.set(canvasId, canvas);
  return canvas;
}

function deleteCanvas(canvasId) {
  const canvas = state.canvases.get(canvasId);
  if (!canvas) return;
  
  // 마지막 캔버스는 삭제하지 않음
  if (state.canvases.size === 1) return;
  
  state.canvases.delete(canvasId);
  
  // 삭제된 캔버스가 활성 캔버스였다면 다른 캔버스로 전환
  if (state.activeCanvasId === canvasId) {
    const firstCanvasId = state.canvases.keys().next().value;
    switchCanvas(firstCanvasId);
  } else {
    renderCanvasTabs();
    saveCanvasesToStorage();
  }
}

function switchCanvas(canvasId) {
  const canvas = state.canvases.get(canvasId);
  if (!canvas) return;
  
  state.activeCanvasId = canvasId;
  
  // UI 업데이트
  renderWorkspaceWindows();
  renderCanvasTabs();
  updateWorkspaceStatus();
  saveCanvasesToStorage();
}

function updateCanvasName(canvasId, newName) {
  const canvas = state.canvases.get(canvasId);
  if (!canvas) return;
  
  canvas.name = newName.trim() || canvas.name;
  renderCanvasTabs();
  saveCanvasesToStorage();
}

function renderCanvasTabs() {
  if (!canvasTabsList) return;
  
  canvasTabsList.innerHTML = '';
  
  state.canvases.forEach((canvas) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'workspace__tab';
    tab.setAttribute('data-canvas-id', canvas.id);
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', canvas.id === state.activeCanvasId ? 'true' : 'false');
    
    const text = document.createElement('span');
    text.className = 'workspace__tab-text';
    text.textContent = canvas.name;
    
    tab.appendChild(text);
    canvasTabsList.appendChild(tab);
  });
}

function renderWorkspaceWindows() {
  if (!workspaceCanvas) return;
  
  // 기존 윈도우 모두 제거
  workspaceCanvas.innerHTML = '';
  
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;
  
  // 현재 캔버스의 윈도우들 렌더링
  activeCanvas.windows.forEach((windowData) => {
    const windowElement = createWindowElement(windowData);
    workspaceCanvas.appendChild(windowElement);
  });
}

function checkAndDeleteEmptyCanvases() {
  const canvasesToDelete = [];
  
  state.canvases.forEach((canvas) => {
    if (canvas.windows.size === 0 && state.canvases.size > 1) {
      canvasesToDelete.push(canvas.id);
    }
  });
  
  canvasesToDelete.forEach((canvasId) => {
    deleteCanvas(canvasId);
  });
}

function saveCanvasesToStorage() {
  try {
    const canvasesData = {
      canvases: Array.from(state.canvases.values()).map(canvas => ({
        id: canvas.id,
        name: canvas.name,
        windows: Array.from(canvas.windows.values()),
      })),
      activeCanvasId: state.activeCanvasId,
      canvasIdCounter,
    };
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(canvasesData));
  } catch (error) {
    console.warn('캔버스 상태를 저장하지 못했습니다.', error);
  }
}

function loadCanvasesFromStorage() {
  try {
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY);
    if (!stored) return false;
    
    const data = JSON.parse(stored);
    
    // 캔버스 복원
    state.canvases.clear();
    data.canvases.forEach(canvasData => {
      const canvas = {
        id: canvasData.id,
        name: canvasData.name,
        windows: new Map(canvasData.windows.map(w => [w.id, w])),
      };
      state.canvases.set(canvas.id, canvas);
    });
    
    state.activeCanvasId = data.activeCanvasId;
    canvasIdCounter = data.canvasIdCounter || state.canvases.size + 1;
    
    return true;
  } catch (error) {
    console.warn('캔버스 상태를 불러오지 못했습니다.', error);
    return false;
  }
}

function initCanvases() {
  const loaded = loadCanvasesFromStorage();
  
  if (!loaded || state.canvases.size === 0) {
    // 기본 캔버스 생성
    const defaultCanvas = createCanvas('Unified AI Canvas');
    state.activeCanvasId = defaultCanvas.id;
  }
  
  renderCanvasTabs();
}

function updateWorkspaceStatus() {
  const activeCanvas = getActiveCanvas();
  const windowCount = activeCanvas ? activeCanvas.windows.size : 0;
  workspaceStatus.textContent = `${windowCount} / ${MAX_WINDOWS}`;
  updateWorkspaceLayoutClass();
}

function updateWorkspaceLayoutClass() {
  if (!workspaceCanvas) return;
  const activeCanvas = getActiveCanvas();
  const count = activeCanvas ? activeCanvas.windows.size : 0;
  
  workspaceCanvas.classList.remove(
    'workspace__canvas--count-1',
    'workspace__canvas--count-2',
    'workspace__canvas--count-3',
    'workspace__canvas--count-4'
  );

  if (count >= 1 && count <= 4) {
    workspaceCanvas.classList.add(`workspace__canvas--count-${count}`);
  }
}

function setWorkspaceDroppable(active) {
  workspaceCanvas.classList.toggle('drag-target', active);
}

function handleDragStart(event) {
  const appId = event.currentTarget.getAttribute('data-app-id');
  const app = appLookup.get(appId);
  if (!app) return;

  state.draggedApp = app;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('application/json', JSON.stringify(app));
  event.currentTarget.setAttribute('aria-grabbed', 'true');
}

function handleDragEnd(event) {
  event.currentTarget.setAttribute('aria-grabbed', 'false');
  state.draggedApp = null;
  setWorkspaceDroppable(false);
}

function handleDragOver(event) {
  if (!state.draggedApp) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  setWorkspaceDroppable(true);
}

function handleDragLeave() {
  setWorkspaceDroppable(false);
}

function createWindowId(appId) {
  const base = `${appId}-${Date.now()}`;
  return base;
}

function createWindowElement(windowData) {
  const { id: windowId, app, promptEnabled } = windowData;
  
  const windowNode = windowTemplate.content.firstElementChild.cloneNode(true);
  windowNode.dataset.windowId = windowId;
  windowNode.dataset.appId = app.id;

  const titleEl = windowNode.querySelector('.ai-window__title');
  const iconEl = windowNode.querySelector('.ai-window__icon');
  const contentContainer = windowNode.querySelector('[data-frame-container]');
  const closeButton = windowNode.querySelector('[data-action="close"]');
  const refreshButton = windowNode.querySelector('[data-action="refresh"]');
  const toggleCheckbox = windowNode.querySelector('[data-action="toggle-prompt"]');
  const resizeHandle = windowNode.querySelector('[data-resize-handle]');

  titleEl.textContent = app.name;
  iconEl.textContent = app.icon;

  // 토글 상태 초기화
  if (toggleCheckbox) {
    toggleCheckbox.checked = promptEnabled !== false;
  }

  mountAppContent(contentContainer, app);

  closeButton.addEventListener('click', () => removeWindow(windowId));
  refreshButton.addEventListener('click', () => {
    refreshAppContent(contentContainer, app);
  });

  // 토글 버튼 이벤트
  if (toggleCheckbox) {
    toggleCheckbox.addEventListener('change', (e) => {
      toggleWindowPromptEnabled(windowId, e.target.checked);
    });
  }

  // Custom resize handle for pointer events on top of CSS resize
  initResizeHandle(windowNode, resizeHandle);

  return windowNode;
}

function addWindow(app) {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;
  
  if (activeCanvas.windows.size >= MAX_WINDOWS) {
    showToast(`최대 ${MAX_WINDOWS}개의 창까지만 열 수 있습니다.`);
    return;
  }

  const windowId = createWindowId(app.id);
  const windowData = {
    id: windowId,
    appId: app.id,
    app,
    promptEnabled: true, // 기본적으로 ON 상태
  };

  activeCanvas.windows.set(windowId, windowData);
  
  const windowElement = createWindowElement(windowData);
  workspaceCanvas.appendChild(windowElement);

  updateWorkspaceStatus();
  saveCanvasesToStorage();
}

function removeWindow(windowId) {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;
  
  const windowData = activeCanvas.windows.get(windowId);
  if (!windowData) return;
  
  const windowElement = workspaceCanvas.querySelector(`[data-window-id="${windowId}"]`);
  if (windowElement) {
    unmountAppContent(windowElement.querySelector('[data-frame-container]'), windowData.app);
    windowElement.remove();
  }
  
  activeCanvas.windows.delete(windowId);
  updateWorkspaceStatus();
  saveCanvasesToStorage();
  
  // 빈 캔버스 자동 삭제
  checkAndDeleteEmptyCanvases();
}

function handleDrop(event) {
  event.preventDefault();
  setWorkspaceDroppable(false);

  let appData = state.draggedApp;
  if (!appData) {
    try {
      const payload = event.dataTransfer.getData('application/json');
      if (payload) {
        const parsed = JSON.parse(payload);
        appData = appLookup.get(parsed.id) ?? parsed;
      }
    } catch (error) {
      console.error('Failed to parse dropped data', error);
    }
  }

  if (!appData) return;

  addWindow(appData);
}

function initResizeHandle(windowNode, handle) {
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  const minWidth = 240;
  const minHeight = 220;

  const onPointerMove = (event) => {
    if (!isResizing) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const nextWidth = Math.max(minWidth, startWidth + deltaX);
    const nextHeight = Math.max(minHeight, startHeight + deltaY);
    windowNode.style.width = `${nextWidth}px`;
    windowNode.style.height = `${nextHeight}px`;
  };

  const onPointerUp = () => {
    isResizing = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    windowNode.classList.remove('ai-window--resizing');
  };

  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    isResizing = true;
    startX = event.clientX;
    startY = event.clientY;
    startWidth = windowNode.offsetWidth;
    startHeight = windowNode.offsetHeight;
    windowNode.classList.add('ai-window--resizing');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener(
      'transitionend',
      () => {
        toast.remove();
      },
      { once: true }
    );
  }, 2800);
}

function showComposerFeedback(message) {
  if (!composerFeedback) return;
  clearTimeout(feedbackTimeoutId);
  composerFeedback.textContent = message;
  feedbackTimeoutId = setTimeout(() => {
    composerFeedback.textContent = '';
  }, FEEDBACK_DURATION);
}

function executeQuickCommand(commandText) {
  if (!commandText) return;
  
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;
  
  const normalizedCommand = commandText.trim().toLowerCase();
  const appId = commandMap[normalizedCommand];
  
  if (!appId) {
    showComposerFeedback(`"${commandText}" 명령어를 찾을 수 없어요. 예: /c, /cl, /g`);
    return;
  }
  
  const app = appLookup.get(appId);
  if (!app) {
    showComposerFeedback(`AI 앱을 찾을 수 없어요.`);
    return;
  }
  
  // 이미 같은 AI가 열려있는지 확인 (현재 캔버스에서)
  const existingWindow = Array.from(activeCanvas.windows.values()).find(w => w.appId === appId);
  if (existingWindow) {
    showComposerFeedback(`${app.name}은(는) 이미 열려 있어요.`);
    return;
  }
  
  // 최대 창 개수 확인
  if (activeCanvas.windows.size >= MAX_WINDOWS) {
    showComposerFeedback(`최대 ${MAX_WINDOWS}개까지만 열 수 있어요.`);
    return;
  }
  
  // AI 창 열기
  addWindow(app);
  showComposerFeedback(`${app.name} 실행 완료!`);
  
  // 입력 필드 초기화
  if (quickCommand) {
    quickCommand.value = '';
  }
}

function initToastStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      left: 50%;
      bottom: 48px;
      transform: translateX(-50%) translateY(24px);
      opacity: 0;
      background: rgba(28, 28, 30, 0.85);
      color: var(--text-primary);
      padding: 14px 24px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(14px);
      box-shadow: var(--shadow-elevated);
      transition: opacity 180ms ease, transform 180ms ease;
      z-index: 999;
      font-size: 0.95rem;
    }

    .toast--visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);
}

function initScrollIndicator() {
  const appsWrapper = document.querySelector('.sidebar__apps-wrapper');
  if (!appsWrapper) return;

  function checkScroll() {
    const scrollTop = appsWrapper.scrollTop;
    const scrollHeight = appsWrapper.scrollHeight;
    const clientHeight = appsWrapper.clientHeight;
    
    // 스크롤이 하단에 도달했는지 확인 (1px 여유)
    if (scrollTop + clientHeight >= scrollHeight - 1) {
      appsWrapper.classList.add('scrolled-to-bottom');
    } else {
      appsWrapper.classList.remove('scrolled-to-bottom');
    }
  }

  // 초기 체크
  checkScroll();
  
  // 스크롤 이벤트 리스너
  appsWrapper.addEventListener('scroll', checkScroll);
  
  // 리사이즈 시에도 체크
  window.addEventListener('resize', checkScroll);
}

// ============ Prompt Broadcasting ============

function toggleWindowPromptEnabled(windowId, enabled) {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;
  
  const windowData = activeCanvas.windows.get(windowId);
  if (!windowData) return;
  
  windowData.promptEnabled = enabled;
  saveCanvasesToStorage();
}

// 각 AI 사이트별 input 선택자들
const INPUT_SELECTORS = [
  // ChatGPT
  'textarea[placeholder*="Message"]',
  'textarea[data-id]',
  '#prompt-textarea',
  
  // Claude
  'div[contenteditable="true"][data-placeholder]',
  'div[contenteditable="true"].ProseMirror',
  'div.ProseMirror[contenteditable="true"]',
  
  // Gemini
  '.ql-editor[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  
  // 일반적인 선택자들
  'textarea[placeholder*="메시지"]',
  'textarea[placeholder*="질문"]',
  'div[contenteditable="true"]',
  'textarea.chat-input',
  'textarea',
  'input[type="text"]',
];

function sendPromptToWebview(webview, promptText) {
  if (!webview || !promptText) return Promise.resolve({ success: false });
  
  const escapedPrompt = promptText.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const selectorsJson = JSON.stringify(INPUT_SELECTORS);
  
  const script = `
    (function() {
      const selectors = ${selectorsJson};
      const promptText = '${escapedPrompt}';
      
      for (const selector of selectors) {
        try {
          const input = document.querySelector(selector);
          if (input) {
            // contenteditable div인 경우
            if (input.contentEditable === 'true') {
              input.focus();
              input.textContent = promptText;
              
              // React/Vue 등이 감지하도록 다양한 이벤트 발생
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: promptText }));
              
              return { success: true, selector: selector, type: 'contenteditable' };
            }
            // textarea 또는 input인 경우
            else if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
              input.focus();
              
              // value 설정 전 descriptor 확인
              const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');
              if (descriptor && descriptor.set) {
                descriptor.set.call(input, promptText);
              } else {
                input.value = promptText;
              }
              
              // React/Vue 등이 감지하도록 다양한 이벤트 발생
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: promptText }));
              
              return { success: true, selector: selector, type: 'input' };
            }
          }
        } catch (error) {
          // 계속 다음 선택자 시도
        }
      }
      
      return { success: false, error: 'No input field found' };
    })();
  `;
  
  return webview.executeJavaScript(script)
    .then(result => result || { success: false })
    .catch(error => {
      console.error('Failed to execute script in webview:', error);
      return { success: false, error: error.message };
    });
}

async function broadcastPromptToWindows(promptText) {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) {
    showToast('활성 캔버스가 없습니다.');
    return;
  }
  
  if (!promptText || !promptText.trim()) {
    showToast('프롬프트를 입력해주세요.');
    return;
  }
  
  // ON 상태인 창들만 필터링
  const enabledWindows = Array.from(activeCanvas.windows.values())
    .filter(w => w.promptEnabled !== false);
  
  if (enabledWindows.length === 0) {
    showToast('프롬프트를 받을 창이 없습니다. 창의 토글을 ON으로 설정하세요.');
    return;
  }
  
  // 상태 메시지 표시
  const statusEl = document.getElementById('broadcast-status');
  if (statusEl) {
    statusEl.textContent = `전송 중... (0/${enabledWindows.length})`;
  }
  
  let successCount = 0;
  let failedApps = [];
  
  // 각 창에 순차적으로 전송
  for (let i = 0; i < enabledWindows.length; i++) {
    const windowData = enabledWindows[i];
    const windowElement = workspaceCanvas.querySelector(`[data-window-id="${windowData.id}"]`);
    
    if (windowElement) {
      const webview = windowElement.querySelector('webview');
      
      if (webview) {
        try {
          const result = await sendPromptToWebview(webview, promptText);
          
          if (result.success) {
            successCount++;
          } else {
            failedApps.push(windowData.app.name);
          }
        } catch (error) {
          console.error(`Failed to send prompt to ${windowData.app.name}:`, error);
          failedApps.push(windowData.app.name);
        }
      } else {
        failedApps.push(windowData.app.name);
      }
      
      // 진행 상황 업데이트
      if (statusEl) {
        statusEl.textContent = `전송 중... (${i + 1}/${enabledWindows.length})`;
      }
      
      // 다음 창으로 넘어가기 전 짧은 지연 (과부하 방지)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // 결과 메시지
  if (statusEl) {
    if (successCount === enabledWindows.length) {
      statusEl.textContent = `✅ ${successCount}개 창에 전송 완료`;
      showToast(`${successCount}개의 AI 창에 프롬프트를 전송했습니다.`);
    } else if (successCount > 0) {
      statusEl.textContent = `⚠️ ${successCount}/${enabledWindows.length}개 전송 완료`;
      showToast(`${successCount}개 성공, ${failedApps.length}개 실패: ${failedApps.join(', ')}`);
    } else {
      statusEl.textContent = `❌ 전송 실패`;
      showToast('프롬프트 전송에 실패했습니다. 페이지가 완전히 로드되었는지 확인하세요.');
    }
    
    // 3초 후 상태 메시지 클리어
    setTimeout(() => {
      if (statusEl) statusEl.textContent = '';
    }, 3000);
  }
}

function initWorkspace() {
  initThemeToggle();
  buildLookups();
  renderSidebar();
  initCanvases();
  updateWorkspaceStatus();
  initToastStyles();
  initScrollIndicator();

  sidebarList.addEventListener('dragstart', (event) => {
    if (event.target.closest('.sidebar__app')) {
      handleDragStart(event);
    }
  });

  sidebarList.addEventListener('dragend', (event) => {
    if (event.target.closest('.sidebar__app')) {
      handleDragEnd(event);
    }
  });

  sidebarList.addEventListener('click', (event) => {
    const button = event.target.closest('.sidebar__app');
    if (!button) return;
    const appId = button.getAttribute('data-app-id');
    const app = appLookup.get(appId);
    if (!app) return;
    addWindow(app);
  });

  workspaceCanvas.addEventListener('dragover', handleDragOver);
  workspaceCanvas.addEventListener('dragleave', handleDragLeave);
  workspaceCanvas.addEventListener('drop', handleDrop);

  quickCommand?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const command = quickCommand.value.trim();
      if (command) {
        executeQuickCommand(command);
      }
    }
  });

  // Canvas tabs event listeners
  canvasTabsList?.addEventListener('click', (event) => {
    const tab = event.target.closest('.workspace__tab');
    if (!tab) return;
    const canvasId = tab.getAttribute('data-canvas-id');
    if (canvasId) {
      switchCanvas(canvasId);
    }
  });

  canvasTabsList?.addEventListener('dblclick', (event) => {
    const tab = event.target.closest('.workspace__tab');
    if (!tab) return;
    const canvasId = tab.getAttribute('data-canvas-id');
    if (canvasId) {
      startEditingCanvasName(tab, canvasId);
    }
  });

  canvasTabsList?.addEventListener('contextmenu', (event) => {
    const tab = event.target.closest('.workspace__tab');
    if (!tab) return;
    event.preventDefault();
    const canvasId = tab.getAttribute('data-canvas-id');
    if (canvasId) {
      showCanvasContextMenu(event, tab, canvasId);
    }
  });

  addCanvasBtn?.addEventListener('click', () => {
    const newCanvas = createCanvas();
    if (newCanvas) {
      switchCanvas(newCanvas.id);
    }
  });

  // Broadcast prompt event listeners
  const broadcastBtn = document.getElementById('broadcast-btn');
  const broadcastPrompt = document.getElementById('broadcast-prompt');
  
  broadcastBtn?.addEventListener('click', () => {
    const promptText = broadcastPrompt?.value.trim();
    if (promptText) {
      broadcastPromptToWindows(promptText);
    }
  });
  
  // Ctrl+Enter로도 전송 가능
  broadcastPrompt?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      const promptText = broadcastPrompt.value.trim();
      if (promptText) {
        broadcastPromptToWindows(promptText);
      }
    }
  });

  // Close context menu on click outside
  document.addEventListener('click', closeContextMenu);
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.workspace__tab')) {
      closeContextMenu();
    }
  });
}

let contextMenuElement = null;

function showCanvasContextMenu(event, tabElement, canvasId) {
  event.preventDefault();
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'workspace__context-menu';
  
  // 이름 변경 버튼
  const renameBtn = document.createElement('button');
  renameBtn.className = 'workspace__context-menu-item';
  renameBtn.innerHTML = `
    <span class="workspace__context-menu-icon">✏️</span>
    <span>이름 변경</span>
  `;
  renameBtn.addEventListener('click', () => {
    closeContextMenu();
    startEditingCanvasName(tabElement, canvasId);
  });
  
  // 삭제 버튼
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'workspace__context-menu-item workspace__context-menu-item--danger';
  deleteBtn.innerHTML = `
    <span class="workspace__context-menu-icon">🗑️</span>
    <span>삭제</span>
  `;
  deleteBtn.addEventListener('click', () => {
    closeContextMenu();
    if (state.canvases.size <= 1) {
      showToast('마지막 캔버스는 삭제할 수 없습니다.');
      return;
    }
    
    // 캔버스에 창이 있는지 확인
    const canvas = state.canvases.get(canvasId);
    if (canvas && canvas.windows.size > 0) {
      const windowCount = canvas.windows.size;
      if (confirm(`이 캔버스에 ${windowCount}개의 AI 창이 열려 있습니다.\n삭제하시겠습니까?`)) {
        deleteCanvas(canvasId);
      }
    } else {
      deleteCanvas(canvasId);
    }
  });
  
  menu.appendChild(renameBtn);
  menu.appendChild(deleteBtn);
  
  document.body.appendChild(menu);
  contextMenuElement = menu;
  
  // 위치 조정
  const x = event.clientX;
  const y = event.clientY;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  
  // 화면 밖으로 나가지 않도록 조정
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
    menu.classList.add('visible');
  });
}

function closeContextMenu() {
  if (contextMenuElement) {
    contextMenuElement.remove();
    contextMenuElement = null;
  }
}

function startEditingCanvasName(tabElement, canvasId) {
  const canvas = state.canvases.get(canvasId);
  if (!canvas) return;

  const textSpan = tabElement.querySelector('.workspace__tab-text');
  if (!textSpan) return;

  const currentName = textSpan.textContent;
  textSpan.textContent = '';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'workspace__tab-input';
  input.value = currentName;
  textSpan.appendChild(input);

  input.focus();
  input.select();

  function finishEditing() {
    const newName = input.value.trim();
    if (newName && newName !== currentName) {
      updateCanvasName(canvasId, newName);
    } else {
      textSpan.textContent = currentName;
    }
  }

  input.addEventListener('blur', finishEditing);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      textSpan.textContent = currentName;
    }
  });
}

function mountAppContent(container, app) {
  if (!container) return;
  const isElectron = Boolean(window.aispace);
  unmountAppContent(container, app);
  if (isElectron) {
    const webview = document.createElement('webview');
    webview.setAttribute('src', app.url);
    webview.setAttribute('allowpopups', 'true');
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.dataset.appId = app.id;
    container.appendChild(webview);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = app.url;
    iframe.title = `${app.name} 인터페이스`;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.dataset.appId = app.id;
    container.appendChild(iframe);
  }
}

function refreshAppContent(container, app) {
  if (!container) return;
  const existing = container.querySelector('[data-app-id]');
  if (existing && 'reload' in existing) {
    existing.reload();
  } else if (existing && existing.tagName === 'IFRAME') {
    existing.src = app.url;
  } else {
    mountAppContent(container, app);
  }
}

function unmountAppContent(container, _app) {
  if (!container) return;
  const existing = container.querySelector('[data-app-id]');
  if (existing) {
    existing.remove();
  }
}

window.addEventListener('DOMContentLoaded', initWorkspace);

