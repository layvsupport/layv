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
const windowTemplate = document.getElementById('window-template');
const canvasTabsList = document.getElementById('canvas-tabs');
const addCanvasBtn = document.getElementById('add-canvas-btn');
const helpButton = document.getElementById('help-button');

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

// 기본 라이트 모드 적용
function initAutoTheme() {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'light');
}

// 도움말 버튼
function initHelpButton() {
  if (!helpButton) return;
  
  helpButton.addEventListener('click', () => {
    showToast('💡 도움말: /명령어로 빠른 실행, 일반 텍스트는 일괄 전송됩니다.');
  });
}

// 사이드바 토글 관리
const SIDEBAR_STORAGE_KEY = 'aispace-sidebar-collapsed';
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');
const appShell = document.querySelector('.app-shell');

function applySidebarState(isCollapsed) {
  if (isCollapsed) {
    sidebar.classList.add('sidebar--collapsed');
    appShell.classList.add('sidebar-collapsed');
  } else {
    sidebar.classList.remove('sidebar--collapsed');
    appShell.classList.remove('sidebar-collapsed');
  }
}

function loadSidebarState() {
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return stored === 'true';
}

function initSidebarToggle() {
  const isCollapsed = loadSidebarState();
  applySidebarState(isCollapsed);
  
  if (!sidebarToggleBtn) return;
  
  sidebarToggleBtn.addEventListener('click', () => {
    const currentlyCollapsed = sidebar.classList.contains('sidebar--collapsed');
    const newState = !currentlyCollapsed;
    applySidebarState(newState);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, newState.toString());
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

// 앱 폴더 토글 기능
function initAppsFolderToggle() {
  const folders = [
    { toggleId: 'apps-folder-toggle', wrapperId: 'apps-wrapper' },
    { toggleId: 'community-folder-toggle', wrapperId: 'community-wrapper' },
    { toggleId: 'mypack-folder-toggle', wrapperId: 'mypack-wrapper' }
  ];
  
  folders.forEach(({ toggleId, wrapperId }) => {
    const folderToggle = document.getElementById(toggleId);
    const appsWrapper = document.getElementById(wrapperId);
    
    if (!folderToggle || !appsWrapper) return;
    
    // 폴더가 비어있는지 확인
    const checkIfEmpty = () => {
      const appsList = appsWrapper.querySelector('.sidebar__apps');
      const isEmpty = !appsList || appsList.children.length === 0;
      
      if (isEmpty) {
        appsWrapper.classList.add('sidebar__apps-wrapper--empty');
      } else {
        appsWrapper.classList.remove('sidebar__apps-wrapper--empty');
      }
      
      return isEmpty;
    };
    
    // 초기 체크
    checkIfEmpty();
    
    folderToggle.addEventListener('click', () => {
      const isEmpty = checkIfEmpty();
      const isExpanded = folderToggle.getAttribute('aria-expanded') === 'true';
      
      // 화살표는 항상 토글
      folderToggle.setAttribute('aria-expanded', !isExpanded);
      folderToggle.classList.toggle('sidebar__folder-toggle--collapsed', isExpanded);
      
      // 비어있지 않은 경우만 박스 토글
      if (!isEmpty) {
        appsWrapper.classList.toggle('sidebar__apps-wrapper--collapsed', isExpanded);
      }
    });
  });
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
  
  // 현재 캔버스의 윈도우들을 order 순서대로 정렬하여 렌더링
  const sortedWindows = Array.from(activeCanvas.windows.values())
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  sortedWindows.forEach((windowData) => {
    const windowElement = createWindowElement(windowData);
    workspaceCanvas.appendChild(windowElement);
  });
  
  updateWorkspaceLayoutClass();
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
        windows: new Map(canvasData.windows.map((w, index) => {
          // appLookup에서 실제 app 객체를 찾아서 할당
          const app = appLookup.get(w.appId) || w.app;
          // order가 없으면 인덱스로 설정
          return [w.id, { ...w, app, order: w.order !== undefined ? w.order : index }];
        })),
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
  renderWorkspaceWindows(); // 저장된 창들을 화면에 렌더링
}

function updateWorkspaceLayoutClass() {
  if (!workspaceCanvas) return;
  const activeCanvas = getActiveCanvas();
  const count = activeCanvas ? activeCanvas.windows.size : 0;
  
  workspaceCanvas.classList.remove(
    'canvas-layout-1',
    'canvas-layout-2',
    'canvas-layout-3',
    'canvas-layout-4'
  );

  if (count >= 1 && count <= 4) {
    workspaceCanvas.classList.add(`canvas-layout-${count}`);
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

// ==================== 캔버스 창 드래그 앤 드롭 ====================
let draggedWindowId = null;

function handleWindowDragStart(event) {
  const windowNode = event.target.closest('.ai-window');
  if (!windowNode) return;
  
  draggedWindowId = windowNode.dataset.windowId;
  windowNode.classList.add('ai-window--dragging');
  
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedWindowId);
}

function handleWindowDragEnd(event) {
  const windowNode = event.target.closest('.ai-window');
  if (windowNode) {
    windowNode.classList.remove('ai-window--dragging');
  }
  
  // 모든 하이라이트 제거
  document.querySelectorAll('.ai-window--drag-over').forEach(node => {
    node.classList.remove('ai-window--drag-over');
  });
  
  draggedWindowId = null;
}

function handleWindowDragOver(event) {
  if (!draggedWindowId) return;
  
  // 항상 preventDefault를 먼저 호출하여 금지 표시 방지
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  const targetWindow = event.currentTarget;
  const targetWindowId = targetWindow.dataset.windowId;
  
  // 자기 자신 위로는 하이라이트만 안 함
  if (targetWindowId === draggedWindowId) return;
  
  targetWindow.classList.add('ai-window--drag-over');
}

function handleWindowDragLeave(event) {
  const targetWindow = event.currentTarget;
  targetWindow.classList.remove('ai-window--drag-over');
}

function handleWindowDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const targetWindow = event.currentTarget;
  const targetWindowId = targetWindow.dataset.windowId;
  
  targetWindow.classList.remove('ai-window--drag-over');
  
  if (!draggedWindowId || targetWindowId === draggedWindowId) return;
  
  swapWindowOrder(draggedWindowId, targetWindowId);
}

function swapWindowOrder(windowId1, windowId2) {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;
  
  const window1 = activeCanvas.windows.get(windowId1);
  const window2 = activeCanvas.windows.get(windowId2);
  
  if (!window1 || !window2) return;
  
  // order 값 교환
  const tempOrder = window1.order;
  window1.order = window2.order;
  window2.order = tempOrder;
  
  // 화면 다시 렌더링
  renderWorkspaceWindows();
  
  // localStorage에 저장
  saveCanvasesToStorage();
  
  showToast('창 순서가 변경되었습니다.');
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
  const headerEl = windowNode.querySelector('.ai-window__header');

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

  // 드래그 앤 드롭 이벤트 (헤더만 드래그 가능)
  if (headerEl) {
    headerEl.draggable = true;
    headerEl.addEventListener('dragstart', handleWindowDragStart);
    headerEl.addEventListener('dragend', handleWindowDragEnd);
  }
  
  // 창 전체에 드롭 이벤트 추가
  windowNode.addEventListener('dragover', handleWindowDragOver);
  windowNode.addEventListener('dragleave', handleWindowDragLeave);
  windowNode.addEventListener('drop', handleWindowDrop);

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
  // 현재 캔버스의 최대 order 값 찾기
  const maxOrder = Math.max(0, ...Array.from(activeCanvas.windows.values()).map(w => w.order || 0));
  
  const windowData = {
    id: windowId,
    appId: app.id,
    app,
    promptEnabled: true, // 기본적으로 ON 상태
    order: maxOrder + 1, // 새 창은 마지막 순서
  };

  activeCanvas.windows.set(windowId, windowData);
  
  const windowElement = createWindowElement(windowData);
  workspaceCanvas.appendChild(windowElement);

  updateWorkspaceLayoutClass();
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
  updateWorkspaceLayoutClass();
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

// showComposerFeedback 함수 제거됨 - 토스트만 사용

function executeQuickCommand(commandText) {
  if (!commandText) return;
  
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;
  
  const normalizedCommand = commandText.trim().toLowerCase();
  const appId = commandMap[normalizedCommand];
  
  if (!appId) {
    showToast(`"${commandText}" 명령어를 찾을 수 없습니다. 예: /c, /cl, /g`);
    return;
  }
  
  const app = appLookup.get(appId);
  if (!app) {
    showToast(`AI 앱을 찾을 수 없습니다.`);
    return;
  }
  
  // 이미 같은 AI가 열려있는지 확인 (현재 캔버스에서)
  const existingWindow = Array.from(activeCanvas.windows.values()).find(w => w.appId === appId);
  if (existingWindow) {
    showToast(`${app.name}은(는) 이미 열려 있습니다.`);
    return;
  }
  
  // 최대 창 개수 확인
  if (activeCanvas.windows.size >= MAX_WINDOWS) {
    showToast(`최대 ${MAX_WINDOWS}개까지만 열 수 있습니다.`);
    return;
  }
  
  // AI 창 열기
  addWindow(app);
  showToast(`✅ ${app.name} 실행 완료!`);
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
      
      // 다음 창으로 넘어가기 전 짧은 지연 (과부하 방지)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // 결과 메시지 (토스트로만 표시)
  if (successCount === enabledWindows.length) {
    showToast(`✅ ${successCount}개의 AI 창에 프롬프트를 전송했습니다.`);
  } else if (successCount > 0) {
    showToast(`⚠️ ${successCount}개 성공, ${failedApps.length}개 실패: ${failedApps.join(', ')}`);
  } else {
    showToast('❌ 프롬프트 전송에 실패했습니다. 페이지가 완전히 로드되었는지 확인하세요.');
  }
}

function initWorkspace() {
  initAutoTheme();
  initSidebarToggle();
  initHelpButton();
  buildLookups();
  renderSidebar();
  initAppsFolderToggle();
  initCanvases();
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

  // 통합 입력창 이벤트 리스너
  const unifiedInput = document.getElementById('unified-input');
  const sendBtn = document.getElementById('send-btn');

  // 자동 높이 조정 함수
  function autoResizeTextarea() {
    unifiedInput.style.height = 'auto';
    unifiedInput.style.height = Math.min(unifiedInput.scrollHeight, 180) + 'px';
  }

  // 버튼 활성화/비활성화 함수
  function updateSendButtonState() {
    const hasText = unifiedInput?.value.trim().length > 0;
    if (sendBtn) {
      sendBtn.disabled = !hasText;
    }
  }

  // 초기 상태 설정 (비활성화)
  updateSendButtonState();

  // 입력 시 높이 자동 조정 및 버튼 상태 업데이트
  unifiedInput?.addEventListener('input', () => {
    autoResizeTextarea();
    updateSendButtonState();
  });

  // 통합 실행 함수
  function executeUnifiedCommand() {
    const input = unifiedInput?.value.trim();
    if (!input) return;

    // 슬래시로 시작하면 빠른 실행
    if (input.startsWith('/')) {
      executeQuickCommand(input);
    } else {
      // 일반 텍스트면 일괄 전송
      broadcastPromptToWindows(input);
    }

    // 입력창 초기화
    unifiedInput.value = '';
    autoResizeTextarea();
    updateSendButtonState();
  }

  // Send 버튼 클릭
  sendBtn?.addEventListener('click', executeUnifiedCommand);

  // Enter 키 처리
  unifiedInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      if (event.ctrlKey) {
        // Ctrl+Enter: 줄바꿈 (기본 동작)
        return;
      } else {
        // Enter: Send 실행
        event.preventDefault();
        executeUnifiedCommand();
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

// ==================== 커스텀 앱 관리 ====================
const CUSTOM_APPS_STORAGE_KEY = 'aispace_custom_apps';
let customApps = [];

function loadCustomApps() {
  try {
    const stored = localStorage.getItem(CUSTOM_APPS_STORAGE_KEY);
    customApps = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('커스텀 앱 불러오기 실패:', error);
    customApps = [];
  }
}

function saveCustomApps() {
  try {
    localStorage.setItem(CUSTOM_APPS_STORAGE_KEY, JSON.stringify(customApps));
  } catch (error) {
    console.warn('커스텀 앱 저장 실패:', error);
  }
}

function createAddButton() {
  const button = document.createElement('button');
  button.className = 'sidebar__app sidebar__app--add';
  button.type = 'button';
  button.setAttribute('aria-label', '커스텀 앱 추가');
  button.dataset.addButton = 'true';

  const iconHolder = document.createElement('div');
  iconHolder.className = 'sidebar__app-icon';
  iconHolder.textContent = '+';

  button.appendChild(iconHolder);
  
  button.addEventListener('click', openCustomAppModal);
  
  return button;
}

function renderCustomApps() {
  const appsList = document.getElementById('ai-app-list');
  if (!appsList) return;
  
  // 기존 커스텀 앱들 제거
  const existingCustomApps = appsList.querySelectorAll('[data-custom-app]');
  existingCustomApps.forEach(app => app.remove());
  
  // + 버튼 제거 (나중에 다시 추가)
  const addButton = appsList.querySelector('[data-add-button]');
  if (addButton) addButton.remove();
  
  // + 버튼 먼저 추가
  appsList.insertBefore(createAddButton(), appsList.firstChild);
  
  // 커스텀 앱들 추가
  customApps.forEach((app) => {
    const item = createCustomAppElement(app);
    appsList.insertBefore(item, appsList.children[1]); // + 버튼 다음에 추가
  });
}

function createCustomAppElement(app) {
  const item = document.createElement('button');
  item.className = 'sidebar__app';
  item.type = 'button';
  item.draggable = true;
  item.setAttribute('data-app-id', app.id);
  item.setAttribute('data-custom-app', 'true');
  item.setAttribute('aria-label', `${app.name} 창 열기`);

  const iconHolder = document.createElement('div');
  iconHolder.className = 'sidebar__app-icon';
  
  if (app.iconType === 'image' && app.iconData) {
    const img = document.createElement('img');
    img.src = app.iconData;
    img.alt = app.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    iconHolder.appendChild(img);
  } else {
    iconHolder.textContent = app.icon || app.name.substring(0, 2).toUpperCase();
  }

  const name = document.createElement('span');
  name.className = 'sidebar__app-name';
  name.textContent = app.name;

  // 삭제 버튼 추가 (우클릭 메뉴 대신 길게 누르기로 표시)
  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (confirm(`"${app.name}" 앱을 삭제하시겠습니까?`)) {
      deleteCustomApp(app.id);
    }
  });

  item.append(iconHolder, name);
  return item;
}

function deleteCustomApp(appId) {
  customApps = customApps.filter(app => app.id !== appId);
  saveCustomApps();
  renderCustomApps();
  showToast('커스텀 앱이 삭제되었습니다.');
}

function openCustomAppModal() {
  const modal = document.getElementById('custom-app-modal');
  if (modal) {
    modal.style.display = 'flex';
    // 폼 초기화
    document.getElementById('custom-app-form').reset();
  }
}

function closeCustomAppModal() {
  const modal = document.getElementById('custom-app-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function initCustomAppModal() {
  const modal = document.getElementById('custom-app-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const form = document.getElementById('custom-app-form');
  const overlay = modal?.querySelector('.custom-app-modal__overlay');
  
  // 닫기 버튼들
  closeBtn?.addEventListener('click', closeCustomAppModal);
  cancelBtn?.addEventListener('click', closeCustomAppModal);
  overlay?.addEventListener('click', closeCustomAppModal);
  
  // 아이콘 타입 변경 시 입력 필드 활성화/비활성화
  const iconTextRadio = document.getElementById('icon-text');
  const iconImageRadio = document.getElementById('icon-image');
  const iconTextInput = document.getElementById('app-icon-text');
  const iconImageInput = document.getElementById('app-icon-image');
  
  iconTextRadio?.addEventListener('change', () => {
    if (iconTextInput) iconTextInput.disabled = false;
    if (iconImageInput) iconImageInput.disabled = true;
  });
  
  iconImageRadio?.addEventListener('change', () => {
    if (iconTextInput) iconTextInput.disabled = true;
    if (iconImageInput) iconImageInput.disabled = false;
  });
  
  // 초기 상태 설정
  if (iconTextInput) iconTextInput.disabled = false;
  if (iconImageInput) iconImageInput.disabled = true;
  
  // 폼 제출
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const name = formData.get('name');
    const url = formData.get('url');
    const iconType = formData.get('icon-type');
    
    let iconData = null;
    let icon = '';
    
    if (iconType === 'text') {
      icon = formData.get('icon-text') || name.substring(0, 2).toUpperCase();
    } else if (iconType === 'image') {
      const fileInput = document.getElementById('app-icon-image');
      const file = fileInput.files[0];
      if (file) {
        // 이미지를 base64로 변환
        iconData = await fileToBase64(file);
      } else {
        // 이미지 파일이 없으면 텍스트로 fallback
        icon = name.substring(0, 2).toUpperCase();
      }
    }
    
    const newApp = {
      id: `custom-${Date.now()}`,
      name,
      url,
      icon,
      iconType,
      iconData,
      categoryId: 'custom'
    };
    
    customApps.push(newApp);
    appLookup.set(newApp.id, newApp);
    saveCustomApps();
    renderCustomApps();
    closeCustomAppModal();
    showToast(`"${name}" 앱이 추가되었습니다.`);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== 프로필 관리 ====================
const PROFILE_STORAGE_KEY = 'aispace_user_profile';
let userProfile = {
  name: 'User',
  avatar: null // base64 이미지 또는 null
};

function loadProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      userProfile = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('프로필 불러오기 실패:', error);
  }
}

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
  } catch (error) {
    console.warn('프로필 저장 실패:', error);
  }
}

function updateMyPageButton() {
  const myPageButton = document.getElementById('mypage-button');
  if (!myPageButton) return;
  
  const avatar = myPageButton.querySelector('.sidebar__mypage-avatar');
  const nameEl = myPageButton.querySelector('.sidebar__mypage-name');
  
  if (avatar) {
    // 기존 내용 제거
    avatar.innerHTML = '';
    
    if (userProfile.avatar) {
      // 이미지가 있으면 img 태그로 표시
      const img = document.createElement('img');
      img.src = userProfile.avatar;
      img.alt = userProfile.name;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      avatar.appendChild(img);
    } else {
      // 이미지가 없으면 첫 글자로 표시
      avatar.textContent = userProfile.name.charAt(0).toUpperCase();
    }
  }
  
  if (nameEl) {
    nameEl.textContent = userProfile.name;
  }
}

function openProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;
  
  // 현재 프로필 정보를 폼에 반영
  const nameInput = document.getElementById('profile-name');
  const avatarPreview = document.getElementById('profile-avatar-preview');
  
  if (nameInput) {
    nameInput.value = userProfile.name;
  }
  
  if (avatarPreview) {
    avatarPreview.innerHTML = '';
    
    if (userProfile.avatar) {
      const img = document.createElement('img');
      img.src = userProfile.avatar;
      img.alt = userProfile.name;
      avatarPreview.appendChild(img);
    } else {
      avatarPreview.textContent = userProfile.name.charAt(0).toUpperCase();
    }
  }
  
  modal.style.display = 'flex';
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function initProfileModal() {
  const modal = document.getElementById('profile-modal');
  const closeBtn = document.getElementById('profile-modal-close-btn');
  const cancelBtn = document.getElementById('profile-modal-cancel-btn');
  const form = document.getElementById('profile-form');
  const overlay = modal?.querySelector('.profile-modal__overlay');
  const avatarUpload = document.getElementById('profile-avatar-upload');
  const avatarRemove = document.getElementById('profile-avatar-remove');
  const avatarPreview = document.getElementById('profile-avatar-preview');
  const myPageButton = document.getElementById('mypage-button');
  
  // 닫기 버튼들
  closeBtn?.addEventListener('click', closeProfileModal);
  cancelBtn?.addEventListener('click', closeProfileModal);
  overlay?.addEventListener('click', closeProfileModal);
  
  // 마이페이지 버튼 클릭
  myPageButton?.addEventListener('click', openProfileModal);
  
  // 아바타 업로드
  avatarUpload?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const base64 = await fileToBase64(file);
      
      // 미리보기 업데이트
      if (avatarPreview) {
        avatarPreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = base64;
        img.alt = 'Preview';
        avatarPreview.appendChild(img);
      }
      
      // 임시 저장 (실제 저장은 폼 제출 시)
      userProfile.avatar = base64;
    } catch (error) {
      showToast('이미지 업로드 실패');
      console.error(error);
    }
  });
  
  // 아바타 제거
  avatarRemove?.addEventListener('click', () => {
    userProfile.avatar = null;
    
    if (avatarPreview) {
      avatarPreview.innerHTML = '';
      const nameInput = document.getElementById('profile-name');
      const name = nameInput ? nameInput.value : 'U';
      avatarPreview.textContent = name.charAt(0).toUpperCase();
    }
  });
  
  // 폼 제출
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nameInput = document.getElementById('profile-name');
    const newName = nameInput?.value.trim();
    
    if (!newName) {
      showToast('이름을 입력하세요.');
      return;
    }
    
    userProfile.name = newName;
    saveProfile();
    updateMyPageButton();
    closeProfileModal();
    showToast('프로필이 저장되었습니다.');
  });
}

// 라이선스 모달 관련 함수들
function showLicenseModal() {
  const modal = document.getElementById('license-modal');
  if (modal) {
    modal.style.display = 'flex';
    const licenseInput = document.getElementById('license-key');
    if (licenseInput) {
      licenseInput.focus();
    }
  }
}

function hideLicenseModal() {
  const modal = document.getElementById('license-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function showLicenseMessage(text, type) {
  const messageEl = document.getElementById('license-message');
  if (messageEl) {
    messageEl.textContent = text;
    messageEl.className = `license-modal__message license-modal__message--${type}`;
  }
}

function hideLicenseMessage() {
  const messageEl = document.getElementById('license-message');
  if (messageEl) {
    messageEl.textContent = '';
    messageEl.className = 'license-modal__message';
  }
}

// 라이선스 모달 초기화
function initLicenseModal() {
  const form = document.getElementById('license-form');
  const submitBtn = document.getElementById('license-submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const licenseKey = document.getElementById('license-key')?.value.trim();
    
    if (!licenseKey) {
      showLicenseMessage('라이선스 키를 입력하세요.', 'error');
      return;
    }

    // 버튼 비활성화
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '인증 중...';
    }

    showLicenseMessage('인증 중...', 'info');

    try {
      // 동적으로 import
      const { verifyLicense, saveLicense } = await import('./license.js');
      const result = await verifyLicense(licenseKey);

      if (result.success) {
        saveLicense({
          key: licenseKey,
          expiresAt: result.license?.expiresAt,
          verifiedAt: new Date().toISOString(),
        });
        showLicenseMessage('인증 성공! 잠시 후 앱이 시작됩니다.', 'success');
        
        setTimeout(() => {
          hideLicenseModal();
          location.reload(); // 앱 재시작
        }, 1500);
      } else {
        showLicenseMessage(result.error || '인증 실패', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '인증';
        }
      }
    } catch (error) {
      console.error('라이선스 검증 오류:', error);
      showLicenseMessage('인증 중 오류가 발생했습니다.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '인증';
      }
    }
  });

  // 라이선스 키 입력 시 자동 포맷팅 (XXXX-XXXX-XXXX-XXXX)
  const licenseInput = document.getElementById('license-key');
  if (licenseInput) {
    licenseInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (value.length > 16) value = value.substring(0, 16);
      
      // 하이픈 추가
      const formatted = value.match(/.{1,4}/g)?.join('-') || value;
      e.target.value = formatted;
      
      // 메시지 숨기기
      hideLicenseMessage();
    });
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // 라이선스 모듈 import
  const { isLicenseValid, verifyLicense, saveLicense } = await import('./license.js');
  
  // 라이선스 검증
  if (!isLicenseValid()) {
    // 라이선스 모달 초기화 및 표시
    initLicenseModal();
    showLicenseModal();
    return; // 라이선스가 없으면 앱 초기화 중단
  }

  // 커스텀 앱을 먼저 불러와서 appLookup에 추가 (캔버스 복원 전에 필요)
  loadCustomApps();
  customApps.forEach(app => {
    appLookup.set(app.id, app);
  });
  
  // 프로필 불러오기
  loadProfile();
  
  // 워크스페이스 초기화 (캔버스 복원 포함)
  initWorkspace();
  
  // 커스텀 앱 UI 렌더링
  renderCustomApps();
  initCustomAppModal();
  
  // 프로필 모달 초기화 및 마이페이지 버튼 업데이트
  initProfileModal();
  updateMyPageButton();
});

