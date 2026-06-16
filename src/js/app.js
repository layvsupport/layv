// ==================== PROJECT MANAGEMENT ====================
const PROJECTS_STORAGE_KEY = 'aispace_projects';
const LIKED_PROJECT_IDS_KEY = 'aispace_liked_project_ids';
const PROJECT_SORT_KEY = 'aispace_project_sort';
const SAVED_ITEMS_STORAGE_KEY = 'aispace_saved_items';
const SORT_OPTIONS = [
  { value: 'dateCreated', label: 'Date created' },
  { value: 'nameAsc', label: 'Name (A-Z)' },
  { value: 'nameDesc', label: 'Name (Z-A)' },
];
let projectsData = [];
let activeProjectId = null;
let likedProjectIds = [];
let projectSortBy = 'dateCreated';

// ==================== PROJECT FOLDERS ====================
const PROJECT_FOLDERS_STORAGE_KEY = 'aispace_project_folders';
const DEFAULT_HOME_PROJECT_FOLDER_NAME = 'Name the folder';
const DEFAULT_WORKSPACE_FOLDER_NAME = DEFAULT_HOME_PROJECT_FOLDER_NAME;
let projectFoldersData = []; // [{ id, name }]
let activeProjectFolderId = null; // 현재 선택된 홈 사이드바 폴더

function loadProjectFolders() {
  try {
    const stored = localStorage.getItem(PROJECT_FOLDERS_STORAGE_KEY);
    projectFoldersData = stored ? JSON.parse(stored) : [];
  } catch {
    projectFoldersData = [];
  }
}

function saveProjectFolders() {
  try {
    localStorage.setItem(PROJECT_FOLDERS_STORAGE_KEY, JSON.stringify(projectFoldersData));
  } catch {}
}

function loadLikedProjectIds() {
  try {
    const stored = localStorage.getItem(LIKED_PROJECT_IDS_KEY);
    likedProjectIds = stored ? JSON.parse(stored) : [];
  } catch (e) {
    likedProjectIds = [];
  }
}

function saveLikedProjectIds() {
  try {
    localStorage.setItem(LIKED_PROJECT_IDS_KEY, JSON.stringify(likedProjectIds));
  } catch (e) {}
}

function toggleLikedProject(projectId) {
  const idx = likedProjectIds.indexOf(projectId);
  if (idx === -1) likedProjectIds.push(projectId);
  else likedProjectIds.splice(idx, 1);
  saveLikedProjectIds();
}

function generateProjectId() {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

const DEFAULT_PROJECT_THUMB_PALETTE = ['#C9D5FF', '#ADBDFF', '#879EFF', '#708BFF'];

function isValidThumbHex(color) {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

function pickRandomProjectThumbColor() {
  return DEFAULT_PROJECT_THUMB_PALETTE[Math.floor(Math.random() * DEFAULT_PROJECT_THUMB_PALETTE.length)];
}

/** 커스텀 썸네일 없을 때 단색 thumbColor 보장 (구 thumbGradient 마이그레이션) */
function ensureProjectThumbColor(project) {
  if (project.customThumbnail) return false;

  if (isValidThumbHex(project.thumbColor)) {
    if (project.thumbGradient !== undefined) {
      delete project.thumbGradient;
      return true;
    }
    return false;
  }

  const g = project.thumbGradient;
  if (Array.isArray(g) && g.length > 0) {
    const pick = g[Math.floor(Math.random() * g.length)];
    project.thumbColor = isValidThumbHex(pick) ? pick : pickRandomProjectThumbColor();
  } else if (typeof g === 'string' && isValidThumbHex(g)) {
    project.thumbColor = g;
  } else {
    project.thumbColor = pickRandomProjectThumbColor();
  }

  delete project.thumbGradient;
  return true;
}

function loadProjects() {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    projectsData = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('프로젝트 불러오기 실패:', error);
    projectsData = [];
  }
  projectsData.forEach(ensureProjectSavedPromptLibrary);
  migrateGlobalSavedItemsToProjectsIfNeeded();
  migrateSavedPromptItemsMissingAppId();
  try {
    const sortStored = localStorage.getItem(PROJECT_SORT_KEY);
    if (sortStored && SORT_OPTIONS.some(o => o.value === sortStored)) projectSortBy = sortStored;
  } catch (_) {}
}

function ensureProjectSavedPromptLibrary(project) {
  if (!project.savedPromptLibrary || !Array.isArray(project.savedPromptLibrary.folders)) {
    project.savedPromptLibrary = { folders: [] };
  }
}

/** 구 전역 localStorage(aispace_saved_items) → 첫 빈 프로젝트 라이브러리로 1회 이전 */
function migrateGlobalSavedItemsToProjectsIfNeeded() {
  try {
    const stored = localStorage.getItem(SAVED_ITEMS_STORAGE_KEY);
    if (!stored) return;
    const global = JSON.parse(stored);
    const hasItems = global.folders?.some(f => Array.isArray(f.items) && f.items.length > 0);
    if (!hasItems) return;

    const activeProjects = projectsData.filter(p => !p.deletedAt);
    let target = activeProjects.find(p =>
      !p.savedPromptLibrary.folders.some(f => Array.isArray(f.items) && f.items.length > 0)
    );
    if (!target) target = activeProjects[0];
    if (!target) return;

    target.savedPromptLibrary = global;
    saveProjects();
    localStorage.removeItem(SAVED_ITEMS_STORAGE_KEY);
  } catch (e) {
    console.warn('전역 저장 프롬프트 마이그레이션 실패:', e);
  }
}

/** appId 없는 구 저장 항목: 프로젝트에 단일 AI만 쓰였을 때만 보수적으로 backfill */
function migrateSavedPromptItemsMissingAppId() {
  let changed = false;
  projectsData.forEach((project) => {
    ensureProjectSavedPromptLibrary(project);
    const usedApps = getProjectAppIds(project);
    if (usedApps.length !== 1) return;
    const soleAppId = usedApps[0];
    (project.savedPromptLibrary.folders || []).forEach((folder) => {
      (folder.items || []).forEach((item) => {
        if (!item.appId) {
          item.appId = soleAppId;
          changed = true;
        }
      });
    });
  });
  if (changed) saveProjects();
}

function saveProjects() {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projectsData));
  } catch (error) {
    console.warn('프로젝트 저장 실패:', error);
  }
}

function createProject(name = null) {
  // New project 버튼 등: folderId 없음(미배정). 폴더 배정은 사이드바 드래그로만.
  const project = {
    id: generateProjectId(),
    name: name || 'Untitled Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnail: null,
    thumbColor: pickRandomProjectThumbColor(),
    canvasesData: null,
    usedApps: [],
    savedPromptLibrary: { folders: [] },
  };

  projectsData.unshift(project);
  saveProjects();
  renderProjectCards();
  renderFolderTree();
  return project;
}

function deleteProject(projectId) {
  projectsData = projectsData.filter(p => p.id !== projectId);
  if (likedProjectIds.includes(projectId)) {
    likedProjectIds = likedProjectIds.filter(id => id !== projectId);
    saveLikedProjectIds();
  }
  saveProjects();
  renderProjectCards();
}

/** 휴지통에서 프로젝트 복원 */
function restoreProjectFromTrash(projectId) {
  const project = projectsData.find(p => p.id === projectId);
  if (!project || !project.deletedAt) return;
  delete project.deletedAt;
  saveProjects();
  renderProjectCards();
}

/** 휴지통에서 프로젝트 영구 삭제 (확인 모달) */
async function permanentlyDeleteProjectWithConfirm(projectId) {
  const ok = await showConfirmModal(
    'Are you sure you want to delete this item? Deletion will take effect immediately and cannot be undone or recovered.',
    { title: 'Delete File', okText: 'Delete', cancelText: 'Cancel' }
  );
  if (!ok) return;
  deleteProject(projectId);
}

/** 프로젝트를 Trash로 이동 (deletedAt 설정) */
function moveProjectToTrash(projectId) {
  const project = projectsData.find(p => p.id === projectId);
  if (!project) return;
  project.deletedAt = new Date().toISOString();
  saveProjects();
  exitHomeEditMode();
  renderProjectCards();
}

/** 커스텀 확인 모달 (Electron에서 confirm()이 무시될 수 있어 직접 구현) */
function showConfirmModal(message, options = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    if (!modal || !msgEl || !okBtn || !cancelBtn) { resolve(false); return; }

    if (titleEl) titleEl.textContent = options.title || 'Confirm deletion';
    msgEl.innerHTML = String(message ?? 'Are you sure you want to delete this item?').replace(/\n/g, '<br>');
    okBtn.textContent = options.okText || 'Delete';
    cancelBtn.textContent = options.cancelText || 'Cancel';
    modal.style.display = 'flex';

    function cleanup(result) {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      modal.querySelector('.confirm-modal__overlay')?.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modal.querySelector('.confirm-modal__overlay')?.addEventListener('click', onCancel);
  });
}

/**
 * 통합 확인 다이얼로그 (객체 옵션 + 선택적 콜백)
 * @returns {Promise<boolean>}
 */
function showConfirmDialog({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
  return showConfirmModal(message, {
    title,
    okText: confirmText,
    cancelText
  }).then((ok) => {
    if (ok) onConfirm?.();
    else onCancel?.();
    return ok;
  });
}

/** Info-only alert modal (replaces native alert()) */
function showAlertModal(message, options = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-modal-title');
    const msgEl = document.getElementById('alert-modal-message');
    const okBtn = document.getElementById('alert-modal-ok');
    if (!modal || !msgEl || !okBtn) { resolve(); return; }

    if (titleEl) titleEl.textContent = options.title || 'Notice';
    msgEl.innerHTML = String(message ?? '').replace(/\n/g, '<br>');
    okBtn.textContent = options.okText || 'OK';
    modal.style.display = 'flex';

    function cleanup() {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      modal.querySelector('.confirm-modal__overlay')?.removeEventListener('click', onOk);
      document.removeEventListener('keydown', onKey);
      resolve();
    }
    function onOk() { cleanup(); }
    function onKey(e) {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); onOk(); }
    }

    okBtn.addEventListener('click', onOk);
    modal.querySelector('.confirm-modal__overlay')?.addEventListener('click', onOk);
    document.addEventListener('keydown', onKey);
    okBtn.focus();
  });
}

/** 입력 모달 (Electron 등에서 window.prompt 미지원 시 대체) */
function showPromptModal(message, defaultValue = '', options = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('prompt-input-modal');
    const titleEl = document.getElementById('prompt-input-modal-title');
    const msgEl = document.getElementById('prompt-input-modal-message');
    const input = document.getElementById('prompt-input-modal-input');
    const okBtn = document.getElementById('prompt-input-modal-ok');
    const cancelBtn = document.getElementById('prompt-input-modal-cancel');
    const overlay = modal?.querySelector('.confirm-modal__overlay');
    if (!modal || !input || !okBtn || !cancelBtn) { resolve(null); return; }

    if (titleEl) titleEl.textContent = options.title || 'Input';
    if (msgEl) {
      msgEl.textContent = message || '';
      msgEl.style.display = message ? '' : 'none';
    }
    input.value = defaultValue == null ? '' : String(defaultValue);
    okBtn.textContent = options.okText || 'OK';
    cancelBtn.textContent = options.cancelText || 'Cancel';
    modal.style.display = 'flex';

    let settled = false;
    function finish(value) {
      if (settled) return;
      settled = true;
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
      overlay?.removeEventListener('click', onCancel);
      resolve(value);
    }
    function onOk() { finish(input.value); }
    function onCancel() { finish(null); }
    function onKey(e) {
      if (e.key === 'Enter') { e.preventDefault(); onOk(); }
      else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
    overlay?.addEventListener('click', onCancel);
    requestAnimationFrame(() => { input.focus(); input.select(); });
  });
}

/** 휴지통 내 항목 전부 영구 삭제 (Electron에서 confirm()이 안 뜨는 경우 대비 → showConfirmModal) */
async function deleteAllFromTrash() {
  const inTrash = projectsData.filter(p => p.deletedAt);
  if (inTrash.length === 0) return;
  const ok = await showConfirmModal(
    'Permanently delete all items in Trash?\nThis action cannot be undone.',
    { title: 'Empty Trash', okText: 'Delete all', cancelText: 'Cancel' }
  );
  if (!ok) return;
  projectsData = projectsData.filter(p => !p.deletedAt);
  saveProjects();
  renderProjectCards();
  updateHomeToolbarForView();
}

/** 휴지통 내 항목 전부 복원 */
function restoreAllFromTrash() {
  const inTrash = projectsData.filter(p => p.deletedAt);
  if (inTrash.length === 0) return;
  inTrash.forEach(p => { delete p.deletedAt; });
  saveProjects();
  renderProjectCards();
  updateHomeToolbarForView();
}

function getActiveHomeMenu() {
  const active = document.querySelector('.home-sidebar__menu-item--active');
  return active ? (active.getAttribute('data-menu') || 'library') : 'library';
}

/** 휴지통 뷰일 때 편집 숨김, New project → Delete all, 정렬 → Restore all */
function updateHomeToolbarForView() {
  const isTrashView = getActiveHomeMenu() === 'trash';
  if (isTrashView) exitHomeEditMode();
  const editBtn = document.getElementById('home-edit-btn');
  const newProjectBtn = document.getElementById('home-new-project-btn');
  const sortBtn = document.getElementById('home-sort-btn');
  const sortLabel = sortBtn?.querySelector('.home-actions__btn-sort-label');
  const newLabelSpan = newProjectBtn?.querySelector('span:last-child');

  if (editBtn) editBtn.style.display = isTrashView ? 'none' : '';
  if (newLabelSpan) newLabelSpan.textContent = isTrashView ? 'Delete all' : 'New project';
  if (sortLabel) sortLabel.textContent = isTrashView ? 'Restore all' : (SORT_OPTIONS.find(o => o.value === projectSortBy)?.label || 'Date created');
  if (sortBtn) {
    sortBtn.setAttribute('aria-haspopup', isTrashView ? 'false' : 'true');
    const arrow = sortBtn.querySelector('.home-actions__btn-sort-arrow');
    if (arrow) arrow.style.display = isTrashView ? 'none' : '';
  }
}

function updateProjectName(projectId, newName) {
  const project = projectsData.find(p => p.id === projectId);
  if (project) {
    project.name = newName.trim() || project.name;
    project.updatedAt = new Date().toISOString();
    saveProjects();
  }
}

function getProjectUsedApps(project) {
  if (!project || !project.canvasesData) return [];
  try {
    const data = typeof project.canvasesData === 'string' 
      ? JSON.parse(project.canvasesData) 
      : project.canvasesData;
    const appIds = new Set();
    if (data && data.canvases) {
      data.canvases.forEach(canvas => {
        if (canvas.windows) {
          canvas.windows.forEach(w => {
            if (w.appId) appIds.add(w.appId);
          });
        }
      });
    }
    return Array.from(appIds);
  } catch {
    return [];
  }
}

/** 프로젝트에 연결된 AI 앱 id 목록 (usedApps 우선, 없으면 캔버스에서 추출) */
function getProjectAppIds(project) {
  if (!project) return [];
  if (project.usedApps?.length) return [...project.usedApps];
  return getProjectUsedApps(project);
}

// 프로젝트의 첫 번째(활성) 캔버스에서 창 정보 추출
function getProjectWindowsPreview(project) {
  if (!project || !project.canvasesData) return [];
  try {
    const data = typeof project.canvasesData === 'string'
      ? JSON.parse(project.canvasesData)
      : project.canvasesData;
    if (!data || !data.canvases || data.canvases.length === 0) return [];
    // 활성 캔버스 또는 첫 번째 캔버스
    const canvas = data.canvases.find(c => c.id === data.activeCanvasId) || data.canvases[0];
    if (!canvas.windows || canvas.windows.length === 0) return [];
    return canvas.windows.map(w => {
      const app = appLookup.get(w.appId);
      return {
        appId: w.appId,
        name: app ? app.name : w.appId,
        accent: app ? app.accent : null,
        faviconUrl: app ? getAppFaviconUrl(app, 64) : null,
        fallback: app ? app.icon : (w.appId || '??').substring(0, 2).toUpperCase(),
      };
    });
  } catch {
    return [];
  }
}

// 미니 레이아웃 프리뷰 HTML 생성
function buildThumbnailPreview(windows) {
  if (!windows || windows.length === 0) return '';
  const count = Math.min(windows.length, 4);
  let gridClass = 'thumb-preview--1';
  if (count === 2) gridClass = 'thumb-preview--2';
  else if (count === 3) gridClass = 'thumb-preview--3';
  else if (count >= 4) gridClass = 'thumb-preview--4';

  const cells = windows.slice(0, 4).map(w => {
    const bg = w.accent || 'linear-gradient(135deg, rgba(140,170,255,0.15), rgba(160,150,255,0.12))';
    const iconHtml = w.faviconUrl
      ? `<img src="${w.faviconUrl}" alt="${w.name}" class="thumb-preview__icon" onerror="this.outerHTML='<span class=\\'thumb-preview__fallback\\'>${w.fallback}</span>'">`
      : `<span class="thumb-preview__fallback">${w.fallback}</span>`;
    return `<div class="thumb-preview__cell" style="background: ${bg}">
      ${iconHtml}
      <span class="thumb-preview__name">${w.name}</span>
    </div>`;
  }).join('');

  return `<div class="thumb-preview ${gridClass}">${cells}</div>`;
}

function renderProjectCards() {
  const grid = document.getElementById('project-grid');
  if (!grid) return;
  grid.classList.remove('project-grid--collection');
  grid.innerHTML = '';

  const menu = getActiveHomeMenu();
  const tab = getActiveHomeTab();
  const isTrashView = menu === 'trash';
  const isLikedTab = tab === 'liked';

  let list;
  if (isTrashView) {
    list = projectsData.filter(p => p.deletedAt);
  } else {
    let active = projectsData.filter(p => !p.deletedAt);
    // 폴더 필터 (Project 탭에서만 적용)
    if (!isLikedTab && activeProjectFolderId) {
      active = active.filter(p => p.folderId === activeProjectFolderId);
    }
    list = isLikedTab ? active.filter(p => likedProjectIds.includes(p.id)) : active;
  }

  if (isTrashView) grid.classList.add('project-grid--trash-view');
  else grid.classList.remove('project-grid--trash-view');

  // 정렬 적용 (Project / Liked만, Trash는 제외)
  if (!isTrashView && list.length > 0) {
    list = [...list];
    if (projectSortBy === 'dateCreated') {
      list.sort((a, b) => (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0)));
    } else if (projectSortBy === 'nameAsc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    } else if (projectSortBy === 'nameDesc') {
      list.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' }));
    }
  }

  if (list.length === 0) {
    grid.classList.add('project-grid--empty');
    const emptyTitle = 'No projects yet';
    grid.innerHTML = `
      <div class="project-grid__empty">
        <p class="project-grid__empty-title">${emptyTitle}</p>
      </div>
    `;
    return;
  }
  grid.classList.remove('project-grid--empty');

  let thumbColorMigrated = false;
  list.forEach(project => {
    if (ensureProjectThumbColor(project)) thumbColorMigrated = true;
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.projectId = project.id;

    const usedApps = project.usedApps && project.usedApps.length > 0 
      ? project.usedApps 
      : getProjectUsedApps(project);

    const appsHtml = usedApps.slice(0, 4).map(appId => {
      const app = appLookup.get(appId);
      const fallback = app ? app.icon : appId.substring(0, 2).toUpperCase();
      const favUrl = app ? getAppFaviconUrl(app, 32) : null;
      if (favUrl) {
        return `<div class="project-card__app-icon" title="${app ? app.name : appId}"><img src="${favUrl}" alt="${app ? app.name : appId}" class="project-card__app-icon-img" onerror="this.remove();this.parentElement.textContent='${fallback}'"></div>`;
      }
      return `<div class="project-card__app-icon" title="${app ? app.name : appId}">${fallback}</div>`;
    }).join('');

    const isLiked = likedProjectIds.includes(project.id);
    const heartSrc = isLiked ? 'assets/icons/heart_fill.svg' : 'assets/icons/heart.svg';

    const thumbBg = project.customThumbnail
      ? ''
      : ` style="background-color: ${project.thumbColor}"`;
    const thumbImgHtml = project.customThumbnail
      ? `<img src="${project.customThumbnail}" alt="${project.name}">`
      : '';

    const thumbnailActionsHtml = isTrashView
      ? `
        <button type="button" class="project-card__restore" data-restore-project="${project.id}" title="Restore">
          <img src="assets/icons/SVG/back.svg" alt="">
        </button>
        <button type="button" class="project-card__delete" data-delete-project="${project.id}" title="Delete permanently">
          <img src="assets/icons/SVG/X-project.svg" alt="">
        </button>
      `
      : `
        <button type="button" class="project-card__like" data-like-project="${project.id}" title="${isLiked ? 'Liked' : 'Add to Liked Projects'}">
          <img src="${heartSrc}" alt="">
        </button>
        <button type="button" class="project-card__trash" data-trash-project="${project.id}" title="Trash에 넣기">
          <img src="assets/icons/trash.svg" alt="">
        </button>
        <button type="button" class="project-card__edit-image" data-edit-thumb="${project.id}" title="사진 변경">
          <img src="assets/icons/image.svg" alt="">
        </button>
      `;

    card.innerHTML = `
      <div class="project-card__thumbnail${project.customThumbnail ? '' : ' project-card__thumbnail--solid'}"${thumbBg}>
        ${thumbImgHtml}
        ${thumbnailActionsHtml}
      </div>
      <div class="project-card__info">
        <span class="project-card__name">${project.name}</span>
        <div class="project-card__apps">${appsHtml}</div>
      </div>
    `;

    // 카드 이름 더블클릭으로 이름 변경 (휴지통 뷰에서는 비활성화)
    const nameEl = card.querySelector('.project-card__name');
    if (nameEl && !isTrashView) {
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const currentName = nameEl.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'project-card__name-input';
        input.value = currentName;
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        
        const finish = () => {
          const newName = input.value.trim() || currentName;
          updateProjectName(project.id, newName);
          const newSpan = document.createElement('span');
          newSpan.className = 'project-card__name';
          newSpan.textContent = newName;
          input.replaceWith(newSpan);
        };
        
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          if (ev.key === 'Escape') { input.value = currentName; input.blur(); }
        });
      });
    }

    // 카드 클릭 → 편집 모드가 아닐 때만 프로젝트 열기
    card.addEventListener('click', (e) => {
      if (card.classList.contains('project-card--editing')) return;
      if (e.target.closest('[data-like-project]')) return;
      if (e.target.closest('[data-trash-project]')) return;
      if (e.target.closest('[data-restore-project]')) return;
      if (e.target.closest('[data-delete-project]')) return;
      if (e.target.closest('.project-card__name-input')) return;
      openProject(project.id);
    });

    // 편집 모드: 제목 클릭 → 인라인 수정
    const nameElForEdit = card.querySelector('.project-card__name');
    if (nameElForEdit) {
      nameElForEdit.addEventListener('click', (e) => {
        if (!card.classList.contains('project-card--editing')) return;
        e.stopPropagation();
        const currentName = nameElForEdit.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'project-card__name-input';
        input.value = currentName;
        nameElForEdit.replaceWith(input);
        input.focus();
        input.select();
        const finish = () => {
          const newName = input.value.trim() || currentName;
          updateProjectName(project.id, newName);
          const newSpan = document.createElement('span');
          newSpan.className = 'project-card__name';
          newSpan.textContent = newName;
          input.replaceWith(newSpan);
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          if (ev.key === 'Escape') { input.value = currentName; input.blur(); }
        });
      });
    }

    // 편집 모드: 휴지통 버튼 → Trash로 이동
    const trashBtn = card.querySelector('[data-trash-project]');
    if (trashBtn) {
      trashBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveProjectToTrash(project.id);
      });
    }

    // 편집 모드: 썸네일 변경 버튼
    const editThumbBtn = card.querySelector('[data-edit-thumb]');
    if (editThumbBtn) {
      editThumbBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.addEventListener('change', () => {
          const file = fileInput.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            project.customThumbnail = dataUrl;
            saveProjects();
            const thumbEl = card.querySelector('.project-card__thumbnail');
            if (!thumbEl) return;
            thumbEl.classList.remove('project-card__thumbnail--solid');
            thumbEl.style.background = '';
            let thumbImg = thumbEl.querySelector(':scope > img');
            if (!thumbImg) {
              thumbImg = document.createElement('img');
              thumbImg.alt = project.name;
              thumbEl.insertBefore(thumbImg, thumbEl.firstChild);
            }
            thumbImg.src = dataUrl;
          };
          reader.readAsDataURL(file);
        });
        fileInput.click();
      });
    }

    // 하트 버튼: Liked Projects 토글
    const likeBtn = card.querySelector('[data-like-project]');
    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLikedProject(project.id);
        const nowLiked = likedProjectIds.includes(project.id);
        const img = likeBtn.querySelector('img');
        if (img) img.src = nowLiked ? 'assets/icons/heart_fill.svg' : 'assets/icons/heart.svg';
        likeBtn.title = nowLiked ? 'Liked' : 'Add to Liked Projects';
      });
    }

    const restoreBtn = card.querySelector('[data-restore-project]');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreProjectFromTrash(project.id);
      });
    }

    const deleteBtn = card.querySelector('[data-delete-project]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        permanentlyDeleteProjectWithConfirm(project.id);
      });
    }

    if (homeEditMode && !isTrashView) card.classList.add('project-card--editing');
    grid.appendChild(card);
  });

  if (thumbColorMigrated) saveProjects();
}

// ==================== WORKSPACE CAPTURE ====================
async function captureWorkspaceThumbnail() {
  const canvas = document.getElementById('workspace-canvas');
  if (!canvas || typeof html2canvas === 'undefined') return null;
  try {
    const captured = await html2canvas(canvas, {
      scale: 0.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#f0f2f8',
      ignoreElements: (el) => {
        return el.hasAttribute('data-resize-handle');
      },
      onclone: (clonedDoc) => {
        // iframe을 앱 아이콘+이름 오버레이로 교체
        const clonedCanvas = clonedDoc.getElementById('workspace-canvas');
        if (!clonedCanvas) return;
        clonedCanvas.querySelectorAll('[data-frame-container]').forEach(container => {
          const windowEl = container.closest('.ai-window');
          const appId = windowEl ? windowEl.dataset.appId : null;
          const app = appId ? appLookup.get(appId) : null;
          const favUrl = app ? getAppFaviconUrl(app, 64) : null;
          const name = app ? app.name : '';
          const accent = app ? app.accent : 'linear-gradient(135deg, rgba(140,170,255,0.2), rgba(160,150,255,0.15))';

          container.innerHTML = '';
          container.style.cssText = `
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 10px; height: 100%; background: ${accent};
          `;
          if (favUrl) {
            const img = clonedDoc.createElement('img');
            img.src = favUrl;
            img.style.cssText = 'width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.6);padding:6px;box-sizing:border-box;';
            container.appendChild(img);
          }
          const label = clonedDoc.createElement('span');
          label.textContent = name;
          label.style.cssText = 'font-size:14px;font-weight:600;color:rgba(0,0,0,0.5);';
          container.appendChild(label);
        });
      },
    });
    return captured.toDataURL('image/jpeg', 0.6);
  } catch (err) {
    console.warn('워크스페이스 캡처 실패:', err);
    return null;
  }
}

// ==================== VIEW NAVIGATION ====================
async function showHomeView() {
  const homeView = document.getElementById('home-view');
  const workspaceView = document.getElementById('workspace-view');

  const leavingProjectId = activeProjectId;

  // 나가기 전에 캔버스만 먼저 저장 (activeProjectId 필요)
  if (leavingProjectId) saveCurrentProjectCanvases();

  clearWorkspaceSourceAppId();

  // 화면 먼저 전환 (딜레이 없이 바로 메인으로)
  if (homeView) homeView.classList.add('view-visible');
  if (workspaceView) workspaceView.classList.remove('view-visible');
  activeProjectId = null;

  updateHomeEditButtonIcon();
  updateHomeProfile();
  resetWorkspaceWelcomeOverlayWithoutPersist();
  hideWorkspaceOnboardingOverlayWithoutPersist();
  renderHomeGridByActiveTab();
  maybeShowHomeOnboardingOverlay();

  // 썸네일 캡처는 백그라운드에서 (화면 전환 후에도 workspace DOM은 있음)
  if (leavingProjectId) {
    const thumbnail = await captureWorkspaceThumbnail();
    const project = projectsData.find(p => p.id === leavingProjectId);
    if (project && thumbnail) {
      project.thumbnail = thumbnail;
    }
    saveProjects();
  }
}

function showWorkspaceView(projectId) {
  resetWorkspaceWelcomeOverlayWithoutPersist();
  hideHomeOnboardingOverlayWithoutPersist();

  const homeView = document.getElementById('home-view');
  const workspaceView = document.getElementById('workspace-view');

  // 이전 프로젝트 저장 라이브러리 퍼시스트
  if (activeProjectId && activeProjectId !== projectId) {
    persistSavedItemsToProject(activeProjectId);
  }

  clearWorkspaceSourceAppId();

  if (homeView) homeView.classList.remove('view-visible');
  if (workspaceView) workspaceView.classList.add('view-visible');

  activeProjectId = projectId;

  // 새 프로젝트 저장 라이브러리 로드
  hydrateSavedItemsFromProject(projectId);
  resetWorkspaceSavedFolderExpandState(savedItemsData.folders);
  renderSavedItems();

  // 해당 프로젝트의 캔버스 데이터 로드
  loadProjectCanvases(projectId);

  maybeShowWorkspaceOnboardingOverlay();

  // 환영 오버레이 (첫 진입 시)
  const welcomeKey = WORKSPACE_WELCOME_KEY_PREFIX + projectId;
  if (!localStorage.getItem(welcomeKey)) {
    setTimeout(() => showWorkspaceWelcomeOverlay(projectId), 320);
  }
}

function openProject(projectId) {
  const project = projectsData.find(p => p.id === projectId);
  if (!project) return;
  showWorkspaceView(projectId);
}

function saveCurrentProjectCanvases() {
  if (!activeProjectId) return;
  const project = projectsData.find(p => p.id === activeProjectId);
  if (!project) return;

  // 현재 캔버스 데이터를 프로젝트에 저장
  const canvasesExport = {
    canvases: Array.from(state.canvases.values()).map(canvas => ({
      id: canvas.id,
      name: canvas.name,
      windows: Array.from(canvas.windows.values()),
    })),
    activeCanvasId: state.activeCanvasId,
    canvasIdCounter,
  };
  project.canvasesData = canvasesExport;
  
  // usedApps 업데이트
  project.usedApps = getProjectUsedApps(project);
  project.updatedAt = new Date().toISOString();
  saveProjects();
}

function loadProjectCanvases(projectId) {
  const project = projectsData.find(p => p.id === projectId);
  if (!project) return;

  // 기존 캔버스 데이터 초기화
  state.canvases.clear();
  state.activeCanvasId = null;

  if (project.canvasesData) {
    try {
      const data = typeof project.canvasesData === 'string' 
        ? JSON.parse(project.canvasesData) 
        : project.canvasesData;
      
      data.canvases.forEach(canvasData => {
        const canvas = {
          id: canvasData.id,
          name: canvasData.name,
          windows: new Map(canvasData.windows.map((w, index) => {
            const app = appLookup.get(w.appId) || w.app;
            return [w.id, { ...w, app, order: w.order !== undefined ? w.order : index }];
          })),
        };
        state.canvases.set(canvas.id, canvas);
      });
      state.activeCanvasId = data.activeCanvasId;
      canvasIdCounter = data.canvasIdCounter || state.canvases.size + 1;
    } catch (error) {
      console.warn('프로젝트 캔버스 로드 실패:', error);
    }
  }

  // 캔버스가 없으면 기본 생성
  if (state.canvases.size === 0) {
    const defaultCanvas = createCanvas('Canvas 1');
    state.activeCanvasId = defaultCanvas.id;
  } else {
    ensureActiveCanvasSelected();
  }

  renderCanvasTabs();
  renderWorkspaceWindows();
}

function updateHomeProfile() {
  const nameEl = document.getElementById('home-profile-name');
  const emailEl = document.getElementById('home-profile-email');
  const avatarEl = document.getElementById('home-profile-avatar');

  if (nameEl) {
    nameEl.textContent = userProfile.name || 'User';
  }
  if (emailEl) {
    emailEl.textContent = userProfile.email || '';
  }
  if (avatarEl) {
    avatarEl.innerHTML = '';
    if (userProfile.avatar) {
      const img = document.createElement('img');
      img.src = userProfile.avatar;
      img.alt = userProfile.name || 'User';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = (userProfile.name || 'U').charAt(0).toUpperCase();
    }
  }
}

let homeEditMode = false;

function updateHomeEditButtonIcon() {
  const editBtn = document.getElementById('home-edit-btn');
  if (!editBtn) return;
  const editImg = editBtn.querySelector('img');
  if (editImg) {
    editImg.src = homeEditMode ? 'assets/icons/write_activate.svg' : 'assets/icons/write.svg';
    editImg.alt = homeEditMode ? '편집 중' : '편집';
  }
  editBtn.classList.toggle('home-actions__btn--active', homeEditMode);
  editBtn.setAttribute('aria-pressed', homeEditMode);
}

function setHomeEditMode(enabled) {
  const next = !!enabled;
  if (homeEditMode === next) return;
  homeEditMode = next;
  updateHomeEditButtonIcon();
  const isTrashView = getActiveHomeMenu() === 'trash';
  document.querySelectorAll('.project-card').forEach(card => {
    card.classList.toggle('project-card--editing', homeEditMode && !isTrashView);
  });
  document.querySelectorAll('.prompt-collection-card').forEach(card => {
    card.classList.toggle('prompt-collection-card--editing', homeEditMode);
  });
}

function exitHomeEditMode() {
  setHomeEditMode(false);
}

function toggleHomeEditMode() {
  setHomeEditMode(!homeEditMode);
}

function updateSortButtonLabel() {
  const btn = document.getElementById('home-sort-btn');
  if (!btn) return;
  const label = btn.querySelector('.home-actions__btn-sort-label');
  const opt = SORT_OPTIONS.find(o => o.value === projectSortBy);
  if (label && opt) label.textContent = opt.label;
}

function openSortDropdown(anchorEl) {
  let pop = document.getElementById('home-sort-dropdown');
  if (pop) pop.remove();
  pop = document.createElement('div');
  pop.id = 'home-sort-dropdown';
  pop.className = 'home-sort-dropdown';
  pop.innerHTML = '<div class="home-sort-dropdown__header"><span class="home-sort-dropdown__option-icon" aria-hidden="true"></span>Recently</div>';
  SORT_OPTIONS.forEach((opt) => {
    const div = document.createElement('div');
    div.className = 'home-sort-dropdown__divider';
    pop.appendChild(div);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'home-sort-dropdown__option';
    btn.dataset.sort = opt.value;
    const icon = document.createElement('span');
    icon.className = 'home-sort-dropdown__option-icon';
    icon.textContent = projectSortBy === opt.value ? '✓' : '';
    btn.appendChild(icon);
    btn.appendChild(document.createTextNode(opt.label));
    btn.addEventListener('click', () => {
      projectSortBy = opt.value;
      try { localStorage.setItem(PROJECT_SORT_KEY, projectSortBy); } catch (_) {}
      updateSortButtonLabel();
      pop.remove();
      document.getElementById('home-sort-btn')?.setAttribute('aria-expanded', 'false');
      renderHomeGridByActiveTab();
    });
    pop.appendChild(btn);
  });
  document.body.appendChild(pop);
  const rect = anchorEl.getBoundingClientRect();
  pop.style.left = `${rect.left}px`;
  pop.style.top = `${rect.bottom + 6}px`;
  anchorEl.setAttribute('aria-expanded', 'true');
  const close = () => {
    pop.remove();
    document.removeEventListener('click', close);
    anchorEl.setAttribute('aria-expanded', 'false');
  };
  setTimeout(() => document.addEventListener('click', close), 0);
  pop.addEventListener('click', (e) => e.stopPropagation());
}

function initHomeView() {
  updateSortButtonLabel();
  updateHomeToolbarForView();

  // 편집 버튼
  const editBtn = document.getElementById('home-edit-btn');
  editBtn?.addEventListener('click', () => {
    toggleHomeEditMode();
  });

  // New project / Delete all 버튼 (휴지통 뷰에서는 Delete all)
  const newProjectBtn = document.getElementById('home-new-project-btn');
  newProjectBtn?.addEventListener('click', () => {
    if (getActiveHomeMenu() === 'trash') {
      deleteAllFromTrash();
      return;
    }
    createProject();
  });

  // 정렬 버튼 — 일반 뷰: 드롭다운, 휴지통 뷰: Restore all
  const sortBtn = document.getElementById('home-sort-btn');
  sortBtn?.addEventListener('click', (e) => {
    if (getActiveHomeMenu() === 'trash') {
      restoreAllFromTrash();
      return;
    }
    e.stopPropagation();
    const open = document.getElementById('home-sort-dropdown');
    if (open) {
      open.remove();
      sortBtn.setAttribute('aria-expanded', 'false');
      return;
    }
    openSortDropdown(sortBtn);
  });

  // 검색 — 입력 시 Send 버튼 활성화(#7C95FF)
  const searchInput = document.getElementById('home-search-input');
  const searchBtn = document.getElementById('home-search-btn');
  function updateSearchButtonActive() {
    if (!searchBtn) return;
    const hasValue = searchInput && searchInput.value.trim().length > 0;
    searchBtn.classList.toggle('home-search__send--active', !!hasValue);
  }
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (getActiveHomeTab() === 'collection') filterPromptCollectionCards(query);
    else filterProjectCards(query);
    updateSearchButtonActive();
  });
  updateSearchButtonActive();

  // 탭 전환
  const tabButtons = document.querySelectorAll('.home-tabs__item');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('home-tabs__item--active'));
      btn.classList.add('home-tabs__item--active');
      renderHomeGridByActiveTab();
    });
  });

  // 폴더 트리 렌더링
  renderFolderTree();

  // 홈 사이드바 폴더 이벤트 위임
  const foldersRoot = document.getElementById('home-sidebar-folders-root');
  if (foldersRoot && foldersRoot.dataset.bound !== '1') {
    foldersRoot.dataset.bound = '1';
    let homeFolderRowClickTimer = null;

    foldersRoot.addEventListener('mousedown', (e) => {
      if (e.target.closest('#home-add-folder-btn')) {
        e.stopPropagation();
      }
    });

    foldersRoot.addEventListener('click', (e) => {
      if (e.target.closest('#home-add-folder-btn')) {
        e.stopPropagation();
        e.preventDefault();
        void addHomeFolder();
        return;
      }
      const menuBtn = e.target.closest('.js-home-saved-folder-menu');
      if (menuBtn) {
        e.stopPropagation();
        e.preventDefault();
        const header = menuBtn.closest('.js-home-saved-folder-header');
        const folderId = header?.dataset.folderId;
        const nameBtn = header?.querySelector('.js-home-project-folder-rename');
        if (folderId && nameBtn) showHomeSavedFolderContextMenu(e, folderId, nameBtn, menuBtn);
        return;
      }
      const header = e.target.closest('.js-home-saved-folder-header');
      if (!header) return;

      const folderId = header.dataset.folderId;
      if (!folderId) return;

      const onNameBtn = e.target.closest('.js-home-project-folder-rename');
      if (onNameBtn) {
        clearTimeout(homeFolderRowClickTimer);
        homeFolderRowClickTimer = setTimeout(() => {
          homeFolderRowClickTimer = null;
          openProjectFolder(folderId);
        }, 280);
        return;
      }

      // 화살표/아이콘 클릭 → 즉시 폴더 열기
      openProjectFolder(folderId);
    });

    foldersRoot.addEventListener('dblclick', (e) => {
      const nameBtn = e.target.closest('.js-home-project-folder-rename');
      if (!nameBtn) return;
      clearTimeout(homeFolderRowClickTimer);
      homeFolderRowClickTimer = null;
      const folderId = nameBtn.dataset.folderId;
      if (folderId) startRenameHomeProjectFolder(folderId, nameBtn);
    });

    foldersRoot.addEventListener('dragstart', handleSidebarProjectDragStart);
    foldersRoot.addEventListener('dragend', handleSidebarProjectDragEnd);
    foldersRoot.addEventListener('dragover', handleSidebarProjectDragOver);
    foldersRoot.addEventListener('dragleave', handleSidebarProjectDragLeave);
    foldersRoot.addEventListener('drop', handleSidebarProjectDrop);
  }

  // 사이드바 메뉴 전환 (Calendar → AI 결제 관리, Library/Trash → 기본 메인)
  const defaultContent = document.getElementById('home-default-content');
  const calendarPanel = document.getElementById('home-calendar-panel');
  const menuItems = document.querySelectorAll('.home-sidebar__menu-item[data-menu]');
  menuItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const menu = btn.getAttribute('data-menu');
      menuItems.forEach(b => b.classList.remove('home-sidebar__menu-item--active'));
      btn.classList.add('home-sidebar__menu-item--active');
      if (menu !== 'library') exitHomeEditMode();
      if (menu === 'calendar') {
        if (defaultContent) defaultContent.style.display = 'none';
        if (calendarPanel) {
          calendarPanel.style.display = 'grid';
          renderUpcomingPaymentList();
          renderMyTasksList();
          renderHomeCalendars();
        }
      } else {
        if (calendarPanel) calendarPanel.style.display = 'none';
        if (defaultContent) defaultContent.style.display = '';
        renderHomeGridByActiveTab();
        updateHomeToolbarForView();
      }
    });
  });

  // AI 결제 관리: Upcoming 접기/펼치기 (모달은 캘린더에서 "Upcoming Payment" 버튼 클릭 시에만 열림)
  const upcomingToggle = document.getElementById('home-upcoming-payment-toggle');
  const upcomingList = document.getElementById('home-upcoming-payment-list');
  if (upcomingToggle && upcomingList) {
    upcomingToggle.addEventListener('click', () => {
      const expanded = upcomingToggle.getAttribute('aria-expanded') !== 'false';
      upcomingToggle.setAttribute('aria-expanded', !expanded);
      upcomingList.classList.toggle('collapsed', expanded);
    });
  }
  const myTasksToggle = document.getElementById('home-my-tasks-toggle');
  const myTasksList = document.getElementById('home-my-tasks-list');
  if (myTasksToggle && myTasksList) {
    myTasksToggle.addEventListener('click', () => {
      const expanded = myTasksToggle.getAttribute('aria-expanded') !== 'false';
      myTasksToggle.setAttribute('aria-expanded', !expanded);
      myTasksList.classList.toggle('collapsed', expanded);
    });
  }
  initUpcomingPaymentModal();
  initMyTasksModal();

  // 캘린더 패널 초기화 (미니/메인 렌더, 버튼 바인딩)
  initHomeCalendarPanel();
}

const UPCOMING_PAYMENTS_KEY = 'aispace-upcoming-payments';
const MY_TASKS_KEY = 'aispace-my-tasks';

function getUpcomingPayments() {
  try {
    const raw = localStorage.getItem(UPCOMING_PAYMENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveUpcomingPayments(items) {
  try {
    localStorage.setItem(UPCOMING_PAYMENTS_KEY, JSON.stringify(items));
  } catch (_) {}
}

function getMyTasks() {
  try {
    const raw = localStorage.getItem(MY_TASKS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveMyTasks(items) {
  try {
    localStorage.setItem(MY_TASKS_KEY, JSON.stringify(items));
  } catch (_) {}
}

function addMonthsToDate(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m - 1) + months, d);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
}

function formatUpcomingDueLabel(iso) {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}월 ${day}일`;
}

function getDaysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (24 * 60 * 60 * 1000));
}

/** 날짜 문자열을 YYYYMMDD(8자)로 정규화해 비교용으로 사용 */
function toYMD8(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.trim().split(/[-/]/).map((p) => parseInt(p, 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return '';
  const y = parts[0];
  const m = String(parts[1]).padStart(2, '0');
  const d = String(parts[2]).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 입력/저장용 ISO 날짜(YYYY-MM-DD) 정규화 */
function normalizeDateInputValue(dateStr) {
  const ymd = toYMD8(dateStr);
  if (!ymd) return '';
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/** 캘린더 셀에 표시할 upcoming payment 이벤트 (시작일·결제일) */
function getUpcomingPaymentEventsOnDay(payment, cellYMD) {
  if (!cellYMD || !payment) return [];
  const name = payment.name || 'Payment';
  const dueYMD = toYMD8(payment.dueDate);
  const startYMD = toYMD8(payment.startDate);
  const events = [];
  if (startYMD === cellYMD && dueYMD === cellYMD) {
    events.push({ type: 'payment', text: name, color: '#7C95FF' });
    return events;
  }
  if (startYMD === cellYMD) {
    events.push({ type: 'payment-start', text: `${name} (시작)`, color: '#9BB0FF' });
  }
  if (dueYMD === cellYMD) {
    events.push({ type: 'payment-due', text: name, color: '#7C95FF' });
  }
  return events;
}

function isMultiDayTask(task) {
  const startYMD = toYMD8(task.startDate);
  const endYMD = toYMD8(task.endDate);
  return !!(startYMD && endYMD && startYMD !== endYMD);
}

/** 캘린더 셀에 표시할 My Task 이벤트 (단일일만 — 멀티데이는 주간 스팬 바로 표시) */
function getMyTaskEventsOnDay(task, cellYMD) {
  if (!cellYMD || !task || isMultiDayTask(task)) return [];
  const title = (task.title || 'Task').trim() || 'Task';
  const baseColor = task.color || '#C9D5FF';
  return [{
    type: 'task',
    text: `${title} (Task)`,
    color: baseColor,
    taskId: task.id != null ? String(task.id) : '',
  }];
}

/** 멀티데이 태스크를 주(week) 단위 가로 세그먼트로 분할 */
function buildTaskWeekSegments(task, weekCells) {
  const startYMD = toYMD8(task.startDate);
  const endYMD = toYMD8(task.endDate);
  if (!startYMD || !endYMD || startYMD === endYMD) return [];

  const overlapping = weekCells.filter(
    (c) => c.cellYMD && c.cellYMD >= startYMD && c.cellYMD <= endYMD
  );
  if (overlapping.length === 0) return [];

  const startCol = Math.min(...overlapping.map((c) => c.col));
  const endCol = Math.max(...overlapping.map((c) => c.col));
  const title = (task.title || 'Task').trim() || 'Task';

  return [{
    task,
    taskId: task.id != null ? String(task.id) : '',
    startCol,
    endCol,
    isStart: overlapping.some((c) => c.col === startCol && c.cellYMD === startYMD),
    isEnd: overlapping.some((c) => c.col === endCol && c.cellYMD === endYMD),
    title,
    color: task.color || '#7C95FF',
  }];
}

function findHomeCalendarEventRow(occupiedRows, startCol, endCol) {
  for (let r = 0; r < occupiedRows.length; r++) {
    const ranges = occupiedRows[r];
    const overlaps = ranges.some(([s, e]) => !(endCol < s || startCol > e));
    if (!overlaps) {
      ranges.push([startCol, endCol]);
      return r;
    }
  }
  occupiedRows.push([[startCol, endCol]]);
  return occupiedRows.length - 1;
}

function getWeekVisibleEventLanes(weekItems, maxVisible) {
  if (!weekItems.length) return { visibleLanes: 0, hasOverflow: false };
  const totalRows = Math.max(...weekItems.map((i) => i.row)) + 1;
  const hasOverflow = totalRows > maxVisible;
  const visibleLanes = hasOverflow ? Math.max(1, maxVisible - 1) : totalRows;
  return { visibleLanes, hasOverflow };
}

function getHomeCalendarSpanSegmentClasses(seg) {
  const classes = ['home-calendar-main__event-span', 'home-calendar-main__event-span--task'];
  if (seg.isStart && seg.isEnd) classes.push('home-calendar-main__event-span--single');
  else if (seg.isStart) classes.push('home-calendar-main__event-span--start');
  else if (seg.isEnd) classes.push('home-calendar-main__event-span--end');
  else classes.push('home-calendar-main__event-span--middle');
  return classes.join(' ');
}

function createHomeCalendarSpanBar(seg, row) {
  const bar = document.createElement('div');
  bar.className = getHomeCalendarSpanSegmentClasses(seg);
  bar.style.setProperty('--event-row', String(row));
  const colSpan = seg.endCol - seg.startCol + 1;
  bar.style.left = `calc(${(seg.startCol / 7) * 100}% + calc(4px * var(--calendar-scale, 1)))`;
  bar.style.width = `calc(${(colSpan / 7) * 100}% - calc(8px * var(--calendar-scale, 1)))`;
  if (seg.isStart) {
    bar.textContent = seg.title;
    bar.title = seg.title;
  }
  bar.dataset.taskId = seg.taskId;
  bar.addEventListener('click', (e) => {
    e.stopPropagation();
    openMyTaskDetailById(bar.dataset.taskId);
  });
  return bar;
}

function renderUpcomingPaymentList() {
  const listEl = document.getElementById('home-upcoming-payment-list');
  if (!listEl) return;
  const items = [...getUpcomingPayments()].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  listEl.innerHTML = items.map((item) => {
    const title = (item.name || 'AI').trim();
    const initial = (title.charAt(0) || 'A').toUpperCase();
    const label = item.dueDate ? formatUpcomingDueLabel(item.dueDate) : '-';
    const days = item.dueDate ? getDaysUntil(item.dueDate) : 0;
    const dueText = days > 0 ? `D-${days}` : days === 0 ? 'D-day' : '지남';
    const itemId = (item.id != null && item.id !== '') ? String(item.id) : '';
    const titleAttr = title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<div class="home-upcoming-payment__card" data-id="${itemId}">
      <span class="home-upcoming-payment__card-icon">${initial}</span>
      <div class="home-upcoming-payment__card-text">
        <span class="home-upcoming-payment__card-date">${label}</span>
        <span class="home-upcoming-payment__card-name" title="${titleAttr}">${title}</span>
      </div>
      <span class="home-upcoming-payment__card-due">${dueText}</span>
    </div>`;
  }).join('');
}

function formatTaskDateRange(startStr, endStr) {
  if (!startStr || !endStr) return '-';
  const s = new Date(startStr);
  const e = new Date(endStr);
  const sm = s.getMonth() + 1;
  const sd = s.getDate();
  const em = e.getMonth() + 1;
  const ed = e.getDate();
  if (startStr === endStr) return `${sm}월 ${sd}일`;
  return `${sm}/${sd} ~ ${em}/${ed}`;
}

/** My Tasks 리스트용 캘린더 날짜 필터 (세션 메모리만, ISO YYYY-MM-DD) */
let selectedMyTasksCalendarDate = null;

function taskMatchesCalendarFilterDate(task, isoDate) {
  if (!isoDate || !task) return false;
  const cellYMD = toYMD8(isoDate);
  const startYMD = toYMD8(task.startDate);
  const endYMD = toYMD8(task.endDate);
  if (!cellYMD || !startYMD || !endYMD) return false;
  return cellYMD >= startYMD && cellYMD <= endYMD;
}

function setMyTasksCalendarDateFilter(isoDate, toggle = true) {
  const normalized = isoDate ? normalizeDateInputValue(isoDate) : '';
  if (toggle && normalized && selectedMyTasksCalendarDate === normalized) {
    selectedMyTasksCalendarDate = null;
  } else {
    selectedMyTasksCalendarDate = normalized || null;
  }
  renderMyTasksList();
  updateMyTasksCalendarFilterUI();
  applyHomeCalendarSelectedCellHighlight();
}

function updateMyTasksCalendarFilterUI() {
  const toggleText = document.querySelector('#home-my-tasks-toggle .home-my-tasks__toggle-text');
  const clearBtn = document.getElementById('home-my-tasks-filter-clear');
  if (toggleText) {
    if (selectedMyTasksCalendarDate) {
      const d = new Date(selectedMyTasksCalendarDate + 'T12:00:00');
      const label = `${d.getMonth() + 1}월 ${d.getDate()}일`;
      toggleText.textContent = `My Tasks · ${label}`;
    } else {
      toggleText.textContent = 'My Tasks';
    }
  }
  if (clearBtn) clearBtn.hidden = !selectedMyTasksCalendarDate;
}

function applyHomeCalendarSelectedCellHighlight() {
  const mainGrid = document.getElementById('home-calendar-main-grid');
  if (!mainGrid) return;
  mainGrid.querySelectorAll('.home-calendar-main__cell').forEach((cell) => {
    const selected = selectedMyTasksCalendarDate && cell.dataset.date === selectedMyTasksCalendarDate;
    cell.classList.toggle('home-calendar-main__cell--selected', !!selected);
  });
}

function ensureMyTasksFilterClearButton() {
  const btn = document.getElementById('home-my-tasks-filter-clear');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMyTasksCalendarDateFilter(null, false);
  });
}

function renderMyTasksList() {
  const listEl = document.getElementById('home-my-tasks-list');
  if (!listEl) return;
  let items = [...getMyTasks()];
  if (selectedMyTasksCalendarDate) {
    items = items.filter((t) => taskMatchesCalendarFilterDate(t, selectedMyTasksCalendarDate));
  }
  items.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  updateMyTasksCalendarFilterUI();
  if (items.length === 0) {
    if (selectedMyTasksCalendarDate) {
      listEl.classList.remove('home-my-tasks__list--empty');
      const d = new Date(selectedMyTasksCalendarDate + 'T12:00:00');
      const label = `${d.getMonth() + 1}월 ${d.getDate()}일`;
      listEl.innerHTML = `<p class="home-my-tasks__empty-filter">해당 날짜(${label})의 태스크가 없습니다.</p>`;
      return;
    }
    listEl.classList.add('home-my-tasks__list--empty');
    listEl.innerHTML = '';
    return;
  }
  listEl.classList.remove('home-my-tasks__list--empty');
  listEl.innerHTML = items.map((t) => {
    const id = (t.id != null && t.id !== '') ? String(t.id) : '';
    const title = (t.title || 'Task').trim();
    const dateLabel = formatTaskDateRange(t.startDate, t.endDate);
    const titleAttr = title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<div class="home-my-tasks__card" data-id="${id}">
      <div class="home-my-tasks__card-text">
        <span class="home-my-tasks__card-title" title="${titleAttr}">${title}</span>
      </div>
      <span class="home-my-tasks__card-date">${dateLabel}</span>
    </div>`;
  }).join('');
}

function closeUpcomingPaymentModal() {
  const modal = document.getElementById('upcoming-payment-modal');
  if (modal) {
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('data-selected-date');
    modal.removeAttribute('data-edit-id');
  }
}

function toDateInputValue(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const ymd = toYMD8(dateStr);
  if (ymd.length !== 8) return '';
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function openUpcomingPaymentModalForEdit(item) {
  const modal = document.getElementById('upcoming-payment-modal');
  const nameInput = document.getElementById('upcoming-payment-ai-name');
  const startInput = document.getElementById('upcoming-payment-start');
  const endInput = document.getElementById('upcoming-payment-end');
  if (!modal || !nameInput) return;
  modal.dataset.editId = item.id || '';
  nameInput.value = item.name || '';
  const dueVal = toDateInputValue(item.dueDate);
  const startVal = item.startDate ? toDateInputValue(item.startDate) : (dueVal ? toDateInputValue(addMonthsToDate(item.dueDate, -1)) : '');
  if (endInput) endInput.value = dueVal;
  if (startInput) startInput.value = startVal;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function openUpcomingPaymentModal(selectedDateStr) {
  const modal = document.getElementById('upcoming-payment-modal');
  const nameInput = document.getElementById('upcoming-payment-ai-name');
  const startInput = document.getElementById('upcoming-payment-start');
  const endInput = document.getElementById('upcoming-payment-end');
  if (!modal) return;
  modal.removeAttribute('data-edit-id');
  if (nameInput) nameInput.value = '';
  let endVal = '';
  if (selectedDateStr && typeof selectedDateStr === 'string') {
    endVal = toDateInputValue(selectedDateStr.trim());
    if (!endVal && /^\d{4}-\d{1,2}-\d{1,2}$/.test(selectedDateStr.trim())) {
      const p = selectedDateStr.trim().split('-').map((n) => parseInt(n, 10));
      if (p.length >= 3) endVal = `${p[0]}-${String(p[1]).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
    }
  }
  if (!endVal) {
    const t = new Date();
    endVal = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }
  const startVal = addMonthsToDate(endVal, -1);
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    if (startInput) startInput.value = startVal;
    if (endInput) endInput.value = endVal;
    updateUpcomingModalEndFromDuration();
  });
}

function updateUpcomingModalEndFromDuration() {
  const startInput = document.getElementById('upcoming-payment-start');
  const endInput = document.getElementById('upcoming-payment-end');
  const durationBtn = document.querySelector('.upcoming-payment-modal__duration-btn.is-selected');
  if (!startInput || !endInput) return;
  const startVal = startInput.value.trim();
  if (!startVal) return;
  const duration = durationBtn ? durationBtn.dataset.duration : '1';
  if (duration === 'custom') return;
  const months = duration === '1' ? 1 : duration === '3' ? 3 : duration === '6' ? 6 : duration === '12' ? 12 : 1;
  endInput.value = addMonthsToDate(startVal, months);
}

function initUpcomingPaymentModal() {
  const modal = document.getElementById('upcoming-payment-modal');
  const backdrop = document.getElementById('upcoming-payment-modal-backdrop');
  const closeBtn = document.getElementById('upcoming-payment-modal-close');
  const form = document.getElementById('upcoming-payment-form');
  const durationBtns = document.querySelectorAll('.upcoming-payment-modal__duration-btn');
  const startInput = document.getElementById('upcoming-payment-start');
  const endInput = document.getElementById('upcoming-payment-end');

  if (!modal) return;

  if (backdrop) backdrop.addEventListener('click', closeUpcomingPaymentModal);
  if (closeBtn) closeBtn.addEventListener('click', closeUpcomingPaymentModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') !== 'true') closeUpcomingPaymentModal();
  });

  durationBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      durationBtns.forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      updateUpcomingModalEndFromDuration();
    });
  });

  if (startInput) {
    startInput.addEventListener('change', () => updateUpcomingModalEndFromDuration());
    startInput.addEventListener('input', () => updateUpcomingModalEndFromDuration());
  }
  if (endInput) {
    endInput.addEventListener('change', () => {
      const customBtn = document.querySelector('.upcoming-payment-modal__duration-btn[data-duration="custom"]');
      const sel = document.querySelector('.upcoming-payment-modal__duration-btn.is-selected');
      if (sel && sel.dataset.duration !== 'custom' && customBtn) {
        sel.classList.remove('is-selected');
        customBtn.classList.add('is-selected');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('upcoming-payment-ai-name');
      const endInput = document.getElementById('upcoming-payment-end');
      const name = (nameInput && nameInput.value.trim()) || 'AI';
      const modal = document.getElementById('upcoming-payment-modal');
      const editId = modal && modal.dataset.editId;

      if (editId) {
        const items = getUpcomingPayments();
        const item = items.find((p) => p.id === editId);
        const startInputEdit = document.getElementById('upcoming-payment-start');
        if (item) {
          item.name = name;
          const startNorm = startInputEdit && startInputEdit.value ? normalizeDateInputValue(startInputEdit.value) : '';
          if (startNorm) item.startDate = startNorm;
          item.dueDate = (endInput && endInput.value) ? normalizeDateInputValue(endInput.value) || endInput.value.slice(0, 10) : (item.dueDate || '');
          saveUpcomingPayments(items);
          renderUpcomingPaymentList();
          renderHomeCalendars();
        }
        closeUpcomingPaymentModal();
        if (nameInput) nameInput.value = '';
        if (endInput) endInput.value = '';
        return;
      }

      const startInputEl = document.getElementById('upcoming-payment-start');
      const endInputEl = document.getElementById('upcoming-payment-end');
      const durationBtn = document.querySelector('.upcoming-payment-modal__duration-btn.is-selected');
      const duration = durationBtn ? durationBtn.dataset.duration : '1';
      let startStr = (startInputEl && startInputEl.value && startInputEl.value.trim()) || '';
      if (!startStr) {
        const t = new Date();
        startStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      } else {
        startStr = normalizeDateInputValue(startStr) || startStr;
      }
      let dueDateStr;
      if (duration === 'custom' && endInputEl && endInputEl.value && endInputEl.value.trim()) {
        dueDateStr = normalizeDateInputValue(endInputEl.value.trim()) || endInputEl.value.trim();
      } else {
        dueDateStr = duration === '1' ? addMonthsToDate(startStr, 1) : duration === '3' ? addMonthsToDate(startStr, 3) : duration === '6' ? addMonthsToDate(startStr, 6) : duration === '12' ? addMonthsToDate(startStr, 12) : addMonthsToDate(startStr, 1);
      }
      const items = getUpcomingPayments();
      const newItem = { id: `up-${Date.now()}`, name, startDate: startStr, dueDate: dueDateStr };
      items.push(newItem);
      saveUpcomingPayments(items);
      renderUpcomingPaymentList();
      renderHomeCalendars();
      closeUpcomingPaymentModal();
      if (nameInput) nameInput.value = '';
      const memoEl = document.getElementById('upcoming-payment-memo');
      if (memoEl) memoEl.value = '';
    });
  }

  document.addEventListener('click', (ev) => {
    const listEl = document.getElementById('home-upcoming-payment-list');
    if (!listEl || !listEl.contains(ev.target)) return;
    const card = ev.target.closest('.home-upcoming-payment__card');
    if (!card) return;
    const id = card.getAttribute('data-id');
    if (id == null || id === '') return;
    const item = getUpcomingPayments().find((p) => String(p.id) === String(id));
    if (item) openUpcomingPaymentModalForEdit(item);
  });
}

function closeMyTasksModal() {
  const modal = document.getElementById('my-tasks-modal');
  if (modal) {
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('data-edit-task-id');
  }
}

function openMyTaskDetailById(taskId) {
  if (taskId == null || taskId === '') return;
  const task = getMyTasks().find((t) => String(t.id) === String(taskId));
  if (task) openMyTasksModalForEdit(task);
}

function openMyTasksModalForEdit(task) {
  const modal = document.getElementById('my-tasks-modal');
  const titleInput = document.getElementById('my-tasks-title');
  const startInput = document.getElementById('my-tasks-start');
  const endInput = document.getElementById('my-tasks-end');
  const memoInput = document.getElementById('my-tasks-memo');
  const colorBtns = document.querySelectorAll('.my-tasks-modal__color');
  if (!modal || !titleInput) return;
  modal.dataset.editTaskId = task.id || '';
  titleInput.value = task.title || '';
  if (startInput) startInput.value = toDateInputValue(task.startDate) || '';
  if (endInput) endInput.value = toDateInputValue(task.endDate) || '';
  if (memoInput) memoInput.value = task.memo || '';
  colorBtns.forEach((b) => {
    b.classList.remove('is-selected');
    if ((b.dataset.color || '').toUpperCase() === (task.color || '').toUpperCase()) b.classList.add('is-selected');
  });
  const firstColor = document.querySelector('.my-tasks-modal__color');
  if (firstColor && !document.querySelector('.my-tasks-modal__color.is-selected')) firstColor.classList.add('is-selected');
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function openMyTasksModal(selectedDateStr) {
  const modal = document.getElementById('my-tasks-modal');
  const titleInput = document.getElementById('my-tasks-title');
  const startInput = document.getElementById('my-tasks-start');
  const endInput = document.getElementById('my-tasks-end');
  const memoInput = document.getElementById('my-tasks-memo');
  if (!modal) return;
  modal.removeAttribute('data-edit-task-id');
  if (titleInput) titleInput.value = '';
  if (memoInput) memoInput.value = '';
  let endVal = '';
  if (selectedDateStr && typeof selectedDateStr === 'string') {
    endVal = toDateInputValue(selectedDateStr.trim());
    if (!endVal && /^\d{4}-\d{1,2}-\d{1,2}$/.test(selectedDateStr.trim())) {
      const p = selectedDateStr.trim().split('-').map((n) => parseInt(n, 10));
      if (p.length >= 3) endVal = `${p[0]}-${String(p[1]).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
    }
  }
  const t = new Date();
  const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  if (!endVal) endVal = today;
  const startVal = today;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    if (startInput) startInput.value = startVal;
    if (endInput) endInput.value = endVal;
  });
  document.querySelectorAll('.my-tasks-modal__color').forEach((b) => b.classList.remove('is-selected'));
  const firstColor = document.querySelector('.my-tasks-modal__color');
  if (firstColor) firstColor.classList.add('is-selected');
}

function initMyTasksModal() {
  const modal = document.getElementById('my-tasks-modal');
  const backdrop = document.getElementById('my-tasks-modal-backdrop');
  const closeBtn = document.getElementById('my-tasks-modal-close');
  const form = document.getElementById('my-tasks-form');
  const colorBtns = document.querySelectorAll('.my-tasks-modal__color');
  if (!modal) return;
  if (backdrop) backdrop.addEventListener('click', closeMyTasksModal);
  if (closeBtn) closeBtn.addEventListener('click', closeMyTasksModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') !== 'true') closeMyTasksModal();
  });
  colorBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      colorBtns.forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
    });
  });
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const modal = document.getElementById('my-tasks-modal');
      const editId = modal && modal.dataset.editTaskId;
      const titleInput = document.getElementById('my-tasks-title');
      const startInput = document.getElementById('my-tasks-start');
      const endInput = document.getElementById('my-tasks-end');
      const memoInput = document.getElementById('my-tasks-memo');
      const colorBtn = document.querySelector('.my-tasks-modal__color.is-selected');
      const title = (titleInput && titleInput.value.trim()) || 'Task';
      let startStr = (startInput && startInput.value && startInput.value.trim()) || '';
      let endStr = (endInput && endInput.value && endInput.value.trim()) || '';
      if (!startStr || !endStr) {
        const t = new Date();
        const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        if (!startStr) startStr = today;
        if (!endStr) endStr = today;
      }
      const startYMD = toYMD8(startStr);
      const endYMD = toYMD8(endStr);
      if (startYMD) startStr = `${startYMD.slice(0, 4)}-${startYMD.slice(4, 6)}-${startYMD.slice(6, 8)}`;
      if (endYMD) endStr = `${endYMD.slice(0, 4)}-${endYMD.slice(4, 6)}-${endYMD.slice(6, 8)}`;
      const color = colorBtn ? (colorBtn.dataset.color || '#C9D5FF') : '#C9D5FF';
      const memo = (memoInput && memoInput.value) ? memoInput.value.trim() : '';
      const tasks = getMyTasks();
      if (editId) {
        const task = tasks.find((x) => String(x.id) === String(editId));
        if (task) {
          task.title = title;
          task.startDate = startStr;
          task.endDate = endStr;
          task.color = color;
          task.memo = memo;
          saveMyTasks(tasks);
          renderMyTasksList();
          renderHomeCalendars();
        }
      } else {
        const newTask = { id: `task-${Date.now()}`, title, startDate: startStr, endDate: endStr, color, memo };
        tasks.push(newTask);
        saveMyTasks(tasks);
        renderMyTasksList();
        renderHomeCalendars();
      }
      closeMyTasksModal();
      if (titleInput) titleInput.value = '';
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      if (memoInput) memoInput.value = '';
    });
  }
  document.addEventListener('click', (ev) => {
    const listEl = document.getElementById('home-my-tasks-list');
    if (!listEl || !listEl.contains(ev.target)) return;
    const card = ev.target.closest('.home-my-tasks__card');
    if (!card) return;
    openMyTaskDetailById(card.getAttribute('data-id'));
  });
}

let homeCalendarState = { year: new Date().getFullYear(), month: new Date().getMonth() };

/** Main calendar: max event rows per day cell (excludes "+N more" row). */
const HOME_CALENDAR_MAIN_MAX_VISIBLE_EVENTS = 2;
/** Estimated event row height (px) incl. gap — used with grid row height. */
const HOME_CALENDAR_MAIN_EVENT_ROW_PX = 28;

function getHomeCalendarMainMaxVisibleEvents(mainGridEl) {
  if (!mainGridEl) return HOME_CALENDAR_MAIN_MAX_VISIBLE_EVENTS;
  const gridH = mainGridEl.clientHeight;
  if (gridH <= 0) return HOME_CALENDAR_MAIN_MAX_VISIBLE_EVENTS;
  const card = mainGridEl.closest('.home-calendar-card');
  const scale = card
    ? parseFloat(getComputedStyle(card).getPropertyValue('--calendar-scale')) || 1
    : 1;
  const rowH = gridH / 6;
  const chromePx = (20 + 28 + 6) * scale;
  const available = rowH - chromePx;
  const slots = Math.floor(available / (HOME_CALENDAR_MAIN_EVENT_ROW_PX * scale));
  return Math.min(3, Math.max(1, slots));
}

function appendHomeCalendarMainCellEvents(eventsWrap, cellEvents, hiddenCount) {
  if (cellEvents.length === 0 && hiddenCount === 0) return;

  cellEvents.forEach((evt) => {
    const ev = document.createElement('div');
    const isTask = evt.type && String(evt.type).startsWith('task');
    ev.className = isTask
      ? 'home-calendar-main__event home-calendar-main__event--task'
      : 'home-calendar-main__event';
    const fallbackBg = isTask ? 'rgba(201, 213, 255, 0.35)' : 'rgba(124, 149, 255, 0.25)';
    const fallbackColor = isTask ? '#5a6db8' : '#3d4db8';
    ev.style.backgroundColor = evt.color ? `${evt.color}40` : fallbackBg;
    ev.style.color = evt.color || fallbackColor;
    ev.textContent = '• ' + evt.text;
    if (isTask && evt.taskId) ev.dataset.taskId = evt.taskId;
    eventsWrap.appendChild(ev);
  });

  if (hiddenCount > 0) {
    const ev = document.createElement('div');
    ev.className = 'home-calendar-main__event home-calendar-main__event--wide';
    ev.dataset.calendarFilter = 'more';
    ev.textContent = `• +${hiddenCount} more`;
    eventsWrap.appendChild(ev);
  }
}

function renderHomeCalendarWeekEvents(weekEl, weekCells, weekItems, maxVisible) {
  const { visibleLanes } = getWeekVisibleEventLanes(weekItems, maxVisible);

  weekCells.forEach(({ cell, dateStr, col }) => {
    const touching = weekItems
      .filter((item) => {
        if (item.type === 'cell') return item.dateStr === dateStr;
        return col >= item.startCol && col <= item.endCol;
      })
      .sort((a, b) => a.row - b.row);

    const hiddenCount = touching.filter((item) => item.row >= visibleLanes).length;
    const visibleCellEvents = touching
      .filter((item) => item.type === 'cell' && item.row < visibleLanes)
      .map((item) => item.evt);

    if (visibleCellEvents.length > 0 || hiddenCount > 0) {
      const eventsWrap = document.createElement('div');
      eventsWrap.className = 'home-calendar-main__cell-events';
      appendHomeCalendarMainCellEvents(eventsWrap, visibleCellEvents, hiddenCount);
      cell.appendChild(eventsWrap);
    }
  });

  const visibleSpans = weekItems.filter(
    (item) => item.type === 'span' && item.row < visibleLanes
  );
  if (visibleSpans.length === 0) return;

  const barsLayer = document.createElement('div');
  barsLayer.className = 'home-calendar-main__week-bars';
  barsLayer.setAttribute('aria-hidden', 'true');
  visibleSpans.forEach((item) => {
    barsLayer.appendChild(createHomeCalendarSpanBar(item, item.row));
  });
  weekEl.appendChild(barsLayer);
}

function formatCalendarMonth(year, month) {
  const m = String(month + 1).padStart(2, '0');
  return `${year}.${m}`;
}

function renderHomeCalendars() {
  const { year, month } = homeCalendarState;
  const label = formatCalendarMonth(year, month);

  const payments = getUpcomingPayments();
  const tasks = getMyTasks();

  const miniMonth = document.getElementById('home-calendar-mini-month');
  const miniGrid = document.getElementById('home-calendar-mini-grid');
  if (miniMonth) miniMonth.textContent = label;
  if (miniGrid) {
    miniGrid.innerHTML = '';
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const daysInMonth = last.getDate();
    const today = new Date();
    const todayDate = today.getDate();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    for (let i = 0; i < startDay; i++) {
      const prevMonth = new Date(year, month, -startDay + i + 1);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'home-calendar-mini__day home-calendar-mini__day--other';
      if (prevMonth.getDay() === 0) cell.classList.add('home-calendar-mini__day--sun');
      cell.textContent = prevMonth.getDate();
      cell.disabled = true;
      miniGrid.appendChild(cell);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'home-calendar-mini__day';
      const dayOfWeek = new Date(year, month, d).getDay();
      if (dayOfWeek === 0) cell.classList.add('home-calendar-mini__day--sun');
      if (isCurrentMonth && d === todayDate) cell.classList.add('home-calendar-mini__day--today');
      cell.textContent = d;
      cell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      miniGrid.appendChild(cell);
    }
    const total = startDay + daysInMonth;
    const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 0; i < remainder; i++) {
      const nextMonth = new Date(year, month + 1, i + 1);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'home-calendar-mini__day home-calendar-mini__day--other';
      if (nextMonth.getDay() === 0) cell.classList.add('home-calendar-mini__day--sun');
      cell.textContent = i + 1;
      cell.disabled = true;
      miniGrid.appendChild(cell);
    }
  }

  const mainMonth = document.getElementById('home-calendar-main-month');
  const mainGrid = document.getElementById('home-calendar-main-grid');
  if (mainMonth) mainMonth.textContent = label;
  if (mainGrid) {
    mainGrid.innerHTML = '';
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysBack = (startWeekday + 6) % 7;
    const start = new Date(year, month, 1 - daysBack);
    const multiDayTasks = tasks.filter(isMultiDayTask);
    const weekRows = [];

    for (let row = 0; row < 6; row++) {
      const weekEl = document.createElement('div');
      weekEl.className = 'home-calendar-main__week';
      weekEl.dataset.weekRow = String(row);
      const weekCells = [];

      for (let col = 0; col < 7; col++) {
        const d = new Date(start);
        d.setDate(start.getDate() + row * 7 + col);
        const cell = document.createElement('div');
        cell.className = 'home-calendar-main__cell';
        const isOther = d.getMonth() !== month;
        if (isOther) cell.classList.add('home-calendar-main__cell--other');
        if (col === 6) cell.classList.add('home-calendar-main__cell--sun');
        const num = document.createElement('div');
        num.className = 'home-calendar-main__cell-num';
        num.textContent = d.getDate();
        cell.appendChild(num);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        cell.dataset.date = dateStr;
        const cellYMD = toYMD8(dateStr);
        const paymentEvents = cellYMD ? payments.flatMap((p) => getUpcomingPaymentEventsOnDay(p, cellYMD)) : [];
        const taskEvents = cellYMD ? tasks.flatMap((t) => getMyTaskEventsOnDay(t, cellYMD)) : [];
        cell.addEventListener('click', (e) => handleHomeCalendarMainCellClick(e, cell));
        weekEl.appendChild(cell);
        weekCells.push({ col, dateStr, cellYMD, cell, paymentEvents, taskEvents });
      }

      mainGrid.appendChild(weekEl);
      weekRows.push({ weekEl, weekCells });
    }

    const maxVisibleEvents = getHomeCalendarMainMaxVisibleEvents(mainGrid);

    weekRows.forEach(({ weekEl, weekCells }) => {
      const occupiedRows = [];
      const weekItems = [];

      weekCells.forEach(({ col, cell, paymentEvents, taskEvents, dateStr }) => {
        [...paymentEvents, ...taskEvents].forEach((evt) => {
          const eventRow = findHomeCalendarEventRow(occupiedRows, col, col);
          weekItems.push({ type: 'cell', row: eventRow, col, cell, evt, dateStr });
        });
      });

      multiDayTasks.forEach((task) => {
        buildTaskWeekSegments(task, weekCells).forEach((seg) => {
          const eventRow = findHomeCalendarEventRow(occupiedRows, seg.startCol, seg.endCol);
          weekItems.push({ type: 'span', row: eventRow, ...seg });
        });
      });

      renderHomeCalendarWeekEvents(weekEl, weekCells, weekItems, maxVisibleEvents);
    });

    applyHomeCalendarSelectedCellHighlight();
  }
}

function handleHomeCalendarMainCellClick(e, cellEl) {
  const moreEl = e.target.closest('.home-calendar-main__event--wide[data-calendar-filter="more"]');
  if (moreEl) {
    e.stopPropagation();
    setMyTasksCalendarDateFilter(cellEl.dataset.date, true);
    return;
  }
  const plainEvent = e.target.closest('.home-calendar-main__event');
  if (plainEvent) {
    e.stopPropagation();
    if (plainEvent.classList.contains('home-calendar-main__event--task')) {
      openMyTaskDetailById(plainEvent.dataset.taskId);
    }
    return;
  }
  const onDaySurface =
    e.target === cellEl ||
    e.target.closest('.home-calendar-main__cell-num') ||
    e.target.classList.contains('home-calendar-main__cell-events');
  if (onDaySurface) {
    e.stopPropagation();
    setMyTasksCalendarDateFilter(cellEl.dataset.date, true);
    return;
  }
  showHomeCalendarDayPopover(e, cellEl);
}

function showHomeCalendarDayPopover(e, cellEl) {
  e.stopPropagation();
  let pop = document.getElementById('home-calendar-day-popover');
  if (pop) pop.remove();
  pop = document.createElement('div');
  pop.id = 'home-calendar-day-popover';
  pop.className = 'home-calendar-day-popover';
  pop.innerHTML = `
    <button type="button" data-action="upcoming"><span class="home-calendar-day-popover__icon"><img src="assets/icons/card.svg" alt=""></span><span>Upcoming Payment</span></button>
    <button type="button" data-action="tasks"><span class="home-calendar-day-popover__icon"><img src="assets/icons/check.svg" alt=""></span><span>My Tasks</span></button>
  `;
  document.body.appendChild(pop);
  const rect = cellEl.getBoundingClientRect();
  pop.style.left = `${rect.left}px`;
  pop.style.top = `${rect.bottom + 4}px`;
  const close = () => {
    pop.remove();
    document.removeEventListener('click', close);
  };
  setTimeout(() => document.addEventListener('click', close), 0);
  pop.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const clickedDate = cellEl.getAttribute('data-date') || cellEl.dataset.date || '';
    if (ev.target.closest('button[data-action="upcoming"]')) {
      close();
      openUpcomingPaymentModal(clickedDate);
    } else if (ev.target.closest('button[data-action="tasks"]')) {
      close();
      openMyTasksModal(clickedDate);
    }
  });
}

function initHomeCalendarPanel() {
  ensureMyTasksFilterClearButton();
  const miniPrev = document.getElementById('home-calendar-mini-prev');
  const miniNext = document.getElementById('home-calendar-mini-next');
  const mainPrev = document.getElementById('home-calendar-main-prev');
  const mainNext = document.getElementById('home-calendar-main-next');

  function goPrev() {
    if (homeCalendarState.month === 0) {
      homeCalendarState.year--;
      homeCalendarState.month = 11;
    } else {
      homeCalendarState.month--;
    }
    renderHomeCalendars();
  }
  function goNext() {
    if (homeCalendarState.month === 11) {
      homeCalendarState.year++;
      homeCalendarState.month = 0;
    } else {
      homeCalendarState.month++;
    }
    renderHomeCalendars();
  }

  miniPrev?.addEventListener('click', goPrev);
  miniNext?.addEventListener('click', goNext);
  mainPrev?.addEventListener('click', goPrev);
  mainNext?.addEventListener('click', goNext);
}

function getActiveHomeTab() {
  const active = document.querySelector('.home-tabs__item--active');
  return active ? (active.getAttribute('data-tab') || 'project') : 'project';
}

function renderHomeGridByActiveTab() {
  const menu = getActiveHomeMenu();
  const tab = getActiveHomeTab();
  if (menu === 'trash') {
    renderProjectCards();
    return;
  }
  if (tab === 'collection') {
    renderPromptCollectionCards();
  } else {
    renderProjectCards();
  }
}

/** Prompt Collection: 모든 프로젝트의 savedPromptLibrary 항목 수집 (projectId로 출처 구분) */
function getPromptCollectionEntriesFromAllProjects() {
  const entries = [];
  projectsData.filter(p => !p.deletedAt).forEach(project => {
    ensureProjectSavedPromptLibrary(project);
    (project.savedPromptLibrary.folders || []).forEach(folder => {
      (folder.items || []).forEach(item => {
        entries.push({
          item,
          folderId: folder.id,
          projectId: project.id,
          projectName: project.name || 'Untitled Project',
        });
      });
    });
  });
  return entries;
}

function sortProjectsForCollection(list) {
  const sorted = [...list];
  if (projectSortBy === 'dateCreated') {
    sorted.sort((a, b) => (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0)));
  } else if (projectSortBy === 'nameAsc') {
    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  } else if (projectSortBy === 'nameDesc') {
    sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' }));
  }
  return sorted;
}

let collapsedPromptCollectionProjectIds = new Set();

// Prompt Collection 탭: 프로젝트별 섹션 + 2열 카드 그리드
function renderPromptCollectionCards() {
  const grid = document.getElementById('project-grid');
  if (!grid) return;
  grid.classList.add('project-grid--collection');

  const entries = getPromptCollectionEntriesFromAllProjects();
  const byProject = new Map();
  entries.forEach(entry => {
    if (!byProject.has(entry.projectId)) byProject.set(entry.projectId, []);
    byProject.get(entry.projectId).push(entry);
  });

  grid.innerHTML = '';

  if (entries.length === 0) {
    grid.classList.add('project-grid--empty');
    grid.innerHTML = `
      <div class="project-grid__empty">
        <p class="project-grid__empty-title">No saved prompts yet</p>
      </div>
    `;
    return;
  }
  grid.classList.remove('project-grid--empty');

  const projectsWithPrompts = sortProjectsForCollection(
    projectsData.filter(p => !p.deletedAt && byProject.has(p.id))
  );

  projectsWithPrompts.forEach(project => {
    const projectEntries = byProject.get(project.id) || [];
    projectEntries.sort((a, b) => (new Date(b.item.createdAt || 0)) - (new Date(a.item.createdAt || 0)));

    const section = document.createElement('section');
    section.className = 'prompt-collection-section';
    section.dataset.projectId = project.id;

    const isCollapsed = collapsedPromptCollectionProjectIds.has(project.id);
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'prompt-collection-section__header';
    header.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    const title = document.createElement('span');
    title.className = 'prompt-collection-section__title';
    title.textContent = project.name || 'Untitled Project';
    const chevron = document.createElement('img');
    chevron.className = 'prompt-collection-section__chevron';
    chevron.src = 'assets/icons/arrow.svg';
    chevron.alt = '';
    header.appendChild(title);
    header.appendChild(chevron);
    header.addEventListener('click', () => {
      const collapsed = section.classList.toggle('prompt-collection-section--collapsed');
      header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      if (collapsed) collapsedPromptCollectionProjectIds.add(project.id);
      else collapsedPromptCollectionProjectIds.delete(project.id);
    });

    const sectionGrid = document.createElement('div');
    sectionGrid.className = 'prompt-collection-section__grid';

    projectEntries.forEach(({ item, folderId, projectId }) => {
      const card = createPromptCollectionCardElement(item, folderId, projectId);
      sectionGrid.appendChild(card);
    });

    if (isCollapsed) section.classList.add('prompt-collection-section--collapsed');
    section.appendChild(header);
    section.appendChild(sectionGrid);
    grid.appendChild(section);
  });

  const searchQuery = document.getElementById('home-search-input')?.value.trim().toLowerCase();
  if (searchQuery) filterPromptCollectionCards(searchQuery);
}

function filterPromptCollectionCards(query) {
  document.querySelectorAll('.prompt-collection-section').forEach(section => {
    const cards = section.querySelectorAll('.prompt-collection-card');
    let visibleCount = 0;
    cards.forEach(card => {
      const prompt = card.querySelector('.prompt-collection-card__prompt')?.textContent.toLowerCase() || '';
      const show = !query || prompt.includes(query);
      card.style.display = show ? '' : 'none';
      if (show) visibleCount += 1;
    });
    section.style.display = visibleCount > 0 || !query ? '' : 'none';
  });
}

function createPromptCollectionCardElement(item, folderId, projectId) {
  const card = document.createElement('div');
  card.className = 'prompt-collection-card';
  card.dataset.itemId = item.id;
  card.dataset.folderId = folderId;
  if (projectId) card.dataset.projectId = projectId;

  const images = getItemImages(item);

  const imageWrap = document.createElement('div');
  imageWrap.className = 'prompt-collection-card__image';
  if (images.length === 0) {
    imageWrap.classList.add('prompt-collection-card__image--empty');
    imageWrap.innerHTML = '<span class="material-symbols-outlined">image</span>';
  } else if (images.length === 1) {
    const img = document.createElement('img');
    img.src = images[0];
    img.alt = item.name || '';
    img.onerror = () => { imageWrap.classList.add('prompt-collection-card__image--empty'); };
    imageWrap.appendChild(img);
  } else {
    const img = document.createElement('img');
    img.src = images[0];
    img.alt = item.name || '';
    img.onerror = () => { imageWrap.classList.add('prompt-collection-card__image--empty'); };
    imageWrap.appendChild(img);
    imageWrap.dataset.images = JSON.stringify(images);
    imageWrap.dataset.index = '0';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'prompt-collection-card__carousel-btn prompt-collection-card__carousel-btn--prev';
    prevBtn.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
    prevBtn.title = '이전';
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'prompt-collection-card__carousel-btn prompt-collection-card__carousel-btn--next';
    nextBtn.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
    nextBtn.title = '다음';
    const updateCarousel = () => {
      const idx = parseInt(imageWrap.dataset.index || '0', 10);
      const list = JSON.parse(imageWrap.dataset.images || '[]');
      if (list[idx]) img.src = list[idx];
    };
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const list = JSON.parse(imageWrap.dataset.images || '[]');
      let idx = parseInt(imageWrap.dataset.index || '0', 10);
      idx = (idx - 1 + list.length) % list.length;
      imageWrap.dataset.index = String(idx);
      updateCarousel();
    });
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const list = JSON.parse(imageWrap.dataset.images || '[]');
      let idx = parseInt(imageWrap.dataset.index || '0', 10);
      idx = (idx + 1) % list.length;
      imageWrap.dataset.index = String(idx);
      updateCarousel();
    });
    imageWrap.appendChild(prevBtn);
    imageWrap.appendChild(nextBtn);
  }
  card.appendChild(imageWrap);

  const body = document.createElement('div');
  body.className = 'prompt-collection-card__body';

  const aiRow = document.createElement('div');
  aiRow.className = 'prompt-collection-card__ai';
  appendPromptCollectionAppIcons(aiRow, resolvePromptItemAppIds(item, projectId));
  body.appendChild(aiRow);

  const promptEl = document.createElement('div');
  promptEl.className = 'prompt-collection-card__prompt';
  promptEl.textContent = item.prompt || '(프롬프트 없음)';
  body.appendChild(promptEl);

  const meta = document.createElement('div');
  meta.className = 'prompt-collection-card__meta';
  let dateStr = '';
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateStr = `${y}.${m}.${day}`;
  }
  const dateEl = document.createElement('span');
  dateEl.className = 'prompt-collection-card__date';
  dateEl.textContent = dateStr;
  meta.appendChild(dateEl);
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'prompt-collection-card__copy';
  copyBtn.title = '프롬프트 복사';
  copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await copyPromptWithFeedback(item.prompt || '');
  });
  meta.appendChild(copyBtn);
  body.appendChild(meta);

  const trashBtn = document.createElement('button');
  trashBtn.type = 'button';
  trashBtn.className = 'prompt-collection-card__trash';
  trashBtn.title = '삭제';
  trashBtn.innerHTML = '<img src="assets/icons/trash.svg" alt="">';
  trashBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await showConfirmModal(
      'Are you sure you want to delete this saved prompt? This cannot be undone.',
      { title: 'Delete prompt', okText: 'Delete', cancelText: 'Cancel' }
    );
    if (ok) deleteSavedItemFromProject(item.id, folderId, projectId);
  });
  body.appendChild(trashBtn);

  card.appendChild(body);

  card.addEventListener('click', (e) => {
    if (card.classList.contains('prompt-collection-card--editing')) return;
    if (e.target.closest('.prompt-collection-card__copy') || e.target.closest('.prompt-collection-card__carousel-btn') || e.target.closest('.prompt-collection-card__trash')) return;
    openSavedItemModal(item, folderId, projectId);
  });

  if (homeEditMode) card.classList.add('prompt-collection-card--editing');

  return card;
}

function filterProjectCards(query) {
  const cards = document.querySelectorAll('.project-card');
  cards.forEach(card => {
    const nameEl = card.querySelector('.project-card__name');
    const name = nameEl ? nameEl.textContent.toLowerCase() : '';
    card.style.display = name.includes(query) ? '' : 'none';
  });
}

// ==================== 홈 사이드바 폴더 트리 DnD ====================
const CUSTOM_DRAG_CURSOR_BODY_CLASS = 'is-custom-drag-cursor';

function setCustomDragCursorActive(active) {
  document.body.classList.toggle(CUSTOM_DRAG_CURSOR_BODY_CLASS, active);
}

let draggedSidebarProjectId = null;
let sidebarProjectDragDidMove = false;

function getFolderProjectsSorted(folderId) {
  return projectsData
    .filter(p => p.folderId === folderId && !p.deletedAt)
    .sort((a, b) => {
      const ao = a.folderSortOrder;
      const bo = b.folderSortOrder;
      if (ao != null && bo != null) return ao - bo;
      if (ao != null) return -1;
      if (bo != null) return 1;
      return projectsData.indexOf(a) - projectsData.indexOf(b);
    });
}

function getUnassignedProjectsSorted() {
  return projectsData
    .filter(p => !p.folderId && !p.deletedAt)
    .sort((a, b) => projectsData.indexOf(a) - projectsData.indexOf(b));
}

function ensureFolderSortOrders(folderId) {
  const list = getFolderProjectsSorted(folderId);
  list.forEach((p, i) => { p.folderSortOrder = i; });
}

function clearSidebarFolderDragHighlights() {
  document.querySelectorAll(
    '.home-sidebar__folder-tree-item--drag-over, .home-sidebar__folder-header--drag-over, .home-sidebar__folder-tree--drag-over, .home-sidebar__unassigned-list--drag-over'
  ).forEach(el => {
    el.classList.remove(
      'home-sidebar__folder-tree-item--drag-over',
      'home-sidebar__folder-header--drag-over',
      'home-sidebar__folder-tree--drag-over',
      'home-sidebar__unassigned-list--drag-over'
    );
  });
}

function reorderSidebarProject(draggedId, targetFolderId, insertBeforeId = null) {
  const proj = projectsData.find(p => p.id === draggedId);
  if (!proj || !targetFolderId) return false;

  const oldFolderId = proj.folderId;
  if (oldFolderId && oldFolderId !== targetFolderId) {
    ensureFolderSortOrders(oldFolderId);
    const oldList = getFolderProjectsSorted(oldFolderId).filter(p => p.id !== draggedId);
    oldList.forEach((p, i) => { p.folderSortOrder = i; });
    proj.folderId = targetFolderId;
  } else if (!proj.folderId) {
    proj.folderId = targetFolderId;
  }

  ensureFolderSortOrders(targetFolderId);
  let list = getFolderProjectsSorted(targetFolderId).filter(p => p.id !== draggedId);
  let insertIndex = insertBeforeId
    ? list.findIndex(p => p.id === insertBeforeId)
    : list.length;
  if (insertIndex < 0) insertIndex = list.length;
  list.splice(insertIndex, 0, proj);
  list.forEach((p, i) => { p.folderSortOrder = i; });

  saveProjects();
  renderFolderTree();
  renderProjectCards();
  return true;
}

function unassignSidebarProject(draggedId) {
  const proj = projectsData.find(p => p.id === draggedId);
  if (!proj || !proj.folderId) return false;

  const oldFolderId = proj.folderId;
  ensureFolderSortOrders(oldFolderId);
  delete proj.folderId;
  delete proj.folderSortOrder;
  const oldList = getFolderProjectsSorted(oldFolderId);
  oldList.forEach((p, i) => { p.folderSortOrder = i; });

  saveProjects();
  renderFolderTree();
  renderProjectCards();
  return true;
}

function createFolderTreeProjectItem(project) {
  const item = document.createElement('div');
  item.className = 'home-sidebar__folder-tree-item js-home-folder-tree-project';
  item.dataset.projectId = project.id;
  item.dataset.folderId = project.folderId || '';

  const handle = document.createElement('span');
  handle.className = 'home-sidebar__folder-tree-item__handle js-home-folder-tree-drag-handle';
  handle.draggable = true;
  handle.title = '드래그하여 폴더로 이동 · 순서 변경';
  handle.setAttribute('aria-hidden', 'true');
  handle.innerHTML = '<img src="assets/icons/SVG/func.svg" alt="">';

  const label = document.createElement('span');
  label.className = 'home-sidebar__folder-tree-item__label';
  label.textContent = project.name || 'Untitled Project';

  item.appendChild(handle);
  item.appendChild(label);

  item.addEventListener('click', (e) => {
    if (e.target.closest('.js-home-folder-tree-drag-handle')) return;
    if (sidebarProjectDragDidMove) return;
    openProject(project.id);
  });

  return item;
}

function handleSidebarProjectDragStart(event) {
  const handle = event.target.closest('.js-home-folder-tree-drag-handle');
  if (!handle) return;
  const item = handle.closest('.js-home-folder-tree-project');
  if (!item) return;

  draggedSidebarProjectId = item.dataset.projectId;
  sidebarProjectDragDidMove = false;
  setCustomDragCursorActive(true);
  item.classList.add('home-sidebar__folder-tree-item--dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedSidebarProjectId);
  if (event.dataTransfer.setDragImage) {
    const ghost = item.cloneNode(true);
    ghost.classList.add('home-sidebar__folder-tree-item--drag-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.position = 'fixed';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    ghost.style.width = `${item.offsetWidth}px`;
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 12, 16);
    requestAnimationFrame(() => ghost.remove());
  }
  event.stopPropagation();
}

function handleSidebarProjectDragEnd(event) {
  const item = event.target.closest('.js-home-folder-tree-project');
  if (item) item.classList.remove('home-sidebar__folder-tree-item--dragging');
  setCustomDragCursorActive(false);
  draggedSidebarProjectId = null;
  clearSidebarFolderDragHighlights();
  setTimeout(() => { sidebarProjectDragDidMove = false; }, 0);
}

function handleSidebarProjectDragOver(event) {
  if (!draggedSidebarProjectId) return;

  const dropProject = event.target.closest('.js-home-folder-tree-project');
  const dropEmpty = event.target.closest('.home-sidebar__folder-tree-item--empty');
  const dropHeader = event.target.closest('.js-home-saved-folder-header');
  const dropTree = event.target.closest('.home-sidebar__folder-tree');
  const dropUnassigned = event.target.closest('.js-home-unassigned-drop-zone');

  if (!dropProject && !dropEmpty && !dropHeader && !dropTree && !dropUnassigned) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  clearSidebarFolderDragHighlights();

  const dragged = projectsData.find(p => p.id === draggedSidebarProjectId);

  if (dropUnassigned && dragged?.folderId) {
    dropUnassigned.classList.add('home-sidebar__unassigned-list--drag-over');
  } else if (dropProject) {
    if (dropProject.dataset.projectId === draggedSidebarProjectId) return;
    if (!dropProject.dataset.folderId) {
      const zone = dropProject.closest('.js-home-unassigned-drop-zone');
      if (zone && dragged?.folderId) zone.classList.add('home-sidebar__unassigned-list--drag-over');
      return;
    }
    dropProject.classList.add('home-sidebar__folder-tree-item--drag-over');
  } else if (dropEmpty) {
    dropEmpty.classList.add('home-sidebar__folder-tree-item--drag-over');
  } else if (dropHeader) {
    dropHeader.classList.add('home-sidebar__folder-header--drag-over');
  } else if (dropTree) {
    dropTree.classList.add('home-sidebar__folder-tree--drag-over');
  }
}

function handleSidebarProjectDragLeave(event) {
  const related = event.relatedTarget;
  const zone = event.currentTarget;
  if (related && zone.contains(related)) return;
  if (zone.id === 'home-sidebar-folders-root') clearSidebarFolderDragHighlights();
}

function handleSidebarProjectDrop(event) {
  if (!draggedSidebarProjectId) return;

  const dropProject = event.target.closest('.js-home-folder-tree-project');
  const dropEmpty = event.target.closest('.home-sidebar__folder-tree-item--empty');
  const dropHeader = event.target.closest('.js-home-saved-folder-header');
  const dropTree = event.target.closest('.home-sidebar__folder-tree');
  const dropUnassigned = event.target.closest('.js-home-unassigned-drop-zone');

  if (!dropProject && !dropEmpty && !dropHeader && !dropTree && !dropUnassigned) return;

  event.preventDefault();
  event.stopPropagation();
  clearSidebarFolderDragHighlights();

  if (dropUnassigned) {
    const moved = unassignSidebarProject(draggedSidebarProjectId);
    if (moved) sidebarProjectDragDidMove = true;
    draggedSidebarProjectId = null;
    return;
  }

  let targetFolderId = null;
  let insertBeforeId = null;

  if (dropProject) {
    if (!dropProject.dataset.folderId) {
      const moved = unassignSidebarProject(draggedSidebarProjectId);
      if (moved) sidebarProjectDragDidMove = true;
      draggedSidebarProjectId = null;
      return;
    }
    targetFolderId = dropProject.dataset.folderId;
    insertBeforeId = dropProject.dataset.projectId;
    if (insertBeforeId === draggedSidebarProjectId) return;
  } else if (dropEmpty) {
    targetFolderId = dropEmpty.dataset.folderId;
  } else if (dropHeader) {
    targetFolderId = dropHeader.dataset.folderId;
  } else if (dropTree) {
    const block = dropTree.closest('.home-sidebar__folder-block');
    targetFolderId = block?.dataset.folderId || null;
  }

  if (!targetFolderId) return;

  const moved = reorderSidebarProject(draggedSidebarProjectId, targetFolderId, insertBeforeId);
  if (moved) sidebarProjectDragDidMove = true;
  draggedSidebarProjectId = null;
}

function appendUnassignedProjectsToSidebar(root) {
  const unassigned = getUnassignedProjectsSorted();
  if (unassigned.length === 0) return;

  const section = document.createElement('div');
  section.className = 'home-sidebar__unassigned-list js-home-unassigned-drop-zone';
  section.dataset.zone = 'unassigned';
  section.title = '폴더 밖 프로젝트 · 여기에 놓으면 폴더에서 해제';

  unassigned.forEach(project => {
    section.appendChild(createFolderTreeProjectItem(project));
  });
  root.appendChild(section);
}

function renderFolderTree() {
  const root = document.getElementById('home-sidebar-folders-root');
  if (!root) return;
  root.innerHTML = '';

  if (projectFoldersData.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'home-sidebar__folder-header home-sidebar__folder-header--add-row';
    emptyRow.id = 'home-folder-add-row';
    emptyRow.innerHTML = `
      <span class="home-sidebar__folder-icon" aria-hidden="true"><img src="assets/icons/folder.svg" alt=""></span>
      <span class="home-sidebar__folder-name" style="color:#bbb;">${DEFAULT_HOME_PROJECT_FOLDER_NAME}</span>
      <button type="button" class="home-sidebar__folder-add" id="home-add-folder-btn" title="폴더 추가">
        <span class="home-sidebar__folder-add-icon" aria-hidden="true"><img src="assets/icons/plus.svg" alt=""></span>
      </button>
    `;
    root.appendChild(emptyRow);
    appendUnassignedProjectsToSidebar(root);
    return;
  }

  projectFoldersData.forEach((folder, idx) => {
    const isFirst = idx === 0;
    const isActive = folder.id === activeProjectFolderId;

    const block = document.createElement('div');
    block.className = 'home-sidebar__folder-block';
    block.dataset.folderId = folder.id;

    // 폴더 행 (헤더)
    const header = document.createElement('div');
    header.className = 'home-sidebar__folder-header js-home-saved-folder-header' + (isActive ? ' home-sidebar__folder-header--active' : '');
    header.dataset.folderId = folder.id;
    header.innerHTML = `
      <img src="assets/icons/arrow.svg" alt="" class="home-sidebar__folder-arrow" aria-hidden="true">
      <span class="home-sidebar__folder-icon" aria-hidden="true"><img src="assets/icons/folder.svg" alt=""></span>
    `;

    // 이름 버튼 (클릭=선택, 더블클릭=이름 변경)
    const nameBtn = document.createElement('button');
    nameBtn.type = 'button';
    nameBtn.className = 'home-sidebar__folder-name js-home-project-folder-rename';
    nameBtn.dataset.folderId = folder.id;
    nameBtn.title = '클릭: 폴더 선택 · 더블클릭: 이름 변경';
    nameBtn.textContent = folder.name || DEFAULT_HOME_PROJECT_FOLDER_NAME;
    header.appendChild(nameBtn);

    // 최상단 폴더(첫 블록)에만 + 버튼; 나머지는 호버 시 ⋮ 메뉴
    if (isFirst) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'home-sidebar__folder-add';
      addBtn.id = 'home-add-folder-btn';
      addBtn.title = '폴더 추가';
      addBtn.innerHTML = `<span class="home-sidebar__folder-add-icon" aria-hidden="true"><img src="assets/icons/plus.svg" alt=""></span>`;
      header.appendChild(addBtn);
    } else {
      const menuBtn = document.createElement('button');
      menuBtn.type = 'button';
      menuBtn.className = 'home-saved-folder-menu js-home-saved-folder-menu';
      menuBtn.title = '메뉴';
      menuBtn.innerHTML = '<span class="home-sidebar__folder-add-icon" aria-hidden="true"><span class="material-symbols-outlined">more_vert</span></span>';
      header.appendChild(menuBtn);
    }

    block.appendChild(header);

    // 폴더 아래 프로젝트 트리 (활성 폴더만 펼침)
    const treeWrap = document.createElement('div');
    treeWrap.className = 'home-sidebar__folder-tree' + (isActive ? '' : ' collapsed');
    treeWrap.dataset.folderId = folder.id;
    const folderProjects = getFolderProjectsSorted(folder.id);
    if (folderProjects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'home-sidebar__folder-tree-item home-sidebar__folder-tree-item--empty';
      empty.dataset.folderId = folder.id;
      empty.textContent = '프로젝트가 없습니다';
      treeWrap.appendChild(empty);
    } else {
      folderProjects.forEach(project => {
        treeWrap.appendChild(createFolderTreeProjectItem(project));
      });
    }
    block.appendChild(treeWrap);
    root.appendChild(block);
  });

  appendUnassignedProjectsToSidebar(root);
  // 이벤트 위임은 initHomeView에서 root에 바인딩
}

/** 폴더 클릭 → Project 탭으로 전환 + 필터 적용 + 트리 펼침/접힘 */
function openProjectFolder(folderId) {
  // 같은 폴더 재클릭 → 필터 해제
  if (activeProjectFolderId === folderId) {
    activeProjectFolderId = null;
  } else {
    activeProjectFolderId = folderId;
  }

  // Project 탭 활성화
  const tabs = document.querySelectorAll('.home-tabs__item');
  tabs.forEach(t => {
    const isProject = t.dataset.tab === 'project';
    t.classList.toggle('home-tabs__item--active', isProject);
  });

  renderProjectCards();
  renderFolderTree();
}

/** 새 프로젝트 폴더 추가 */
async function addHomeFolder() {
  const name = await showPromptModal(
    'Enter a folder name',
    DEFAULT_HOME_PROJECT_FOLDER_NAME,
    { title: 'New folder', okText: 'Add', cancelText: 'Cancel' }
  );
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) { showToast('폴더 이름을 입력해 주세요.'); return; }
  const newFolder = {
    id: `pfolder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: trimmed,
  };
  projectFoldersData.push(newFolder);
  saveProjectFolders();
  renderFolderTree();
  showToast('폴더가 추가되었습니다.');
}

/** 홈 프로젝트 폴더 인라인 이름 변경 */
function startRenameHomeProjectFolder(folderId, nameBtn) {
  const folder = projectFoldersData.find(f => f.id === folderId);
  if (!folder) return;

  const oldName = folder.name || DEFAULT_HOME_PROJECT_FOLDER_NAME;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'home-project-folder-rename-input';
  input.value = oldName;
  nameBtn.replaceWith(input);
  input.focus();
  input.select();

  // + 버튼이 있는 첫 폴더면 휴지통으로 교체, 아니면 헤더에 휴지통 삽입
  const header = input.closest('.js-home-saved-folder-header');
  const existingAddBtn = header?.querySelector('.home-sidebar__folder-add');
  const folderMenuBtn = header?.querySelector('.js-home-saved-folder-menu');
  if (folderMenuBtn) folderMenuBtn.hidden = true;
  let trashBtn = null;
  const ac = new AbortController();

  function insertTrash() {
    trashBtn = document.createElement('button');
    trashBtn.type = 'button';
    trashBtn.className = 'home-sidebar__folder-add folder-rename-delete-btn';
    trashBtn.title = '폴더 삭제';
    trashBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:15px;color:#e05;">delete</span>`;
    if (existingAddBtn) {
      existingAddBtn.replaceWith(trashBtn);
    } else if (folderMenuBtn) {
      folderMenuBtn.replaceWith(trashBtn);
    } else if (header) {
      header.appendChild(trashBtn);
    }
    trashBtn.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ac.abort();
      void persistDeleteHomeProjectFolder(folderId);
    }, { signal: ac.signal });
  }
  insertTrash();

  let finished = false;
  function commit() {
    if (finished) return;
    finished = true;
    ac.abort();
    const val = input.value.trim();
    if (!val) { showToast('폴더 이름을 입력해 주세요.'); renderFolderTree(); return; }
    folder.name = val;
    saveProjectFolders();
    renderFolderTree();
  }
  function cancel() {
    if (finished) return;
    finished = true;
    ac.abort();
    renderFolderTree();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => { setTimeout(commit, 120); });
}

/** 홈 프로젝트 폴더 삭제 (확인 모달) */
async function persistDeleteHomeProjectFolder(folderId) {
  const folder = projectFoldersData.find(f => f.id === folderId);
  if (!folder) return;
  const ok = await showConfirmModal(
    'This folder will be deleted. Projects assigned to it will be unassigned; saved prompts in each project are not removed. This cannot be undone.',
    { title: 'Delete folder', okText: 'Delete', cancelText: 'Cancel' }
  );
  if (!ok) { renderFolderTree(); return; }
  // 폴더에 속한 프로젝트에서 folderId 해제
  projectsData.forEach(p => { if (p.folderId === folderId) delete p.folderId; });
  saveProjects();
  projectFoldersData = projectFoldersData.filter(f => f.id !== folderId);
  saveProjectFolders();
  if (activeProjectFolderId === folderId) activeProjectFolderId = null;
  renderProjectCards();
  renderFolderTree();
  showToast('폴더가 삭제되었습니다.');
}

/** 홈 프로젝트 폴더 ⋮ 메뉴 → 이름 변경 / 삭제 */
function showHomeSavedFolderContextMenu(event, folderId, nameBtn, anchorEl) {
  event.preventDefault();
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'workspace__context-menu';

  const renameBtn = document.createElement('button');
  renameBtn.className = 'workspace__context-menu-item';
  renameBtn.innerHTML = `
    <span class="workspace__context-menu-icon" aria-hidden="true"><img src="assets/icons/write.svg" alt=""></span>
    <span>이름 변경</span>
  `;
  renameBtn.addEventListener('click', () => {
    closeContextMenu();
    startRenameHomeProjectFolder(folderId, nameBtn);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'workspace__context-menu-item workspace__context-menu-item--danger';
  deleteBtn.innerHTML = `
    <span class="workspace__context-menu-icon" aria-hidden="true"><img src="assets/icons/trash.svg" alt=""></span>
    <span>삭제</span>
  `;
  deleteBtn.addEventListener('click', () => {
    closeContextMenu();
    void persistDeleteHomeProjectFolder(folderId);
  });

  menu.appendChild(renameBtn);
  menu.appendChild(deleteBtn);
  document.body.appendChild(menu);
  contextMenuElement = menu;

  const rect = (anchorEl || event.target).getBoundingClientRect();
  menu.style.left = `${rect.right - 120}px`;
  menu.style.top = `${rect.bottom + 4}px`;

  requestAnimationFrame(() => {
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - menuRect.height - 10}px`;
    }
    menu.classList.add('visible');
  });
}

const MAX_WINDOWS = 4;

const appCatalog = [
  {
    id: 'conversation',
    name: '대화형 AI',
    apps: [
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        url: 'https://chatgpt.com/',
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

const APP_OVERRIDES_KEY = 'aispace-app-overrides';
const HIDDEN_APPS_KEY = 'aispace-hidden-apps';
const CUSTOM_APPS_KEY = 'aispace-custom-apps';
let appOverrides = {};
let hiddenAppIds = [];
let customApps = [];

function loadAppOverrides() {
  try {
    const raw = localStorage.getItem(APP_OVERRIDES_KEY);
    appOverrides = raw ? JSON.parse(raw) : {};
    let migrated = false;
    Object.values(appOverrides).forEach((override) => {
      if (!override?.url) return;
      const next = normalizeAppUrl(override.url);
      if (next !== override.url) {
        override.url = next;
        migrated = true;
      }
    });
    if (migrated) saveAppOverrides();
  } catch {
    appOverrides = {};
  }
}

function saveAppOverrides() {
  try {
    localStorage.setItem(APP_OVERRIDES_KEY, JSON.stringify(appOverrides));
  } catch (e) {
    console.warn('앱 오버라이드 저장 실패:', e);
  }
}

function loadHiddenAppIds() {
  try {
    const raw = localStorage.getItem(HIDDEN_APPS_KEY);
    hiddenAppIds = raw ? JSON.parse(raw) : [];
  } catch {
    hiddenAppIds = [];
  }
}

function saveHiddenAppIds() {
  try {
    localStorage.setItem(HIDDEN_APPS_KEY, JSON.stringify(hiddenAppIds));
  } catch (e) {
    console.warn('숨긴 앱 목록 저장 실패:', e);
  }
}

function loadCustomApps() {
  try {
    const raw = localStorage.getItem(CUSTOM_APPS_KEY);
    customApps = raw ? JSON.parse(raw) : [];
  } catch {
    customApps = [];
  }
}

function saveCustomApps() {
  try {
    localStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(customApps));
  } catch (e) {
    console.warn('커스텀 앱 저장 실패:', e);
  }
}

function isCustomAppId(appId) {
  return Boolean(appId && (appId.startsWith('custom_') || appId.startsWith('custom-')));
}

const LAYV_CHROME_USER_AGENT =
  (typeof window !== 'undefined' && window.aispace?.chromeUserAgent) ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const AI_WEBVIEW_PARTITION =
  (typeof window !== 'undefined' && window.aispace?.aiWebviewPartition) || 'persist:layv-ai';

/** 구 URL·오버라이드 보정 (chat.openai.com 등) */
function normalizeAppUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'chat.openai.com') {
      return 'https://chatgpt.com/';
    }
  } catch {
    return url;
  }
  return url;
}

function applyAppOverrides(app, override = {}) {
  const merged = { ...app };
  if (override.name !== undefined) merged.name = override.name;
  if (override.url !== undefined) merged.url = normalizeAppUrl(override.url);
  if (override.iconImage !== undefined) {
    merged.iconImage = override.iconImage;
    merged.iconData = override.iconImage;
  }
  if (merged.url) merged.url = normalizeAppUrl(merged.url);
  return merged;
}

function getAppCustomIcon(app) {
  if (!app) return null;
  const override = appOverrides[app.id];
  if (override && override.iconImage !== undefined) return override.iconImage;
  return app.iconImage || app.iconData || null;
}

function getFaviconUrlForWebsite(url, size = 32) {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return null;
  }
}

// 앱 URL에서 파비콘 이미지 URL 반환 (커스텀 앱은 iconImage/iconData 사용)
function getAppFaviconUrl(app, size = 32) {
  if (!app) return null;
  const customIcon = getAppCustomIcon(app);
  if (customIcon) return customIcon;
  if (app.iconImage || app.iconData) return app.iconImage || app.iconData;
  return getFaviconUrlForWebsite(app.url, size);
}

/** 워크스페이스에서 마지막으로 포커스한 AI 창의 appId (저장 시 출처 앱) */
let lastFocusedWorkspaceAppId = null;

function getWorkspaceOpenAppIds() {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return new Set();
  const ids = new Set();
  activeCanvas.windows.forEach((w) => {
    if (w.appId) ids.add(w.appId);
  });
  return ids;
}

/** 저장 시점 활성 캔버스에 열린 앱 id 목록 (앞 창 우선, 중복 제거) */
function getWorkspaceSourceAppIds() {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return [];
  const seen = new Set();
  const ids = [];
  const windows = Array.from(activeCanvas.windows.values())
    .sort((a, b) => (b.order || 0) - (a.order || 0));
  windows.forEach((w) => {
    if (w.appId && !seen.has(w.appId)) {
      seen.add(w.appId);
      ids.push(w.appId);
    }
  });
  return ids;
}

function getFocusedWorkspaceAppId() {
  const activeEl = document.activeElement;
  const focusedWindow = activeEl?.closest?.('.ai-window');
  if (focusedWindow?.dataset.appId) return focusedWindow.dataset.appId;
  const frameHost = activeEl?.closest?.('[data-frame-container]');
  const frame = frameHost?.querySelector('webview[data-app-id], iframe[data-app-id]');
  if (frame?.dataset.appId) return frame.dataset.appId;
  return null;
}

function getWorkspaceSourceAppId() {
  const openApps = getWorkspaceOpenAppIds();
  if (openApps.size === 0) return null;

  const focused = getFocusedWorkspaceAppId();
  if (focused && openApps.has(focused)) return focused;

  if (lastFocusedWorkspaceAppId && openApps.has(lastFocusedWorkspaceAppId)) {
    return lastFocusedWorkspaceAppId;
  }

  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return null;
  const frontWindow = Array.from(activeCanvas.windows.values())
    .sort((a, b) => (b.order || 0) - (a.order || 0))[0];
  return frontWindow?.appId || null;
}

function setWorkspaceSourceAppId(appId) {
  if (!appId) return;
  const openApps = getWorkspaceOpenAppIds();
  if (openApps.size === 0 || openApps.has(appId)) {
    lastFocusedWorkspaceAppId = appId;
  }
}

function clearWorkspaceSourceAppId() {
  lastFocusedWorkspaceAppId = null;
}

/**
 * 저장 프롬프트 카드용 appId.
 * 항목에 저장된 appId가 있으면 레지스트리·프로젝트 usedApps와 맞을 때만 사용.
 * 없거나 무효면 프로젝트에 AI가 하나뿐일 때만 보수적으로 추론.
 */
function resolvePromptItemAppId(item, projectId) {
  const project = projectId ? projectsData.find((p) => p.id === projectId) : null;
  const projectAppIds = getProjectAppIds(project);
  const stored = typeof item?.appId === 'string' ? item.appId.trim() : '';

  if (stored && appLookup.has(stored)) {
    if (projectAppIds.length === 0 || projectAppIds.includes(stored)) return stored;
    if (projectAppIds.length === 1) return projectAppIds[0];
    return null;
  }

  if (projectAppIds.length === 1) return projectAppIds[0];
  return null;
}

function filterPromptItemAppIdsForProject(appIds, projectAppIds) {
  const unique = [];
  const seen = new Set();
  (appIds || []).forEach((id) => {
    const trimmed = typeof id === 'string' ? id.trim() : '';
    if (!trimmed || !appLookup.has(trimmed) || seen.has(trimmed)) return;
    if (projectAppIds.length > 0 && !projectAppIds.includes(trimmed)) return;
    seen.add(trimmed);
    unique.push(trimmed);
  });
  return unique;
}

/** 프롬프트 컬렉션 카드용 앱 id 목록 (openAppIds 우선, 구 항목은 appId 단일) */
function resolvePromptItemAppIds(item, projectId) {
  const project = projectId ? projectsData.find((p) => p.id === projectId) : null;
  const projectAppIds = getProjectAppIds(project);

  if (Array.isArray(item?.openAppIds) && item.openAppIds.length) {
    const filtered = filterPromptItemAppIdsForProject(item.openAppIds, projectAppIds);
    if (filtered.length) return filtered;
  }

  const single = resolvePromptItemAppId(item, projectId);
  return single ? [single] : [];
}

/** 새 저장 항목에 워크스페이스 출처 앱 id·열린 앱 목록 부여 */
function attachSourceAppIdToSavedItem(item) {
  const openAppIds = getWorkspaceSourceAppIds();
  if (openAppIds.length) {
    item.openAppIds = openAppIds;
    item.appId = getWorkspaceSourceAppId() || openAppIds[0];
  } else {
    const srcApp = getWorkspaceSourceAppId();
    if (srcApp) item.appId = srcApp;
  }
  return item;
}

function parseModalSourceOpenAppIds(modal) {
  if (!modal?.dataset?.sourceOpenAppIds) return [];
  try {
    const parsed = JSON.parse(modal.dataset.sourceOpenAppIds);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function applyWorkspaceSourceAppsToSavedItem(item, options = {}) {
  const liveOpen = getWorkspaceSourceAppIds();
  const openAppIds = liveOpen.length
    ? liveOpen
    : (options.openAppIds?.length ? options.openAppIds : []);
  const primaryAppId = getWorkspaceSourceAppId()
    || options.primaryAppId
    || (openAppIds.length ? openAppIds[0] : null);
  if (openAppIds.length) item.openAppIds = [...openAppIds];
  if (primaryAppId) item.appId = primaryAppId;
  else if (openAppIds.length && !item.appId) item.appId = openAppIds[0];
  return item;
}

function createNeutralAppIconPlaceholder() {
  const div = document.createElement('div');
  div.className = 'project-card__app-icon project-card__app-icon--placeholder';
  div.title = 'AI app';
  div.setAttribute('aria-hidden', 'true');
  return div;
}

function appendPromptCollectionAppIcons(container, appIds) {
  const ids = Array.isArray(appIds) ? appIds : [];
  if (!ids.length) {
    container.appendChild(createNeutralAppIconPlaceholder());
    return;
  }
  const appsWrap = document.createElement('div');
  appsWrap.className = 'project-card__apps';
  ids.forEach((appId) => {
    const iconEl = createAppIconElement(appId);
    if (iconEl) appsWrap.appendChild(iconEl);
  });
  if (appsWrap.children.length) container.appendChild(appsWrap);
  else container.appendChild(createNeutralAppIconPlaceholder());
}

/** 프로젝트 카드와 동일 스타일의 단일 앱 아이콘 DOM (프롬프트 컬렉션 카드 등) */
function createAppIconElement(appId) {
  if (!appId || !appLookup.has(appId)) return null;
  const app = appLookup.get(appId);
  const fallback = app ? app.icon : appId.substring(0, 2).toUpperCase();
  const div = document.createElement('div');
  div.className = 'project-card__app-icon';
  div.title = app ? app.name : appId;
  const favUrl = app ? getAppFaviconUrl(app, 32) : null;
  if (favUrl) {
    const img = document.createElement('img');
    img.src = favUrl;
    img.alt = app ? app.name : appId;
    img.className = 'project-card__app-icon-img';
    img.onerror = () => {
      img.remove();
      div.textContent = fallback;
    };
    div.appendChild(img);
  } else {
    div.textContent = fallback;
  }
  return div;
}

const MAX_CANVASES = 6;
let canvasIdCounter = 1;

const state = {
  canvases: new Map(), // key: canvasId, value: { id, name, windows: Map, layout: string }
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

// 도움말 버튼 — 워크스페이스 가이드(온보딩) 오버레이
function initHelpButton() {
  if (!helpButton) return;

  helpButton.addEventListener('click', () => {
    showWorkspaceOnboardingOverlayFromHelp();
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
  const wrap = document.createElement('button');
  wrap.className = 'sidebar__app-wrap';
  wrap.type = 'button';
  wrap.draggable = true;
  wrap.setAttribute('data-app-id', app.id);
  wrap.setAttribute('data-category-id', app.categoryId);
  wrap.setAttribute('aria-label', `${app.name} 창 열기`);
  if (app.accent) {
    wrap.style.setProperty('--app-accent', app.accent);
  }

  const box = document.createElement('div');
  box.className = 'sidebar__app';

  const iconHolder = document.createElement('div');
  iconHolder.className = 'sidebar__app-icon';
  const faviconUrl = getAppFaviconUrl(app, 32);
  if (faviconUrl) {
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = app.name;
    img.className = 'sidebar__app-icon-img';
    img.onerror = () => { img.remove(); iconHolder.textContent = app.icon; };
    iconHolder.appendChild(img);
  } else {
    iconHolder.textContent = app.icon;
  }
  box.appendChild(iconHolder);

  const name = document.createElement('span');
  name.className = 'sidebar__app-name';
  name.textContent = app.name;

  wrap.append(box, name);
  return wrap;
}

function buildLookups() {
  appLookup.clear();
  categoryLookup.clear();
  customApps.forEach((app) => {
    const override = appOverrides[app.id] || {};
    const merged = applyAppOverrides({ ...app, categoryId: 'custom' }, override);
    appLookup.set(merged.id, merged);
  });
  appCatalog.forEach((category) => {
    categoryLookup.set(category.id, category);
    category.apps.forEach((app) => {
      if (hiddenAppIds.includes(app.id)) return;
      const override = appOverrides[app.id] || {};
      const merged = applyAppOverrides({ ...app, categoryId: category.id }, override);
      appLookup.set(merged.id, merged);
    });
  });
}

function createAddButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sidebar__app sidebar__app--add';
  btn.setAttribute('aria-label', '링크 추가');
  const iconHolder = document.createElement('div');
  iconHolder.className = 'sidebar__app-icon';
  const img = document.createElement('img');
  img.src = 'assets/icons/plus.svg';
  img.alt = '';
  img.className = 'sidebar__app-icon-img';
  iconHolder.appendChild(img);
  btn.appendChild(iconHolder);
  return btn;
}

function renderSidebar() {
  if (!sidebarList) return;
  buildLookups();
  sidebarList.innerHTML = '';

  const fragment = document.createDocumentFragment();

  const addBtn = createAddButton();
  addBtn.addEventListener('click', openAddLinkModal);
  fragment.appendChild(addBtn);

  customApps.forEach((app) => {
    const override = appOverrides[app.id] || {};
    const merged = applyAppOverrides({ ...app, categoryId: 'custom' }, override);
    fragment.appendChild(createSidebarItem(merged));
  });

  appCatalog.forEach((category) => {
    category.apps.forEach((app) => {
      if (hiddenAppIds.includes(app.id)) return;
      const override = appOverrides[app.id] || {};
      const merged = applyAppOverrides({ ...app, categoryId: category.id }, override);
      appLookup.set(merged.id, merged);
      fragment.appendChild(createSidebarItem(merged));
    });
  });

  sidebarList.appendChild(fragment);
}

// 앱 폴더 토글 기능
function initAppsFolderToggle() {
  const folders = [
    { toggleId: 'apps-folder-toggle', wrapperId: 'apps-wrapper', type: 'apps' },
    { toggleId: 'saveprompt-folder-toggle', wrapperId: 'saveprompt-wrapper', type: 'savedform' }
  ];
  
  folders.forEach(({ toggleId, wrapperId, type }) => {
    const folderToggle = document.getElementById(toggleId);
    const appsWrapper = document.getElementById(wrapperId);
    
    if (!folderToggle || !appsWrapper) return;
    
    // 폴더가 비어있는지 확인
    const checkIfEmpty = () => {
      if (type === 'savedform') {
        return false;
      }
      if (type === 'saved') {
        const isEmpty = !savedItemsData || !savedItemsData.folders || savedItemsData.folders.length === 0 || 
                       savedItemsData.folders.every(f => !f.items || f.items.length === 0);
        if (isEmpty) {
          appsWrapper.classList.add('sidebar__apps-wrapper--empty');
        } else {
          appsWrapper.classList.remove('sidebar__apps-wrapper--empty');
        }
        return isEmpty;
      } else {
      const appsList = appsWrapper.querySelector('.sidebar__apps');
      const isEmpty = !appsList || appsList.children.length === 0;
      
      if (isEmpty) {
        appsWrapper.classList.add('sidebar__apps-wrapper--empty');
      } else {
        appsWrapper.classList.remove('sidebar__apps-wrapper--empty');
      }
      
      return isEmpty;
      }
    };
    
    // 초기 체크
    checkIfEmpty();
    
    folderToggle.addEventListener('click', () => {
      const isEmpty = checkIfEmpty();
      const isExpanded = folderToggle.getAttribute('aria-expanded') === 'true';
      
      // 화살표는 항상 토글
      folderToggle.setAttribute('aria-expanded', !isExpanded);
      folderToggle.classList.toggle('sidebar__folder-toggle--collapsed', isExpanded);
      
      if (type === 'saved' || type === 'savedform') {
        appsWrapper.classList.toggle('sidebar__apps-wrapper--collapsed', isExpanded);
        if (type === 'savedform') {
          if (!isExpanded) appsWrapper.classList.remove('sidebar__apps-wrapper--empty');
        } else if (!isExpanded) {
          appsWrapper.classList.remove('sidebar__apps-wrapper--empty');
        } else {
          checkIfEmpty();
        }
      } else if (!isEmpty) {
        appsWrapper.classList.toggle('sidebar__apps-wrapper--collapsed', isExpanded);
      }
    });
  });
}

// 앱 아이콘 우클릭 컨텍스트 메뉴 (Edit link / Delete)
let sidebarContextMenuAppId = null;

function initSidebarAppContextMenu() {
  const menu = document.getElementById('sidebar-app-context-menu');
  if (!menu || !sidebarList) return;

  sidebarList.addEventListener('contextmenu', (e) => {
    const wrap = e.target.closest('.sidebar__app-wrap');
    if (!wrap) return;
    e.preventDefault();
    e.stopPropagation();
    sidebarContextMenuAppId = wrap.getAttribute('data-app-id');
    if (!sidebarContextMenuAppId) return;

    menu.style.display = 'block';
    const x = e.clientX;
    const y = e.clientY;
    const rect = menu.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + rect.width + pad > window.innerWidth) left = window.innerWidth - rect.width - pad;
    if (top + rect.height + pad > window.innerHeight) top = window.innerHeight - rect.height - pad;
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  });

  menu.querySelector('[data-action="edit-link"]')?.addEventListener('click', () => {
    if (sidebarContextMenuAppId) openEditLinkModal(sidebarContextMenuAppId);
    menu.style.display = 'none';
    sidebarContextMenuAppId = null;
  });

  menu.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
    if (sidebarContextMenuAppId) {
      if (isCustomAppId(sidebarContextMenuAppId)) {
        customApps = customApps.filter((a) => a.id !== sidebarContextMenuAppId);
        saveCustomApps();
        renderSidebar();
        showToast('링크가 삭제되었습니다.');
      } else if (!hiddenAppIds.includes(sidebarContextMenuAppId)) {
        hiddenAppIds.push(sidebarContextMenuAppId);
        saveHiddenAppIds();
        renderSidebar();
        showToast('사이드바에서 제거되었습니다.');
      }
    }
    menu.style.display = 'none';
    sidebarContextMenuAppId = null;
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#sidebar-app-context-menu')) return;
    menu.style.display = 'none';
    sidebarContextMenuAppId = null;
  });
}

function setEditLinkIconPreview(modal, src) {
  const iconPreview = document.getElementById('edit-link-icon-preview');
  const iconPlaceholder = document.getElementById('edit-link-icon-placeholder');
  const iconUrlInput = document.getElementById('edit-link-icon-url');
  if (!iconPreview || !iconPlaceholder) return;

  if (src) {
    iconPreview.src = src;
    iconPreview.style.display = 'block';
    iconPlaceholder.style.display = 'none';
    if (iconUrlInput && src.startsWith('http')) iconUrlInput.value = src;
  } else {
    iconPreview.src = '';
    iconPreview.style.display = 'none';
    iconPlaceholder.style.display = '';
    if (iconUrlInput) iconUrlInput.value = '';
  }
}

// Edit link 모달
function openEditLinkModal(appId) {
  const modal = document.getElementById('edit-link-modal');
  const siteNameInput = document.getElementById('edit-link-site-name');
  const urlInput = document.getElementById('edit-link-url');
  const iconInput = document.getElementById('edit-link-icon-input');
  const app = appLookup.get(appId);
  if (!modal || !siteNameInput || !urlInput || !app) return;

  modal.dataset.appId = appId;
  modal.dataset.iconChanged = 'false';
  modal.dataset.iconCleared = 'false';
  delete modal.dataset.iconDataUrl;

  siteNameInput.value = app.name || '';
  urlInput.value = app.url || '';
  if (iconInput) iconInput.value = '';

  const customIcon = getAppCustomIcon(app);
  const previewSrc = customIcon || getAppFaviconUrl(app, 64);
  setEditLinkIconPreview(modal, previewSrc || '');
  if (customIcon) modal.dataset.iconDataUrl = customIcon;

  modal.style.display = 'flex';
  siteNameInput.focus();
}

function closeEditLinkModal() {
  const modal = document.getElementById('edit-link-modal');
  if (modal) {
    modal.style.display = 'none';
    delete modal.dataset.appId;
    delete modal.dataset.iconDataUrl;
    delete modal.dataset.iconChanged;
    delete modal.dataset.iconCleared;
  }
}

function initEditLinkModal() {
  const modal = document.getElementById('edit-link-modal');
  const form = document.getElementById('edit-link-form');
  const closeBtn = document.getElementById('edit-link-modal-close');
  const overlay = modal?.querySelector('.edit-link-modal__overlay');
  const iconInput = document.getElementById('edit-link-icon-input');
  const iconUrlInput = document.getElementById('edit-link-icon-url');
  const iconResetBtn = document.getElementById('edit-link-icon-reset');

  closeBtn?.addEventListener('click', closeEditLinkModal);
  overlay?.addEventListener('click', closeEditLinkModal);

  const markIconChanged = (src) => {
    if (!modal) return;
    modal.dataset.iconChanged = 'true';
    modal.dataset.iconCleared = 'false';
    if (src) modal.dataset.iconDataUrl = src;
    else delete modal.dataset.iconDataUrl;
    setEditLinkIconPreview(modal, src || '');
  };

  iconInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage =
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|svg)$/i.test(file.name);
    if (!isImage) {
      showToast('PNG, JPG, SVG 이미지만 선택할 수 있습니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => markIconChanged(reader.result);
    reader.readAsDataURL(file);
  });

  iconUrlInput?.addEventListener('change', () => {
    const url = (iconUrlInput.value || '').trim();
    if (!url) return;
    markIconChanged(url);
  });

  iconResetBtn?.addEventListener('click', () => {
    if (!modal) return;
    modal.dataset.iconChanged = 'true';
    modal.dataset.iconCleared = 'true';
    delete modal.dataset.iconDataUrl;
    if (iconInput) iconInput.value = '';
    if (iconUrlInput) iconUrlInput.value = '';
    const websiteUrl = (document.getElementById('edit-link-url')?.value || '').trim();
    setEditLinkIconPreview(modal, getFaviconUrlForWebsite(websiteUrl, 64) || '');
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const appId = modal?.dataset.appId;
    if (!appId) return;

    const siteNameInput = document.getElementById('edit-link-site-name');
    const urlInput = document.getElementById('edit-link-url');
    const name = (siteNameInput?.value || '').trim();
    const url = (urlInput?.value || '').trim();
    if (!name || !url) {
      showToast('사이트 이름과 URL을 입력하세요.');
      return;
    }

    const iconChanged = modal?.dataset.iconChanged === 'true';
    const iconCleared = modal?.dataset.iconCleared === 'true';
    let iconImage;
    if (iconChanged) {
      iconImage = iconCleared ? null : (modal?.dataset.iconDataUrl || null);
    }

    if (isCustomAppId(appId)) {
      const idx = customApps.findIndex((a) => a.id === appId);
      if (idx >= 0) {
        const updated = { ...customApps[idx], name, url };
        if (iconChanged) {
          updated.iconImage = iconImage;
          updated.iconData = iconImage;
        }
        customApps[idx] = updated;
        saveCustomApps();
        if (appOverrides[appId]) {
          delete appOverrides[appId];
          saveAppOverrides();
        }
      }
    } else {
      const prev = appOverrides[appId] || {};
      const next = { ...prev, name, url };
      if (iconChanged) next.iconImage = iconImage;
      appOverrides[appId] = next;
      saveAppOverrides();
    }

    buildLookups();
    renderSidebar();
    closeEditLinkModal();
    showToast('링크가 수정되었습니다.');
  });
}

// Add link 모달 (Figma 451-9133)
function openAddLinkModal() {
  const modal = document.getElementById('add-link-modal');
  const siteNameInput = document.getElementById('add-link-site-name');
  const urlInput = document.getElementById('add-link-website-url');
  const iconPreview = document.getElementById('add-link-icon-preview');
  const iconPlaceholder = document.getElementById('add-link-icon-placeholder');
  const iconInput = document.getElementById('add-link-icon-input');
  if (!modal || !siteNameInput || !urlInput) return;

  siteNameInput.value = '';
  urlInput.value = '';
  if (iconInput) iconInput.value = '';
  if (iconPreview) {
    iconPreview.src = '';
    iconPreview.style.display = 'none';
  }
  if (iconPlaceholder) iconPlaceholder.style.display = '';
  modal.dataset.iconDataUrl = '';
  modal.style.display = 'flex';
  siteNameInput.focus();
}

function closeAddLinkModal() {
  const modal = document.getElementById('add-link-modal');
  if (modal) {
    modal.style.display = 'none';
    delete modal.dataset.iconDataUrl;
  }
}

function initAddLinkModal() {
  const modal = document.getElementById('add-link-modal');
  const form = document.getElementById('add-link-form');
  const closeBtn = document.getElementById('add-link-modal-close');
  const overlay = modal?.querySelector('.add-link-modal__overlay');
  const iconBox = document.getElementById('add-link-icon-box');
  const iconInput = document.getElementById('add-link-icon-input');
  const iconPreview = document.getElementById('add-link-icon-preview');
  const iconPlaceholder = document.getElementById('add-link-icon-placeholder');

  closeBtn?.addEventListener('click', closeAddLinkModal);
  overlay?.addEventListener('click', closeAddLinkModal);

  if (iconInput && iconPreview && iconPlaceholder) {
    iconInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        iconPreview.src = reader.result;
        iconPreview.style.display = 'block';
        iconPlaceholder.style.display = 'none';
        if (modal) modal.dataset.iconDataUrl = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const siteNameInput = document.getElementById('add-link-site-name');
    const urlInput = document.getElementById('add-link-website-url');
    const name = (siteNameInput?.value || '').trim();
    const url = (urlInput?.value || '').trim();
    if (!name || !url) {
      showToast('사이트 이름과 URL을 입력하세요.');
      return;
    }

    const iconDataUrl = modal?.dataset.iconDataUrl || null;
    const newApp = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      name,
      url,
      icon: name.slice(0, 2).toUpperCase(),
      iconImage: iconDataUrl || null,
      categoryId: 'custom',
    };
    customApps.push(newApp);
    saveCustomApps();
    buildLookups();
    renderSidebar();
    closeAddLinkModal();
    showToast('링크가 추가되었습니다.');
  });
}

// ============ Canvas Management ============

function getActiveCanvas() {
  return state.canvases.get(state.activeCanvasId);
}

/** 저장 데이터에 잘못된 activeCanvasId가 있으면 첫 캔버스로 보정 */
function ensureActiveCanvasSelected() {
  if (state.canvases.size === 0) {
    state.activeCanvasId = null;
    return;
  }
  if (!state.activeCanvasId || !state.canvases.has(state.activeCanvasId)) {
    state.activeCanvasId = state.canvases.keys().next().value;
  }
}

function createCanvas(name = null) {
  if (state.canvases.size >= MAX_CANVASES) {
    showToast(`최대 ${MAX_CANVASES}개의 캔버스까지 생성할 수 있습니다.`);
    return null;
  }
  
  const canvasId = `canvas-${canvasIdCounter++}`;
  const canvasName = name || `Canvas ${state.canvases.size + 1}`;
  
  const canvas = {
    id: canvasId,
    name: canvasName,
    windows: new Map(),
    layout: null, // 자동 레이아웃 (null이면 자동)
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
  updateLayoutButton();
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
    if (!windowData?.app?.url) {
      console.warn('건너뛴 창: 앱 정보 없음', windowData?.appId || windowData?.id);
      return;
    }
    const windowElement = createWindowElement(windowData);
    workspaceCanvas.appendChild(windowElement);
  });
  
  updateWorkspaceLayoutClass();
  requestAnimationFrame(() => {
    requestAnimationFrame(refreshAllFrameSizes);
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
    const canvasesExport = {
      canvases: Array.from(state.canvases.values()).map(canvas => ({
        id: canvas.id,
        name: canvas.name,
        windows: Array.from(canvas.windows.values()),
      })),
      activeCanvasId: state.activeCanvasId,
      canvasIdCounter,
    };
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(canvasesExport));

    // 프로젝트가 열려있으면 프로젝트에도 저장
    if (activeProjectId) {
      saveCurrentProjectCanvases();
    }
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
    ensureActiveCanvasSelected();
    
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
    const defaultCanvas = createCanvas('Canvas 1');
    state.activeCanvasId = defaultCanvas.id;
  } else {
    ensureActiveCanvasSelected();
  }
  
  renderCanvasTabs();
  renderWorkspaceWindows();
}

function updateWorkspaceLayoutClass() {
  if (!workspaceCanvas) return;
  const activeCanvas = getActiveCanvas();
  const count = activeCanvas ? activeCanvas.windows.size : 0;
  
  // 모든 레이아웃 클래스 제거
  workspaceCanvas.className = 'workspace__canvas';

  if (count === 0) return;
  
  // 레이아웃 결정
  let layoutClass = '';
  
  if (count === 1) {
    layoutClass = 'canvas-layout-1';
  } else if (count === 2) {
    // 사용자 설정 or 기본 (좌우)
    layoutClass = activeCanvas.layout || 'canvas-layout-2-h';
  } else if (count === 3) {
    // 사용자 설정 or 기본 (왼쪽1)
    layoutClass = activeCanvas.layout || 'canvas-layout-3-left';
  } else if (count === 4) {
    layoutClass = 'canvas-layout-4';
  }
  
  console.log('Setting layout class:', layoutClass, 'for', count, 'windows');
  workspaceCanvas.classList.add(layoutClass);
  // 그리드 레이아웃이 크기를 담당 — 수동 리사이즈로 남은 inline 크기 제거
  workspaceCanvas.querySelectorAll('.ai-window').forEach((win) => {
    win.style.width = '';
    win.style.height = '';
  });
  requestAnimationFrame(() => refreshAllFrameSizes());
  updateLayoutButton();
}

function setWorkspaceDroppable(active) {
  workspaceCanvas.classList.toggle('drag-target', active);
}

function handleDragStart(event) {
  const el = event.target.closest('.sidebar__app-wrap');
  if (!el) return;
  const appId = el.getAttribute('data-app-id');
  const app = appLookup.get(appId);
  if (!app) return;

  state.draggedApp = app;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('application/json', JSON.stringify(app));
  el.setAttribute('aria-grabbed', 'true');
}

function handleDragEnd(event) {
  const el = event.target.closest('.sidebar__app-wrap');
  if (el) el.setAttribute('aria-grabbed', 'false');
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
  windowNode.addEventListener('mousedown', () => {
    setWorkspaceSourceAppId(app.id);
  });

  const titleEl = windowNode.querySelector('.ai-window__title');
  const iconEl = windowNode.querySelector('.ai-window__icon');
  const contentContainer = windowNode.querySelector('[data-frame-container]');
  const closeButton = windowNode.querySelector('[data-action="close"]');
  const refreshButton = windowNode.querySelector('[data-action="refresh"]');
  const toggleCheckbox = windowNode.querySelector('[data-action="toggle-prompt"]');
  const resizeHandle = windowNode.querySelector('[data-resize-handle]');
  const headerEl = windowNode.querySelector('.ai-window__header');

  titleEl.textContent = app.name;
  const faviconUrlForWindow = getAppFaviconUrl(app, 32);
  if (faviconUrlForWindow) {
    iconEl.textContent = '';
    const iconImg = document.createElement('img');
    iconImg.src = faviconUrlForWindow;
    iconImg.alt = app.name;
    iconImg.className = 'ai-window__icon-img';
    iconImg.onerror = () => { iconImg.remove(); iconEl.textContent = app.icon; };
    iconEl.appendChild(iconImg);
  } else {
    iconEl.textContent = app.icon;
  }

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
  if (!app?.url) {
    showToast('앱 URL을 찾을 수 없습니다. 사이드바에서 링크를 다시 설정해 주세요.');
    return;
  }

  ensureActiveCanvasSelected();
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) {
    showToast('캔버스를 불러올 수 없습니다. 프로젝트를 다시 열어 주세요.');
    return;
  }
  
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
  setWorkspaceSourceAppId(app.id);

  const windowElement = createWindowElement(windowData);
  workspaceCanvas.appendChild(windowElement);

  updateWorkspaceLayoutClass();
  updateLayoutButton();
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
  updateLayoutButton();
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

function initResizeHandle(_windowNode, handle) {
  if (!handle) return;
  // 그리드 캔버스가 창 크기를 담당 — 수동 리사이즈 비활성
  handle.style.display = 'none';
}

function tryExecCommandCopy(value) {
  const hiddenFieldStyle =
    'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;pointer-events:none;';

  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.cssText = hiddenFieldStyle;
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) return true;
  } catch (err) {
    console.warn('[copy] execCommand (textarea) failed', err);
  }

  try {
    const span = document.createElement('span');
    span.textContent = value;
    span.setAttribute('aria-hidden', 'true');
    span.style.cssText = hiddenFieldStyle;
    document.body.appendChild(span);
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const ok = document.execCommand('copy');
    selection?.removeAllRanges();
    span.remove();
    if (ok) return true;
  } catch (err) {
    console.warn('[copy] execCommand (selection) failed', err);
  }

  return false;
}

async function tryElectronClipboard(value) {
  const write = window.aispace?.writeClipboardText;
  if (!write) return false;
  try {
    const result = await Promise.resolve(write(value));
    return result !== false;
  } catch (err) {
    console.warn('[copy] Electron clipboard failed', err);
    return false;
  }
}

async function tryNavigatorClipboard(value) {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (err) {
    console.warn('[copy] navigator.clipboard.writeText failed', err);
    return false;
  }
}

async function runClipboardCopyAttempt(value) {
  if (await tryElectronClipboard(value)) return true;
  if (await tryNavigatorClipboard(value)) return true;
  return tryExecCommandCopy(value);
}

/** @returns {Promise<boolean>} */
async function copyTextToClipboard(text) {
  const value = String(text ?? '');
  if (!value) return false;

  if (await runClipboardCopyAttempt(value)) return true;
  await new Promise((r) => setTimeout(r, 50));
  if (await runClipboardCopyAttempt(value)) return true;

  console.error('[copy] All clipboard methods failed after retry', { length: value.length });
  return false;
}

/** @returns {Promise<boolean>} */
async function copyPromptWithFeedback(
  text,
  {
    emptyMessage = '복사할 내용이 없습니다.',
    successMessage = '프롬프트가 복사되었습니다.',
    failureMessage = '복사에 실패했습니다.',
  } = {}
) {
  const value = String(text ?? '');
  if (!value) {
    showToast(emptyMessage);
    return false;
  }
  const ok = await copyTextToClipboard(value);
  showToast(ok ? successMessage : failureMessage);
  return ok;
}

function initClipboardCopyDelegation() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest(
      '[data-copy-text], .js-copy-prompt, .prompt-collection-card__copy'
    );
    if (!btn || btn.disabled) return;
    if (btn.classList.contains('prompt-collection-card__copy')) return;

    const text =
      btn.dataset.copyText ??
      btn.getAttribute('data-copy-text') ??
      btn.closest('[data-copy-source]')?.querySelector('[data-copy-source-text]')?.textContent ??
      '';
    if (!text && !btn.dataset.copyText) return;

    e.preventDefault();
    e.stopPropagation();
    const successMessage = btn.dataset.copySuccessMessage || '프롬프트가 복사되었습니다.';
    await copyPromptWithFeedback(text, { successMessage });
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
      background: rgba(255, 255, 255, 0.95);
      color: #1c1c1e;
      padding: 14px 24px;
      border-radius: 999px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      backdrop-filter: blur(14px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      transition: opacity 180ms ease, transform 180ms ease;
      z-index: 999;
      font-size: 0.95rem;
      font-weight: 500;
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

function getPromptEnabledWindows() {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return [];
  return Array.from(activeCanvas.windows.values()).filter(w => w.promptEnabled !== false);
}

function getWebviewForWindowData(windowData) {
  if (!windowData || !workspaceCanvas) return null;
  const windowElement = workspaceCanvas.querySelector(`[data-window-id="${windowData.id}"]`);
  return windowElement?.querySelector('webview') || null;
}

function runWebviewScript(webview, script) {
  if (!webview) return Promise.resolve({ success: false });
  return webview.executeJavaScript(script)
    .then(result => result || { success: false })
    .catch(error => {
      console.error('Failed to execute script in webview:', error);
      return { success: false, error: error.message };
    });
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

function buildSetInputScript(promptText) {
  const escapedPrompt = promptText.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const selectorsJson = JSON.stringify(INPUT_SELECTORS);
  return `
    (function() {
      const selectors = ${selectorsJson};
      const promptText = '${escapedPrompt}';

      function dispatchInputEvents(el, value) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      }

      for (const selector of selectors) {
        try {
          const input = document.querySelector(selector);
          if (!input) continue;

          if (input.contentEditable === 'true') {
            input.focus();
            input.textContent = promptText;
            dispatchInputEvents(input, promptText);
            return { success: true, selector, type: 'contenteditable' };
          }

          if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            input.focus();
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');
            if (descriptor && descriptor.set) descriptor.set.call(input, promptText);
            else input.value = promptText;
            dispatchInputEvents(input, promptText);
            return { success: true, selector, type: 'input' };
          }
        } catch (error) {}
      }

      return { success: false, error: 'No input field found' };
    })();
  `;
}

function sendPromptToWebview(webview, promptText) {
  if (!webview || !promptText) return Promise.resolve({ success: false });
  return runWebviewScript(webview, buildSetInputScript(promptText));
}

async function broadcastPromptToWindows(promptText) {
  if (!getActiveCanvas()) {
    showToast('활성 캔버스가 없습니다.');
    return;
  }

  if (!promptText || !promptText.trim()) {
    showToast('프롬프트를 입력해주세요.');
    return;
  }

  const enabledWindows = getPromptEnabledWindows();
  if (enabledWindows.length === 0) {
    showToast('프롬프트를 받을 창이 없습니다. 창의 토글을 ON으로 설정하세요.');
    return;
  }

  let successCount = 0;
  const failedApps = [];

  for (const windowData of enabledWindows) {
    const webview = getWebviewForWindowData(windowData);
    if (!webview) {
      failedApps.push(windowData.app.name);
      continue;
    }

    try {
      const result = await sendPromptToWebview(webview, promptText);
      if (result.success) successCount++;
      else failedApps.push(windowData.app.name);
    } catch (error) {
      console.error(`Failed to send prompt to ${windowData.app.name}:`, error);
      failedApps.push(windowData.app.name);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

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
  loadAppOverrides();
  loadHiddenAppIds();
  loadCustomApps();
  renderSidebar();
  initAppsFolderToggle();
  initSidebarAppContextMenu();
  initEditLinkModal();
  initAddLinkModal();
  initLayoutSelector(); // 레이아웃 선택 기능
  // initCanvases는 프로젝트를 열 때 loadProjectCanvases에서 처리
  initToastStyles();
  initScrollIndicator();

  sidebarList.addEventListener('dragstart', (event) => {
    if (event.target.closest('.sidebar__app-wrap')) {
      handleDragStart(event);
    }
  });

  sidebarList.addEventListener('dragend', (event) => {
    if (event.target.closest('.sidebar__app-wrap')) {
      handleDragEnd(event);
    }
  });

  sidebarList.addEventListener('click', (event) => {
    const button = event.target.closest('.sidebar__app-wrap');
    if (!button) return;
    const appId = button.getAttribute('data-app-id');
    const app = appLookup.get(appId);
    if (!app) return;
    addWindow(app);
  });

  workspaceCanvas.addEventListener('dragover', handleDragOver);
  workspaceCanvas.addEventListener('dragleave', handleDragLeave);
  workspaceCanvas.addEventListener('drop', handleDrop);
  workspaceCanvas.addEventListener('mousedown', (e) => {
    const win = e.target.closest('.ai-window');
    if (win?.dataset.appId) setWorkspaceSourceAppId(win.dataset.appId);
  });
  workspaceCanvas.addEventListener('focusin', (e) => {
    const win = e.target.closest('.ai-window');
    if (win?.dataset.appId) setWorkspaceSourceAppId(win.dataset.appId);
  });

  // 통합 입력창 이벤트 리스너
  const unifiedInput = document.getElementById('unified-input');
  const sendBtn = document.getElementById('send-btn');

  // 자동 높이 조정 함수
  function autoResizeTextarea() {
    if (!unifiedInput) return;
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

    if (input.startsWith('/')) {
      executeQuickCommand(input);
    } else {
      broadcastPromptToWindows(input);
    }

    unifiedInput.value = '';
    autoResizeTextarea();
    updateSendButtonState();
  }

  sendBtn?.addEventListener('click', executeUnifiedCommand);

  // Enter 키 처리
  unifiedInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      if (event.ctrlKey) {
        return;
      }
      event.preventDefault();
      executeUnifiedCommand();
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
    <span class="workspace__context-menu-icon" aria-hidden="true"><img src="assets/icons/write.svg" alt=""></span>
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
    <span class="workspace__context-menu-icon" aria-hidden="true"><img src="assets/icons/trash.svg" alt=""></span>
    <span>삭제</span>
  `;
  deleteBtn.addEventListener('click', async () => {
    closeContextMenu();
    if (state.canvases.size <= 1) {
      showToast('마지막 캔버스는 삭제할 수 없습니다.');
      return;
    }
    
    // 캔버스에 창이 있는지 확인
    const canvas = state.canvases.get(canvasId);
    if (canvas && canvas.windows.size > 0) {
      const windowCount = canvas.windows.size;
      const ok = await showConfirmModal(
        `This canvas has ${windowCount} open AI window${windowCount === 1 ? '' : 's'}.\nDelete this canvas?`,
        { title: 'Delete canvas', okText: 'Delete', cancelText: 'Cancel' }
      );
      if (ok) deleteCanvas(canvasId);
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

function isElectronHost() {
  return Boolean(window.aispace?.isElectron || window.aispace?.platform) || /Electron/i.test(navigator.userAgent);
}

const WEBVIEW_LOAD_ERROR_HINTS = {
  '-2': '네트워크 연결을 확인해 주세요.',
  '-3': null,
  '-6': '연결이 끊어졌습니다.',
  '-105': 'DNS 조회에 실패했습니다.',
  '-106': '인터넷 연결이 없습니다.',
  '-118': '연결 시간이 초과되었습니다.',
  '-300': '요청이 차단되었습니다.',
  '-301': '리다이렉트가 너무 많습니다.',
  '-302': '인증서 오류가 있습니다.',
  '-324': '서버에 연결하지 못했습니다.',
};

function describeWebviewLoadError(errorCode, errorDescription) {
  const code = String(errorCode);
  const hint = WEBVIEW_LOAD_ERROR_HINTS[code];
  const base = errorDescription || `오류 코드 ${errorCode}`;
  return hint ? `${base} — ${hint}` : base;
}

function clearFrameChrome(container) {
  container?.querySelectorAll('.ai-window__frame-status').forEach((el) => el.remove());
}

function setFrameLoading(container, app, visible) {
  let el = container.querySelector('.ai-window__frame-status--loading');
  if (!visible) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.className = 'ai-window__frame-status ai-window__frame-status--loading';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span class="ai-window__frame-status-spinner" aria-hidden="true"></span><p class="ai-window__frame-status-text"></p>';
    container.appendChild(el);
  }
  el.querySelector('.ai-window__frame-status-text').textContent = `${app.name} 불러오는 중…`;
}

function ensureWebviewVisible(webview) {
  if (!webview) return;
  webview.style.display = 'inline-flex';
  webview.style.visibility = 'visible';
  webview.style.opacity = '1';
}

/** Electron webview는 % 높이를 무시하는 경우가 많아 컨테이너 px 크기로 동기화 */
function bindFrameSizing(container, frame) {
  if (!container || !frame) return;

  const applyFrameSize = () => {
    const rect = container.getBoundingClientRect();
    const w = Math.max(0, Math.round(rect.width));
    const h = Math.max(0, Math.round(rect.height));
    if (w < 1 || h < 1) return;
    if (frame.tagName === 'WEBVIEW') {
      frame.style.display = 'inline-flex';
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;
    } else {
      frame.style.width = '100%';
      frame.style.height = `${h}px`;
    }
  };

  frame.__layvApplyFrameSize = applyFrameSize;

  let rafId = null;
  const scheduleApply = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      applyFrameSize();
    });
  };

  applyFrameSize();
  scheduleApply();

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleApply) : null;
  if (ro) ro.observe(container);

  window.addEventListener('resize', scheduleApply);
  [0, 50, 150, 400].forEach((ms) => setTimeout(scheduleApply, ms));

  const prevCleanup = frame.__layvCleanupFrameLoad;
  frame.__layvCleanupFrameLoad = () => {
    prevCleanup?.();
    ro?.disconnect();
    window.removeEventListener('resize', scheduleApply);
    if (rafId) cancelAnimationFrame(rafId);
    delete frame.__layvApplyFrameSize;
    delete frame.__layvCleanupFrameLoad;
  };
}

function refreshAllFrameSizes() {
  document.querySelectorAll('[data-frame-container] [data-app-id]').forEach((frame) => {
    frame.__layvApplyFrameSize?.();
  });
}

/** SPA는 did-stop-loading이 늦거나 안 올 수 있어 dom-ready·타임아웃으로 오버레이를 반드시 닫음 */
function createFrameLoadingController(container, app, webview, targetUrl) {
  let overlayReleased = false;
  let domReadyTimer = null;
  let hardCapTimer = null;

  const releaseLoadingOverlay = (source) => {
    if (overlayReleased) return;
    overlayReleased = true;
    if (domReadyTimer) {
      clearTimeout(domReadyTimer);
      domReadyTimer = null;
    }
    if (hardCapTimer) {
      clearTimeout(hardCapTimer);
      hardCapTimer = null;
    }
    setFrameLoading(container, app, false);
    ensureWebviewVisible(webview);
    console.debug(`[webview:${app.id}] overlay hidden (${source})`);
  };

  return {
    releaseLoadingOverlay,
    scheduleFallbacks() {
      hardCapTimer = setTimeout(() => releaseLoadingOverlay('timeout-8s'), 8000);
    },
    showLoadingIfInitial() {
      if (!overlayReleased) setFrameLoading(container, app, true);
    },
    onDomReady() {
      ensureWebviewVisible(webview);
      try {
        if (webview.setUserAgent) webview.setUserAgent(LAYV_CHROME_USER_AGENT);
      } catch (err) {
        console.warn(`[webview:${app.id}] setUserAgent`, err);
      }
      requestAnimationFrame(() => {
        webview.__layvApplyFrameSize?.();
        const rect = container.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) {
          releaseLoadingOverlay('zero-size');
          setFrameError(
            container,
            { ...app, url: targetUrl },
            '창 영역 크기가 0입니다. 레이아웃을 바꾸거나 창 크기를 조절한 뒤 새로고침해 주세요.'
          );
        }
      });
      if (!domReadyTimer) {
        domReadyTimer = setTimeout(() => releaseLoadingOverlay('dom-ready-2s'), 2000);
      }
    },
    dispose() {
      if (domReadyTimer) clearTimeout(domReadyTimer);
      if (hardCapTimer) clearTimeout(hardCapTimer);
      domReadyTimer = null;
      hardCapTimer = null;
    },
  };
}

function setFrameError(container, app, message, { errorCode } = {}) {
  clearFrameChrome(container);
  const el = document.createElement('div');
  el.className = 'ai-window__frame-status ai-window__frame-status--error';
  el.setAttribute('role', 'alert');

  const title = document.createElement('p');
  title.className = 'ai-window__frame-status-title';
  title.textContent = `${app.name}을(를) 열 수 없습니다`;

  const detail = document.createElement('p');
  detail.className = 'ai-window__frame-status-text';
  detail.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'ai-window__frame-status-actions';

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'ai-window__frame-status-btn';
  retryBtn.textContent = '다시 시도';
  retryBtn.addEventListener('click', () => refreshAppContent(container, app));

  const externalBtn = document.createElement('button');
  externalBtn.type = 'button';
  externalBtn.className = 'ai-window__frame-status-btn ai-window__frame-status-btn--primary';
  externalBtn.textContent = '브라우저에서 열기';
  externalBtn.addEventListener('click', () => {
    if (window.aispace?.openExternalAI) {
      window.aispace.openExternalAI(app.url);
    } else {
      window.open(app.url, '_blank', 'noopener');
    }
  });

  actions.append(retryBtn, externalBtn);
  el.append(title, detail, actions);
  if (errorCode !== undefined) {
    el.dataset.errorCode = String(errorCode);
  }
  container.appendChild(el);
}

function mountAppContent(container, app) {
  if (!container || !app?.url) return;
  const targetUrl = normalizeAppUrl(app.url);
  const useWebview = isElectronHost();
  unmountAppContent(container, app);
  clearFrameChrome(container);

  const bindFrameFocus = (frame) => {
    frame.addEventListener('focus', () => setWorkspaceSourceAppId(app.id));
  };

  if (useWebview) {
    setFrameLoading(container, app, true);

    const webview = document.createElement('webview');
    webview.setAttribute('partition', AI_WEBVIEW_PARTITION);
    webview.setAttribute('useragent', LAYV_CHROME_USER_AGENT);
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute(
      'webpreferences',
      'contextIsolation=yes,nodeIntegration=no,sandbox=no'
    );
    ensureWebviewVisible(webview);
    webview.dataset.appId = app.id;

    const loadingCtl = createFrameLoadingController(container, app, webview, targetUrl);
    webview.__frameLoadingController = loadingCtl;
    loadingCtl.scheduleFallbacks();

    webview.addEventListener('did-start-loading', () => {
      loadingCtl.showLoadingIfInitial();
    });

    webview.addEventListener('did-stop-loading', () => {
      loadingCtl.releaseLoadingOverlay('did-stop-loading');
    });

    webview.addEventListener('did-finish-load', () => {
      loadingCtl.releaseLoadingOverlay('did-finish-load');
    });

    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3) return;
      loadingCtl.releaseLoadingOverlay('did-fail-load');
      const message = describeWebviewLoadError(event.errorCode, event.errorDescription);
      console.error(`[webview:${app.id}] load failed`, event.errorCode, event.errorDescription, targetUrl);
      setFrameError(container, { ...app, url: targetUrl }, message, { errorCode: event.errorCode });
    });

    webview.addEventListener('dom-ready', () => {
      loadingCtl.onDomReady();
    });

    webview.addEventListener('console-message', (e) => {
      if (e.level >= 2) {
        console.warn(`[webview:${app.id}:console]`, e.message);
      }
    });

    webview.addEventListener('crashed', () => {
      loadingCtl.releaseLoadingOverlay('crashed');
      setFrameError(container, { ...app, url: targetUrl }, '페이지 프로세스가 비정상 종료되었습니다. 다시 시도해 주세요.');
    });

    bindFrameFocus(webview);
    container.appendChild(webview);
    bindFrameSizing(container, webview);
    webview.setAttribute('src', targetUrl);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = targetUrl;
    iframe.title = `${app.name} 인터페이스`;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.dataset.appId = app.id;
    iframe.addEventListener('error', () => {
      setFrameError(
        container,
        { ...app, url: targetUrl },
        '브라우저 iframe에서는 ChatGPT·Gemini가 차단될 수 있습니다. LAYV 데스크톱 앱을 사용해 주세요.'
      );
    });
    bindFrameFocus(iframe);
    container.appendChild(iframe);
    bindFrameSizing(container, iframe);
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
    existing.__frameLoadingController?.dispose();
    delete existing.__frameLoadingController;
    existing.__layvCleanupFrameLoad?.();
    existing.remove();
  }
  clearFrameChrome(container);
}

// ==================== 커스텀 앱 관리 (기존 custom-app-modal 연동) ====================
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
    saveCustomApps();
    buildLookups();
    renderSidebar();
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
  const emailEl = myPageButton.querySelector('.sidebar__mypage-email');
  
  if (avatar) {
    avatar.innerHTML = '';
    
    if (userProfile.avatar) {
      const img = document.createElement('img');
      img.src = userProfile.avatar;
      img.alt = userProfile.name;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      avatar.appendChild(img);
    } else {
      avatar.textContent = (userProfile.name || 'U').charAt(0).toUpperCase();
    }
  }
  
  if (nameEl) {
    nameEl.textContent = userProfile.name || 'User';
  }
  
  if (emailEl) {
    emailEl.textContent = userProfile.email || '';
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
      avatarPreview.textContent = (userProfile.name || 'U').charAt(0).toUpperCase();
    }
  }
  
  modal.style.display = 'flex';
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  loadProfile();
  updateMyPageButton();
  updateHomeProfile();
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
  const homeProfile = document.getElementById('home-profile');

  // 닫기 버튼들
  closeBtn?.addEventListener('click', closeProfileModal);
  cancelBtn?.addEventListener('click', closeProfileModal);
  overlay?.addEventListener('click', closeProfileModal);

  // 마이페이지 / 홈 사이드바 프로필 클릭
  myPageButton?.addEventListener('click', openProfileModal);
  homeProfile?.addEventListener('click', openProfileModal);
  homeProfile?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProfileModal();
    }
  });
  
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
    updateHomeProfile();
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

// 테스터용 키 입력 기능 일시 비활성화 (true 시 라이선스 검증 스킵, 키 입력 모달 미표시)
const TEMPORARILY_DISABLE_LICENSE_CHECK = true;

// 콜드 스타트 스플래시 (세션당 1회, 홈↔워크스페이스 이동 시 미표시)
const APP_SPLASH_ENTER_MS = 450;
const APP_SPLASH_HOLD_MS = 500;
const APP_SPLASH_EXIT_MS = 280;
let appColdStartSplashFinished = false;

function hideAppSplashImmediate() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.remove('app-splash--open', 'app-splash--closing');
  splash.classList.add('app-splash--hidden');
  splash.setAttribute('hidden', '');
  splash.setAttribute('aria-hidden', 'true');
  appColdStartSplashFinished = true;
}

function initAppSplash() {
  if (appColdStartSplashFinished) {
    return Promise.resolve();
  }

  const splash = document.getElementById('app-splash');
  if (!splash || splash.classList.contains('app-splash--hidden')) {
    appColdStartSplashFinished = true;
    return Promise.resolve();
  }

  const content = splash.querySelector('.app-splash__content');

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      hideAppSplashImmediate();
      resolve();
    };

    splash.removeAttribute('hidden');
    splash.setAttribute('aria-hidden', 'false');
    splash.classList.remove('app-splash--closing', 'app-splash--hidden');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        splash.classList.add('app-splash--open');
      });
    });

    const startExit = () => {
      splash.classList.remove('app-splash--open');
      splash.classList.add('app-splash--closing');

      const onExitEnd = (e) => {
        if (e.target !== content) return;
        content.removeEventListener('transitionend', onExitEnd);
        finish();
      };

      if (content) {
        content.addEventListener('transitionend', onExitEnd);
      }
      setTimeout(finish, APP_SPLASH_EXIT_MS + 80);
    };

    setTimeout(startExit, APP_SPLASH_ENTER_MS + APP_SPLASH_HOLD_MS);
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  // 라이선스 모듈 import
  const { isLicenseValid, verifyLicense, saveLicense } = await import('./license.js');
  
  // 라이선스 검증 (TEMPORARILY_DISABLE_LICENSE_CHECK 시 스킵)
  if (!TEMPORARILY_DISABLE_LICENSE_CHECK && !isLicenseValid()) {
    hideAppSplashImmediate();
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

  // 프로젝트 데이터 로드
  loadProjects();
  loadLikedProjectIds();
  loadProjectFolders();

  // 워크스페이스 초기화 (캔버스는 프로젝트 열 때 로드, appLookup 생성됨)
  initWorkspace();
  initWorkspaceWelcomeOverlay();
  initHomeOnboardingOverlay();
  initWorkspaceOnboardingOverlay();

  // 메인 화면 프로젝트 카드 렌더링 (appLookup 사용)
  renderProjectCards();

  // 커스텀 앱 추가용 기존 모달 초기화 (Add link 모달은 initAddLinkModal에서 처리)
  initCustomAppModal();

  // 프로필 모달 초기화 및 프로필 UI 반영
  initProfileModal();
  updateMyPageButton();
  updateHomeProfile();

  // 통합 저장 관리 초기화
  initSavedItemsManagement();

  // 프롬프트 보기 모달 초기화
  initPromptViewModal();
  initClipboardCopyDelegation();

  // 홈 뷰 초기화 (표시는 콜드 스타트 스플래시 종료 후)
  initHomeView();
  await initAppSplash();
  showHomeView();

  // 사이드바 헤더(LAYV) 클릭으로 홈 복귀
  const sidebarHeader = document.querySelector('.sidebar__header-content');
  if (sidebarHeader) {
    sidebarHeader.style.cursor = 'pointer';
    sidebarHeader.addEventListener('click', () => {
      showHomeView();
    });
    sidebarHeader.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showHomeView();
      }
    });
  }
});

// 다른 드롭다운 메뉴 접기 (현재 열리는 폴더 제외)
function collapseOtherFolders(excludeToggleId) {
  const folderToggleIds = [
    'apps-folder-toggle',
    'saveprompt-folder-toggle'
  ];

  folderToggleIds.forEach(toggleId => {
    if (toggleId === excludeToggleId) return; // 현재 열리는 폴더는 제외
    
    const folderToggle = document.getElementById(toggleId);
    if (folderToggle && folderToggle.getAttribute('aria-expanded') === 'true') {
      // 접혀있지 않으면 클릭하여 접기
      folderToggle.click();
    }
  });
}

// ==================== 환영 / 온보딩 오버레이 ====================
const HOME_ONBOARDING_DISMISSED_KEY = 'aispace_home_onboarding_dismissed';
const WORKSPACE_ONBOARDING_DISMISSED_KEY = 'aispace_workspace_onboarding_dismissed';
const WORKSPACE_WELCOME_KEY_PREFIX = 'aispace_workspace_welcome_';
const HOME_ONBOARDING_ANIM_MS = 300;
const WORKSPACE_ONBOARDING_ANIM_MS = 300;

let homeOnboardingCloseFallbackTimer = null;
let workspaceOnboardingCloseFallbackTimer = null;
/** 도움말 버튼으로 연 경우 닫을 때 localStorage에 '다시 안 보기' 저장하지 않음 */
let workspaceOnboardingDismissWithoutPersist = false;

function finalizeHideHomeOnboardingOverlay(overlay) {
  if (homeOnboardingCloseFallbackTimer) {
    clearTimeout(homeOnboardingCloseFallbackTimer);
    homeOnboardingCloseFallbackTimer = null;
  }
  overlay.classList.remove('home-onboarding-overlay--open', 'home-onboarding-overlay--closing');
  overlay.classList.add('home-onboarding-overlay--hidden');
  overlay.setAttribute('hidden', '');
}

function hideHomeOnboardingOverlayWithoutPersist() {
  const overlay = document.getElementById('home-onboarding-overlay');
  if (!overlay) return;
  finalizeHideHomeOnboardingOverlay(overlay);
}

function dismissHomeOnboardingOverlay() {
  const overlay = document.getElementById('home-onboarding-overlay');
  if (!overlay || overlay.classList.contains('home-onboarding-overlay--hidden')) return;
  if (overlay.classList.contains('home-onboarding-overlay--closing')) return;

  const content = overlay.querySelector('.home-onboarding-overlay__content');
  if (!content) {
    try {
      localStorage.setItem(HOME_ONBOARDING_DISMISSED_KEY, '1');
    } catch (_) {}
    finalizeHideHomeOnboardingOverlay(overlay);
    return;
  }

  overlay.classList.remove('home-onboarding-overlay--open');
  overlay.classList.add('home-onboarding-overlay--closing');

  const finishDismiss = () => {
    if (overlay.classList.contains('home-onboarding-overlay--hidden')) return;
    try {
      localStorage.setItem(HOME_ONBOARDING_DISMISSED_KEY, '1');
    } catch (_) {}
    finalizeHideHomeOnboardingOverlay(overlay);
  };

  const onTransitionEnd = (e) => {
    if (e.target !== content) return;
    if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
    content.removeEventListener('transitionend', onTransitionEnd);
    finishDismiss();
  };

  content.addEventListener('transitionend', onTransitionEnd);
  homeOnboardingCloseFallbackTimer = setTimeout(() => {
    content.removeEventListener('transitionend', onTransitionEnd);
    finishDismiss();
  }, HOME_ONBOARDING_ANIM_MS + 80);
}

function isHomeOnboardingPreviewRequested() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('onboarding') === '1') return true;
    if (location.hash === '#preview-onboarding') return true;
  } catch (_) {}
  return false;
}

function maybeShowHomeOnboardingOverlay(forcePreview = false) {
  const preview = forcePreview || isHomeOnboardingPreviewRequested();
  if (!preview && localStorage.getItem(HOME_ONBOARDING_DISMISSED_KEY)) return;
  const homeView = document.getElementById('home-view');
  if (!homeView?.classList.contains('view-visible')) return;
  const overlay = document.getElementById('home-onboarding-overlay');
  if (!overlay || overlay.classList.contains('home-onboarding-overlay--closing')) return;

  if (homeOnboardingCloseFallbackTimer) {
    clearTimeout(homeOnboardingCloseFallbackTimer);
    homeOnboardingCloseFallbackTimer = null;
  }

  overlay.classList.remove(
    'home-onboarding-overlay--hidden',
    'home-onboarding-overlay--closing',
    'home-onboarding-overlay--open'
  );
  overlay.removeAttribute('hidden');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (overlay.classList.contains('home-onboarding-overlay--hidden')) return;
      overlay.classList.add('home-onboarding-overlay--open');
    });
  });
}

function isHomeOnboardingOverlayActive() {
  const overlay = document.getElementById('home-onboarding-overlay');
  if (!overlay || overlay.hasAttribute('hidden')) return false;
  if (overlay.classList.contains('home-onboarding-overlay--hidden')) return false;
  if (overlay.classList.contains('home-onboarding-overlay--closing')) return false;
  return true;
}

function initHomeOnboardingOverlay() {
  const overlay = document.getElementById('home-onboarding-overlay');
  if (!overlay) return;

  function onKey(e) {
    if (e.repeat) return;
    if (!isHomeOnboardingOverlayActive()) return;
    dismissHomeOnboardingOverlay();
  }

  function onOverlayClick() {
    if (!isHomeOnboardingOverlayActive()) return;
    dismissHomeOnboardingOverlay();
  }

  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', onOverlayClick);
}

window.LAYV_previewHomeOnboarding = async function LAYV_previewHomeOnboarding() {
  try {
    localStorage.removeItem(HOME_ONBOARDING_DISMISSED_KEY);
  } catch (_) {}
  await showHomeView();
  maybeShowHomeOnboardingOverlay(true);
};

function finalizeHideWorkspaceOnboardingOverlay(overlay) {
  if (workspaceOnboardingCloseFallbackTimer) {
    clearTimeout(workspaceOnboardingCloseFallbackTimer);
    workspaceOnboardingCloseFallbackTimer = null;
  }
  workspaceOnboardingDismissWithoutPersist = false;
  overlay.classList.remove('workspace-onboarding-overlay--open', 'workspace-onboarding-overlay--closing');
  overlay.classList.add('workspace-onboarding-overlay--hidden');
  overlay.setAttribute('hidden', '');
}

function persistWorkspaceOnboardingDismissedIfNeeded() {
  if (workspaceOnboardingDismissWithoutPersist) return;
  try {
    localStorage.setItem(WORKSPACE_ONBOARDING_DISMISSED_KEY, '1');
  } catch (_) {}
}

function hideWorkspaceOnboardingOverlayWithoutPersist() {
  const overlay = document.getElementById('workspace-onboarding-overlay');
  if (!overlay) return;
  finalizeHideWorkspaceOnboardingOverlay(overlay);
}

function dismissWorkspaceOnboardingOverlay() {
  const overlay = document.getElementById('workspace-onboarding-overlay');
  if (!overlay || overlay.classList.contains('workspace-onboarding-overlay--hidden')) return;
  if (overlay.classList.contains('workspace-onboarding-overlay--closing')) return;

  const content = overlay.querySelector('.workspace-onboarding-overlay__content');
  if (!content) {
    persistWorkspaceOnboardingDismissedIfNeeded();
    finalizeHideWorkspaceOnboardingOverlay(overlay);
    return;
  }

  overlay.classList.remove('workspace-onboarding-overlay--open');
  overlay.classList.add('workspace-onboarding-overlay--closing');

  const finishDismiss = () => {
    if (overlay.classList.contains('workspace-onboarding-overlay--hidden')) return;
    persistWorkspaceOnboardingDismissedIfNeeded();
    finalizeHideWorkspaceOnboardingOverlay(overlay);
  };

  const onTransitionEnd = (e) => {
    if (e.target !== content) return;
    if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
    content.removeEventListener('transitionend', onTransitionEnd);
    finishDismiss();
  };

  content.addEventListener('transitionend', onTransitionEnd);
  workspaceOnboardingCloseFallbackTimer = setTimeout(() => {
    content.removeEventListener('transitionend', onTransitionEnd);
    finishDismiss();
  }, WORKSPACE_ONBOARDING_ANIM_MS + 80);
}

function isWorkspaceOnboardingPreviewRequested() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('onboarding') === 'workspace') return true;
    if (location.hash === '#preview-workspace-onboarding') return true;
  } catch (_) {}
  return false;
}

function maybeShowWorkspaceOnboardingOverlay(forcePreview = false) {
  const preview = forcePreview || isWorkspaceOnboardingPreviewRequested();
  if (!preview && localStorage.getItem(WORKSPACE_ONBOARDING_DISMISSED_KEY)) return;
  const workspaceView = document.getElementById('workspace-view');
  if (!workspaceView?.classList.contains('view-visible')) return;
  const overlay = document.getElementById('workspace-onboarding-overlay');
  if (!overlay || overlay.classList.contains('workspace-onboarding-overlay--closing')) return;

  if (workspaceOnboardingCloseFallbackTimer) {
    clearTimeout(workspaceOnboardingCloseFallbackTimer);
    workspaceOnboardingCloseFallbackTimer = null;
  }

  overlay.classList.remove(
    'workspace-onboarding-overlay--hidden',
    'workspace-onboarding-overlay--closing',
    'workspace-onboarding-overlay--open'
  );
  overlay.removeAttribute('hidden');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (overlay.classList.contains('workspace-onboarding-overlay--hidden')) return;
      overlay.classList.add('workspace-onboarding-overlay--open');
    });
  });
}

/** 워크스페이스 상단 도움말 — 이미 닫았어도 가이드를 다시 표시(닫을 때는 localStorage 미변경) */
function showWorkspaceOnboardingOverlayFromHelp() {
  const workspaceView = document.getElementById('workspace-view');
  if (!workspaceView?.classList.contains('view-visible')) return;
  workspaceOnboardingDismissWithoutPersist = true;
  maybeShowWorkspaceOnboardingOverlay(true);
}

function isWorkspaceOnboardingOverlayActive() {
  const overlay = document.getElementById('workspace-onboarding-overlay');
  if (!overlay || overlay.hasAttribute('hidden')) return false;
  if (overlay.classList.contains('workspace-onboarding-overlay--hidden')) return false;
  if (overlay.classList.contains('workspace-onboarding-overlay--closing')) return false;
  return true;
}

function initWorkspaceOnboardingOverlay() {
  const overlay = document.getElementById('workspace-onboarding-overlay');
  if (!overlay) return;

  function onKey(e) {
    if (e.repeat) return;
    if (!isWorkspaceOnboardingOverlayActive()) return;
    dismissWorkspaceOnboardingOverlay();
  }

  function onOverlayClick() {
    if (!isWorkspaceOnboardingOverlayActive()) return;
    dismissWorkspaceOnboardingOverlay();
  }

  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', onOverlayClick);
}

window.LAYV_previewWorkspaceOnboarding = async function LAYV_previewWorkspaceOnboarding(projectId) {
  try {
    localStorage.removeItem(WORKSPACE_ONBOARDING_DISMISSED_KEY);
  } catch (_) {}
  const id = projectId || projectsData[0]?.id;
  if (!id) {
    const project = createProject();
    showWorkspaceView(project.id);
  } else {
    showWorkspaceView(id);
  }
  maybeShowWorkspaceOnboardingOverlay(true);
};

function resetWorkspaceWelcomeOverlayWithoutPersist() {
  const root = document.getElementById('workspace-welcome-overlay');
  if (!root) return;
  root.style.display = 'none';
}

function initWorkspaceWelcomeOverlay() {
  const overlay = document.getElementById('workspace-welcome-overlay');
  if (!overlay) return;

  const closeBtn = document.getElementById('workspace-welcome-close');

  function dismiss(projectId, save) {
    overlay.style.display = 'none';
    if (save && projectId) {
      localStorage.setItem(WORKSPACE_WELCOME_KEY_PREFIX + projectId, '1');
    }
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      const pid = overlay.dataset.projectId;
      dismiss(pid, true);
    }
  }

  closeBtn?.addEventListener('click', () => {
    const pid = overlay.dataset.projectId;
    dismiss(pid, true);
  });

  document.addEventListener('keydown', onKey);
}

function showWorkspaceWelcomeOverlay(projectId) {
  const overlay = document.getElementById('workspace-welcome-overlay');
  if (!overlay) return;
  overlay.dataset.projectId = projectId;
  overlay.style.display = 'flex';
}

// ==================== 통합 저장 관리 (이미지 + 프롬프트) ====================
/** 워크스페이스 Save prompt 사이드바 — 펼쳐진 폴더 id (폴더별 독립 토글) */
let expandedWorkspaceSavedFolderIds = new Set();
let draggedWorkspaceSavedFolderId = null;
let workspaceSavedFolderDragDidMove = false;
let draggedWorkspaceSavedCardItemId = null;
let draggedWorkspaceSavedCardSourceFolderId = null;
let workspaceSavedCardDragDidMove = false;
let workspaceSavedCardSuppressClick = false;
let workspaceSavedCardPointerStart = null;
let workspaceSavedCardPointerExceededThreshold = false;
let workspaceSavedCardPointerTrackingActive = false;
let workspaceSavedCardDropHighlightKey = null;
let workspaceSavedCardDragGhostEl = null;
let workspaceSavedCardDragLastClientY = 0;
let workspaceSavedCardAutoScrollActive = false;
let workspaceSavedCardPointerDragActive = false;
let workspaceSavedCardPointerDragCard = null;
let workspaceSavedCardDragPointerOffset = { x: 0, y: 0 };
const WORKSPACE_SAVED_CARD_DRAG_CLICK_THRESHOLD = 5;
const WORKSPACE_SAVED_CARD_AUTOSCROLL_EDGE_PX = 48;
const WORKSPACE_SAVED_CARD_AUTOSCROLL_STEP_PX = 12;

function workspaceSavedCardPointerDidExceedThreshold(clientX, clientY) {
  if (!workspaceSavedCardPointerStart) return false;
  const dx = Math.abs(clientX - workspaceSavedCardPointerStart.x);
  const dy = Math.abs(clientY - workspaceSavedCardPointerStart.y);
  return dx > WORKSPACE_SAVED_CARD_DRAG_CLICK_THRESHOLD || dy > WORKSPACE_SAVED_CARD_DRAG_CLICK_THRESHOLD;
}

function isPointerInWorkspaceSavedCardScrollArea(clientX, clientY) {
  const scroller = getWorkspaceSavedCardScrollContainer();
  if (!scroller) return true;
  const r = scroller.getBoundingClientRect();
  return (
    clientX >= r.left &&
    clientX <= r.right &&
    clientY >= r.top &&
    clientY <= r.bottom
  );
}

function positionWorkspaceSavedCardDragGhost(clientX, clientY) {
  const ghost = workspaceSavedCardDragGhostEl;
  if (!ghost) return;
  ghost.style.left = `${clientX - workspaceSavedCardDragPointerOffset.x}px`;
  ghost.style.top = `${clientY - workspaceSavedCardDragPointerOffset.y}px`;
}

function beginWorkspaceSavedCardPointerDrag(card, e) {
  if (workspaceSavedCardPointerDragActive || !card?.dataset.itemId) return;

  workspaceSavedCardPointerDragActive = true;
  workspaceSavedCardPointerDragCard = card;
  draggedWorkspaceSavedCardItemId = card.dataset.itemId;
  draggedWorkspaceSavedCardSourceFolderId = card.dataset.folderId;
  workspaceSavedCardDragDidMove = false;
  workspaceSavedCardSuppressClick = true;

  const rect = card.getBoundingClientRect();
  workspaceSavedCardDragPointerOffset = {
    x: Math.min(Math.max(e.clientX - rect.left, 8), Math.max(rect.width - 8, 16)),
    y: Math.min(Math.max(e.clientY - rect.top, 8), Math.max(rect.height - 8, 16)),
  };

  card.classList.add('sidebar__saved-card--dragging');
  const ghost = card.cloneNode(true);
  ghost.classList.add('saveprompt-card--drag-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.position = 'fixed';
  ghost.style.zIndex = '10000';
  ghost.style.margin = '0';
  ghost.style.width = `${rect.width}px`;
  ghost.style.pointerEvents = 'none';
  document.body.appendChild(ghost);
  workspaceSavedCardDragGhostEl = ghost;
  positionWorkspaceSavedCardDragGhost(e.clientX, e.clientY);

  setWorkspaceSavedCardDraggingUi(true);
  document.body.classList.add('is-workspace-saved-card-pointer-dragging');
  setCustomDragCursorActive(true);
  startWorkspaceSavedCardAutoScroll();
  updateWorkspaceSavedCardPointerDrag(e);
}

function updateWorkspaceSavedCardPointerDrag(e) {
  if (!workspaceSavedCardPointerDragActive) return;
  workspaceSavedCardDragLastClientY = e.clientY;
  positionWorkspaceSavedCardDragGhost(e.clientX, e.clientY);
  if (!isPointerInWorkspaceSavedCardScrollArea(e.clientX, e.clientY)) {
    clearWorkspaceSavedCardDragHighlights();
    return;
  }
  applyWorkspaceSavedCardDropHighlight(
    resolveWorkspaceSavedCardDropTargetAt(e.clientX, e.clientY)
  );
}

function finishWorkspaceSavedCardPointerDrag(e) {
  if (!workspaceSavedCardPointerDragActive) return;

  let moved = false;
  if (isPointerInWorkspaceSavedCardScrollArea(e.clientX, e.clientY)) {
    const target = resolveWorkspaceSavedCardDropTargetAt(e.clientX, e.clientY);
    if (target?.folderId) {
      moved = moveWorkspaceSavedCardItemFromDropTarget(
        draggedWorkspaceSavedCardItemId,
        draggedWorkspaceSavedCardSourceFolderId,
        target
      );
    }
  }
  if (moved) workspaceSavedCardDragDidMove = true;
  endWorkspaceSavedCardPointerDragSession();
}

function endWorkspaceSavedCardPointerDragSession() {
  workspaceSavedCardPointerDragCard?.classList.remove('sidebar__saved-card--dragging');
  document
    .querySelectorAll('#workspace-saved-folders-root .sidebar__saved-card--dragging')
    .forEach((el) => el.classList.remove('sidebar__saved-card--dragging'));
  workspaceSavedCardPointerDragCard = null;
  if (workspaceSavedCardDragGhostEl) {
    workspaceSavedCardDragGhostEl.remove();
    workspaceSavedCardDragGhostEl = null;
  }
  stopWorkspaceSavedCardAutoScroll();
  setWorkspaceSavedCardDraggingUi(false);
  document.body.classList.remove('is-workspace-saved-card-pointer-dragging');
  setCustomDragCursorActive(false);
  draggedWorkspaceSavedCardItemId = null;
  draggedWorkspaceSavedCardSourceFolderId = null;
  workspaceSavedCardPointerDragActive = false;
  clearWorkspaceSavedCardDragHighlights();
}

function onWorkspaceSavedCardPointerMove(e) {
  if (!workspaceSavedCardPointerStart || e.pointerId !== workspaceSavedCardPointerStart.pointerId) return;

  if (workspaceSavedCardPointerDragActive) {
    e.preventDefault();
    updateWorkspaceSavedCardPointerDrag(e);
    return;
  }

  if (workspaceSavedCardPointerDidExceedThreshold(e.clientX, e.clientY)) {
    workspaceSavedCardPointerExceededThreshold = true;
    const card = workspaceSavedCardPointerStart.card;
    if (card?.isConnected) beginWorkspaceSavedCardPointerDrag(card, e);
  }
}

function detachWorkspaceSavedCardPointerTracking() {
  if (!workspaceSavedCardPointerTrackingActive) return;
  document.removeEventListener('pointermove', onWorkspaceSavedCardPointerMove, true);
  document.removeEventListener('pointerup', onWorkspaceSavedCardPointerUp, true);
  document.removeEventListener('pointercancel', onWorkspaceSavedCardPointerUp, true);
  workspaceSavedCardPointerTrackingActive = false;
}

function onWorkspaceSavedCardPointerUp(e) {
  if (!workspaceSavedCardPointerStart || e.pointerId !== workspaceSavedCardPointerStart.pointerId) return;

  const card = workspaceSavedCardPointerStart.card;
  if (workspaceSavedCardPointerDragActive) {
    e.preventDefault();
    finishWorkspaceSavedCardPointerDrag(e);
  }

  try {
    card?.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }

  detachWorkspaceSavedCardPointerTracking();
  const hadDrag = workspaceSavedCardDragDidMove || workspaceSavedCardPointerExceededThreshold;
  workspaceSavedCardPointerStart = null;
  if (hadDrag) {
    workspaceSavedCardSuppressClick = true;
    setTimeout(() => {
      workspaceSavedCardSuppressClick = false;
      workspaceSavedCardDragDidMove = false;
      workspaceSavedCardPointerExceededThreshold = false;
    }, 100);
  } else {
    workspaceSavedCardSuppressClick = false;
    workspaceSavedCardPointerExceededThreshold = false;
  }
}

function attachWorkspaceSavedCardPointerTracking() {
  if (workspaceSavedCardPointerTrackingActive) return;
  workspaceSavedCardPointerTrackingActive = true;
  document.addEventListener('pointermove', onWorkspaceSavedCardPointerMove, true);
  document.addEventListener('pointerup', onWorkspaceSavedCardPointerUp, true);
  document.addEventListener('pointercancel', onWorkspaceSavedCardPointerUp, true);
}

let savedItemsData = {
  folders: [] // [{ id, name, items: [{ id, name, imageDataUrl, prompt, createdAt, appId?, openAppIds? }] }]
};

/** 현재 메모리의 savedItemsData를 해당 프로젝트 객체에 저장 */
function persistSavedItemsToProject(projectId) {
  const project = projectsData.find(p => p.id === projectId);
  if (!project) return;
  if (!project.savedPromptLibrary) project.savedPromptLibrary = { folders: [] };
  project.savedPromptLibrary = JSON.parse(JSON.stringify(savedItemsData));
  saveProjects();
}

/** 해당 프로젝트의 저장 라이브러리를 savedItemsData(메모리)로 복사 */
function hydrateSavedItemsFromProject(projectId) {
  const project = projectsData.find(p => p.id === projectId);
  if (project && project.savedPromptLibrary) {
    savedItemsData = JSON.parse(JSON.stringify(project.savedPromptLibrary));
  } else {
    savedItemsData = { folders: [] };
  }
}

// 통합 데이터 로드 (기존 데이터 마이그레이션 포함)
function loadSavedItems() {
  try {
    const stored = localStorage.getItem(SAVED_ITEMS_STORAGE_KEY);
    if (stored) {
      savedItemsData = JSON.parse(stored);
    } else {
      // 기존 데이터 마이그레이션
      const promptsStored = localStorage.getItem('aispace_prompts');
      const imagesStored = localStorage.getItem('aispace_images');
      
      savedItemsData = { folders: [] };
      
      // 이미지 데이터 마이그레이션 (이미지에 프롬프트가 포함되어 있음)
      if (imagesStored) {
        try {
          const imagesData = JSON.parse(imagesStored);
          imagesData.folders.forEach(folder => {
            const newFolder = {
              id: folder.id,
              name: folder.name,
              items: folder.images.map(img => ({
                id: img.id,
                name: img.name || 'Untitled',
                imageDataUrl: img.dataUrl,
                prompt: img.prompt || '',
                createdAt: img.createdAt
              }))
            };
            savedItemsData.folders.push(newFolder);
          });
        } catch (e) {
          console.warn('이미지 데이터 마이그레이션 실패:', e);
        }
      }
      
      // 프롬프트 데이터 마이그레이션 (이미지 없는 프롬프트)
      if (promptsStored) {
        try {
          const promptsData = JSON.parse(promptsStored);
          promptsData.folders.forEach(folder => {
            let targetFolder = savedItemsData.folders.find(f => f.name === folder.name);
            if (!targetFolder) {
              targetFolder = {
                id: `folder-${Date.now()}-${Math.random()}`,
                name: folder.name,
                items: []
              };
              savedItemsData.folders.push(targetFolder);
            }
            
            folder.prompts.forEach(prompt => {
              targetFolder.items.push({
                id: prompt.id,
                name: prompt.name || 'Untitled',
                imageDataUrl: '',
                prompt: prompt.content || '',
                createdAt: prompt.createdAt
              });
            });
          });
        } catch (e) {
          console.warn('프롬프트 데이터 마이그레이션 실패:', e);
        }
      }
      
      // 마이그레이션 후 저장
      if (savedItemsData.folders.length > 0) {
        saveSavedItems();
      }
    }
  } catch (error) {
    console.warn('저장된 항목 불러오기 실패:', error);
    savedItemsData = { folders: [] };
  }
}

// 통합 데이터 저장
function saveSavedItems(projectIdOverride) {
  const targetId = projectIdOverride || activeProjectId;
  if (targetId) persistSavedItemsToProject(targetId);
}

function restoreSavedItemsToActiveWorkspace() {
  if (activeProjectId) hydrateSavedItemsFromProject(activeProjectId);
  else savedItemsData = { folders: [] };
}

// 통합 저장 관리 초기화 함수
function initSavedItemsManagement() {
  initWorkspaceSavedFolders();
  renderSavedItems();
  initUnifiedSaveModal();
  initSavepromptForm();
}

function initSavepromptForm() {
  const form = document.getElementById('saveprompt-form');
  const thumb = document.getElementById('saveprompt-thumb');
  const fileInput = document.getElementById('saveprompt-file');
  const titleInput = document.getElementById('saveprompt-title');
  const promptInput = document.getElementById('saveprompt-prompt');
  const submitBtn = document.getElementById('saveprompt-submit');

  if (!thumb || !fileInput || !submitBtn) return;

  let pendingImageDataUrl = '';

  function updateSavepromptButtonState() {
    const hasTitle = titleInput && titleInput.value.trim() !== '';
    const hasPrompt = promptInput && promptInput.value.trim() !== '';
    const hasImage = thumb && thumb.classList.contains('saveprompt-form__thumb--has-image');
    const filled = hasTitle || hasPrompt || hasImage;
    if (form) form.classList.toggle('saveprompt-form--filled', !!filled);
  }

  if (titleInput) titleInput.addEventListener('input', updateSavepromptButtonState);
  if (promptInput) promptInput.addEventListener('input', updateSavepromptButtonState);

  thumb.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      pendingImageDataUrl = ev.target.result;
      thumb.classList.add('saveprompt-form__thumb--has-image');
      const existing = thumb.querySelector('.saveprompt-form__thumb-preview');
      if (existing) existing.remove();
      const preview = document.createElement('img');
      preview.src = pendingImageDataUrl;
      preview.className = 'saveprompt-form__thumb-preview';
      thumb.appendChild(preview);
      thumb.querySelector('.saveprompt-form__thumb-icon').style.display = 'none';
      updateSavepromptButtonState();
    };
    reader.readAsDataURL(file);
  });

  submitBtn.addEventListener('click', () => {
    const title = titleInput.value.trim() || 'Untitled';
    const prompt = promptInput.value.trim();
    if (!prompt && !pendingImageDataUrl) return;

    let folder = savedItemsData.folders[0];
    if (!folder) {
      folder = {
        id: `folder-${Date.now()}`,
        name: DEFAULT_WORKSPACE_FOLDER_NAME,
        items: []
      };
      savedItemsData.folders.push(folder);
    }

    const images = pendingImageDataUrl ? [pendingImageDataUrl] : [];
    const newItem = {
      id: `item-${Date.now()}`,
      name: title,
      images,
      imageDataUrl: pendingImageDataUrl || '',
      prompt,
      createdAt: new Date().toISOString()
    };
    attachSourceAppIdToSavedItem(newItem);
    folder.items.push(newItem);

    saveSavedItems();
    renderSavedItems();

    titleInput.value = '';
    promptInput.value = '';
    pendingImageDataUrl = '';
    fileInput.value = '';
    thumb.classList.remove('saveprompt-form__thumb--has-image');
    const preview = thumb.querySelector('.saveprompt-form__thumb-preview');
    if (preview) preview.remove();
    thumb.querySelector('.saveprompt-form__thumb-icon').style.display = '';

    updateSavepromptButtonState();
    showToast('프롬프트가 저장되었습니다.');
  });
}

// ========== 사이드바 저장 항목 렌더링 (Save prompt 폼 아래 폴더 블록) ==========
function renderSavedItems() {
  const root = document.getElementById('workspace-saved-folders-root');
  if (!root) return;

  const folders = savedItemsData.folders || [];
  sanitizeExpandedWorkspaceSavedFolders(folders.map(f => f.id));

  root.innerHTML = '';

  if (folders.length === 0) {
    root.appendChild(createWorkspaceSavedFolderEmptyRow());
    syncPromptCollectionGridIfActive();
    return;
  }

  folders.forEach((folder, idx) => {
    root.appendChild(createWorkspaceSavedFolderBlock(folder, idx));
  });

  syncPromptCollectionGridIfActive();
}

/** 워크스페이스 저장 폴더: 홈 사이드바와 동일한 이벤트 위임 */
function initWorkspaceSavedFolders() {
  const root = document.getElementById('workspace-saved-folders-root');
  if (!root || root.dataset.bound === '1') return;
  root.dataset.bound = '1';
  let workspaceFolderRowClickTimer = null;

  root.addEventListener('mousedown', (e) => {
    if (e.target.closest('#workspace-add-folder-btn')) {
      e.stopPropagation();
    }
  });

  root.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('#workspace-saved-folders-root .saveprompt-card');
    if (!card || e.button !== 0) return;
    workspaceSavedCardPointerStart = {
      x: e.clientX,
      y: e.clientY,
      card,
      pointerId: e.pointerId,
    };
    workspaceSavedCardPointerExceededThreshold = false;
    workspaceSavedCardSuppressClick = false;
    try {
      card.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    attachWorkspaceSavedCardPointerTracking();
  });

  root.addEventListener('click', (e) => {
    if (e.target.closest('#workspace-add-folder-btn')) {
      e.stopPropagation();
      e.preventDefault();
      void addWorkspaceSavedFolder();
      return;
    }
    const menuBtn = e.target.closest('.js-workspace-saved-folder-menu');
    if (menuBtn) {
      e.stopPropagation();
      e.preventDefault();
      if (workspaceSavedFolderDragDidMove) return;
      const header = menuBtn.closest('.js-workspace-saved-folder-header');
      const folderId = header?.dataset.folderId;
      const nameBtn = header?.querySelector('.js-workspace-saved-folder-rename');
      if (folderId && nameBtn) showWorkspaceSavedFolderContextMenu(e, folderId, nameBtn, menuBtn);
      return;
    }
    const header = e.target.closest('.js-workspace-saved-folder-header');
    if (!header) return;
    if (workspaceSavedFolderDragDidMove) return;

    const folderId = header.dataset.folderId;
    if (!folderId) return;

    const onNameBtn = e.target.closest('.js-workspace-saved-folder-rename');
    if (onNameBtn) {
      clearTimeout(workspaceFolderRowClickTimer);
      workspaceFolderRowClickTimer = setTimeout(() => {
        workspaceFolderRowClickTimer = null;
        toggleWorkspaceSavedFolder(folderId);
      }, 280);
      return;
    }

    toggleWorkspaceSavedFolder(folderId);
  });

  root.addEventListener('dblclick', (e) => {
    const nameBtn = e.target.closest('.js-workspace-saved-folder-rename');
    if (!nameBtn) return;
    clearTimeout(workspaceFolderRowClickTimer);
    workspaceFolderRowClickTimer = null;
    const folderId = nameBtn.dataset.folderId;
    if (folderId) startRenameWorkspaceSavedFolder(folderId, nameBtn);
  });

  root.addEventListener('dragstart', handleWorkspaceSavedFolderDragStart);
  root.addEventListener('dragend', handleWorkspaceSavedFolderDragEnd);
  root.addEventListener('dragover', handleWorkspaceSavedFolderDragOver);
  root.addEventListener('dragleave', handleWorkspaceSavedFolderDragLeave);
  root.addEventListener('drop', handleWorkspaceSavedFolderDrop);

}

/** 저장 프롬프트 폴더 없음: 홈 add-row와 동일 구조 */
function createWorkspaceSavedFolderEmptyRow() {
  const emptyRow = document.createElement('div');
  emptyRow.className = 'home-sidebar__folder-header home-sidebar__folder-header--add-row';
  emptyRow.id = 'workspace-folder-add-row';
  emptyRow.innerHTML = `
    <span class="sidebar__folder-arrow material-symbols-outlined" aria-hidden="true">arrow_forward_ios</span>
    <span class="sidebar__folder-icon" aria-hidden="true"><img src="assets/icons/folder.svg" alt="" style="width:14px;height:14px;"></span>
    <span class="sidebar__folder-name">${DEFAULT_WORKSPACE_FOLDER_NAME}</span>
    <button type="button" class="home-sidebar__folder-add" id="workspace-add-folder-btn" title="폴더 추가">
      <span class="home-sidebar__folder-add-icon" aria-hidden="true"><img src="assets/icons/plus.svg" alt=""></span>
    </button>
  `;
  return emptyRow;
}

/** 워크스페이스 저장 폴더 블록 — 홈 `.home-sidebar__folder-block`과 동일, 트리 안은 saveprompt 카드 */
function resetWorkspaceSavedFolderExpandState(folders) {
  const firstId = folders?.[0]?.id;
  expandedWorkspaceSavedFolderIds = firstId ? new Set([firstId]) : new Set();
}

function sanitizeExpandedWorkspaceSavedFolders(folderIds) {
  for (const id of expandedWorkspaceSavedFolderIds) {
    if (!folderIds.includes(id)) expandedWorkspaceSavedFolderIds.delete(id);
  }
}

function createWorkspaceSavedFolderBlock(folder, idx) {
  const isFirst = idx === 0;
  const isExpanded = expandedWorkspaceSavedFolderIds.has(folder.id);

  const block = document.createElement('div');
  block.className = 'home-sidebar__folder-block';
  block.dataset.folderId = folder.id;

  const header = document.createElement('div');
  header.className = 'home-sidebar__folder-header js-workspace-saved-folder-header' + (isExpanded ? ' home-sidebar__folder-header--active' : '');
  header.dataset.folderId = folder.id;
  header.innerHTML = `
    <span class="sidebar__folder-arrow material-symbols-outlined js-workspace-saved-folder-drag-handle" draggable="true" title="드래그하여 순서 변경" aria-hidden="true">arrow_forward_ios</span>
    <span class="home-sidebar__folder-icon" aria-hidden="true"><img src="assets/icons/folder.svg" alt="" style="width:14px;height:14px;"></span>
  `;

  const nameBtn = document.createElement('button');
  nameBtn.type = 'button';
  nameBtn.className = 'home-sidebar__folder-name js-workspace-saved-folder-rename';
  nameBtn.dataset.folderId = folder.id;
  nameBtn.title = '클릭: 폴더 펼침 · 더블클릭: 이름 변경';
  nameBtn.textContent = folder.name || DEFAULT_WORKSPACE_FOLDER_NAME;
  header.appendChild(nameBtn);

  if (isFirst) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'home-sidebar__folder-add';
    addBtn.id = 'workspace-add-folder-btn';
    addBtn.title = '폴더 추가';
    addBtn.innerHTML = `<span class="home-sidebar__folder-add-icon" aria-hidden="true"><img src="assets/icons/plus.svg" alt=""></span>`;
    header.appendChild(addBtn);
  } else {
    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'workspace-saved-folder-menu js-workspace-saved-folder-menu js-workspace-saved-folder-drag-source';
    menuBtn.draggable = true;
    menuBtn.title = '메뉴 · 드래그하여 순서 변경';
    menuBtn.innerHTML = '<span class="home-sidebar__folder-add-icon" aria-hidden="true"><span class="material-symbols-outlined">more_vert</span></span>';
    header.appendChild(menuBtn);
  }

  const treeWrap = document.createElement('div');
  treeWrap.className = 'home-sidebar__folder-tree' + (isExpanded ? '' : ' collapsed');
  treeWrap.dataset.folderId = folder.id;

  const itemsWrap = document.createElement('div');
  itemsWrap.className = 'saveprompt-saved-list';
  itemsWrap.id = `saveprompt-saved-list-${folder.id}`;
  itemsWrap.dataset.folderId = folder.id;

  (folder.items || []).forEach(item => {
    itemsWrap.appendChild(createSavedCardElement(item, folder.id));
  });
  treeWrap.appendChild(itemsWrap);

  block.appendChild(header);
  block.appendChild(treeWrap);
  return block;
}

// ==================== 워크스페이스 저장 프롬프트 폴더 DnD · 컨텍스트 메뉴 ====================

function clearWorkspaceSavedFolderDragHighlights() {
  document.querySelectorAll(
    '.home-sidebar__folder-block.workspace-saved-folder-drop--over, .js-workspace-saved-folder-header.workspace-saved-folder-header--drag-over'
  ).forEach(el => {
    el.classList.remove('workspace-saved-folder-drop--over', 'workspace-saved-folder-header--drag-over');
  });
}

function reorderWorkspaceSavedFolders(draggedFolderId, targetFolderId, insertAfter = false) {
  const folders = savedItemsData.folders;
  if (!folders?.length) return false;
  const fromIdx = folders.findIndex(f => f.id === draggedFolderId);
  const toIdx = folders.findIndex(f => f.id === targetFolderId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return false;

  const [moved] = folders.splice(fromIdx, 1);
  let insertIdx = toIdx;
  if (fromIdx < toIdx) insertIdx--;
  if (insertAfter) insertIdx++;
  folders.splice(insertIdx, 0, moved);
  saveSavedItems();
  renderSavedItems();
  return true;
}

function handleWorkspaceSavedFolderDragStart(event) {
  if (
    event.target.closest(
      '#workspace-add-folder-btn, .home-sidebar__folder-add, .js-workspace-saved-folder-rename'
    )
  ) {
    return;
  }

  const source = event.target.closest(
    '.js-workspace-saved-folder-drag-handle, .js-workspace-saved-folder-drag-source'
  );
  if (!source) return;

  const header = source.closest('.js-workspace-saved-folder-header');
  if (!header?.dataset.folderId) return;

  const block = header.closest('.home-sidebar__folder-block');
  if (!block) return;

  draggedWorkspaceSavedFolderId = header.dataset.folderId;
  workspaceSavedFolderDragDidMove = false;
  setCustomDragCursorActive(true);
  block.classList.add('workspace-saved-folder-block--dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedWorkspaceSavedFolderId);
  event.stopPropagation();
}

function handleWorkspaceSavedFolderDragEnd(event) {
  const block = event.target.closest('.home-sidebar__folder-block');
  if (block) block.classList.remove('workspace-saved-folder-block--dragging');
  setCustomDragCursorActive(false);
  draggedWorkspaceSavedFolderId = null;
  clearWorkspaceSavedFolderDragHighlights();
  setTimeout(() => { workspaceSavedFolderDragDidMove = false; }, 0);
}

function handleWorkspaceSavedFolderDragOver(event) {
  if (draggedWorkspaceSavedCardItemId) return;
  if (!draggedWorkspaceSavedFolderId) return;

  const dropBlock = event.target.closest('#workspace-saved-folders-root .home-sidebar__folder-block');
  if (!dropBlock?.dataset.folderId) return;
  if (dropBlock.dataset.folderId === draggedWorkspaceSavedFolderId) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  clearWorkspaceSavedFolderDragHighlights();

  const header = dropBlock.querySelector('.js-workspace-saved-folder-header');
  dropBlock.classList.add('workspace-saved-folder-drop--over');
  header?.classList.add('workspace-saved-folder-header--drag-over');
  dropBlock.dataset.dropInsertAfter = event.clientY >= dropBlock.getBoundingClientRect().top + dropBlock.offsetHeight / 2 ? '1' : '0';
}

function handleWorkspaceSavedFolderDragLeave(event) {
  const related = event.relatedTarget;
  const root = document.getElementById('workspace-saved-folders-root');
  if (related && root?.contains(related)) return;
  clearWorkspaceSavedFolderDragHighlights();
}

function handleWorkspaceSavedFolderDrop(event) {
  if (draggedWorkspaceSavedCardItemId) return;
  if (!draggedWorkspaceSavedFolderId) return;

  const dropBlock = event.target.closest('#workspace-saved-folders-root .home-sidebar__folder-block');
  if (!dropBlock?.dataset.folderId) return;

  event.preventDefault();
  event.stopPropagation();
  clearWorkspaceSavedFolderDragHighlights();

  const targetFolderId = dropBlock.dataset.folderId;
  if (!targetFolderId || targetFolderId === draggedWorkspaceSavedFolderId) {
    draggedWorkspaceSavedFolderId = null;
    return;
  }

  const insertAfter = dropBlock.dataset.dropInsertAfter === '1';
  const moved = reorderWorkspaceSavedFolders(draggedWorkspaceSavedFolderId, targetFolderId, insertAfter);
  if (moved) workspaceSavedFolderDragDidMove = true;
  draggedWorkspaceSavedFolderId = null;
}

// ==================== 워크스페이스 저장 프롬프트 카드 DnD ====================

function getWorkspaceSavedCardScrollContainer() {
  return document.querySelector('.sidebar__scroll-saved');
}

function startWorkspaceSavedCardAutoScroll() {
  if (workspaceSavedCardAutoScrollActive) return;
  workspaceSavedCardAutoScrollActive = true;
  const tick = () => {
    if (!workspaceSavedCardAutoScrollActive) return;
    const scroller = getWorkspaceSavedCardScrollContainer();
    if (scroller && draggedWorkspaceSavedCardItemId) {
      const rect = scroller.getBoundingClientRect();
      const y = workspaceSavedCardDragLastClientY;
      if (y < rect.top + WORKSPACE_SAVED_CARD_AUTOSCROLL_EDGE_PX) {
        scroller.scrollTop -= WORKSPACE_SAVED_CARD_AUTOSCROLL_STEP_PX;
      } else if (y > rect.bottom - WORKSPACE_SAVED_CARD_AUTOSCROLL_EDGE_PX) {
        scroller.scrollTop += WORKSPACE_SAVED_CARD_AUTOSCROLL_STEP_PX;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function stopWorkspaceSavedCardAutoScroll() {
  workspaceSavedCardAutoScrollActive = false;
}

function setWorkspaceSavedCardDraggingUi(active) {
  const root = document.getElementById('workspace-saved-folders-root');
  if (root) root.classList.toggle('is-saved-card-dragging', active);
}

function ensureWorkspaceSavedFolderVisibleForCardDrop(folderId) {
  if (!folderId) return;
  expandedWorkspaceSavedFolderIds.add(folderId);
  const root = document.getElementById('workspace-saved-folders-root');
  const block = root?.querySelector(
    `.home-sidebar__folder-block[data-folder-id="${CSS.escape(folderId)}"]`
  );
  if (!block) return;
  const tree = block.querySelector('.home-sidebar__folder-tree');
  const header = block.querySelector('.js-workspace-saved-folder-header');
  if (tree?.classList.contains('collapsed')) {
    tree.classList.remove('collapsed');
    header?.classList.add('home-sidebar__folder-header--active');
  }
}

function resolveWorkspaceSavedCardDropTargetAt(clientX, clientY) {
  const root = document.getElementById('workspace-saved-folders-root');
  if (!root) return null;

  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (!root.contains(el)) continue;

    const card = el.closest('.saveprompt-card');
    if (
      card?.dataset.itemId &&
      card.dataset.itemId !== draggedWorkspaceSavedCardItemId &&
      !card.classList.contains('sidebar__saved-card--dragging')
    ) {
      const rect = card.getBoundingClientRect();
      return {
        type: 'card',
        card,
        folderId: card.dataset.folderId,
        insertAfter: clientY >= rect.top + rect.height / 2,
      };
    }

    const header = el.closest('.js-workspace-saved-folder-header');
    if (header?.dataset.folderId) {
      return {
        type: 'header',
        folderId: header.dataset.folderId,
        header,
        block: header.closest('.home-sidebar__folder-block'),
      };
    }

    const list = el.closest('.saveprompt-saved-list');
    if (list?.dataset.folderId) {
      return {
        type: 'list',
        folderId: list.dataset.folderId,
        list,
        block: list.closest('.home-sidebar__folder-block'),
      };
    }

    const block = el.closest('.home-sidebar__folder-block');
    if (block?.dataset.folderId) {
      return {
        type: 'block',
        folderId: block.dataset.folderId,
        block,
      };
    }
  }

  return null;
}

function workspaceSavedCardDropTargetKey(target) {
  if (!target) return '';
  if (target.type === 'card') {
    return `card:${target.card.dataset.itemId}:${target.insertAfter ? 'after' : 'before'}`;
  }
  return `${target.type}:${target.folderId}`;
}

function clearWorkspaceSavedCardDragHighlights() {
  workspaceSavedCardDropHighlightKey = null;
  document.querySelectorAll(
    '#workspace-saved-folders-root .saveprompt-card--drop-before, #workspace-saved-folders-root .saveprompt-card--drop-after'
  ).forEach(el => {
    el.classList.remove('saveprompt-card--drop-before', 'saveprompt-card--drop-after');
  });
  document.querySelectorAll(
    '#workspace-saved-folders-root .home-sidebar__folder-block.workspace-saved-folder-drop--over, #workspace-saved-folders-root .js-workspace-saved-folder-header.workspace-saved-folder-header--drag-over, #workspace-saved-folders-root .saveprompt-saved-list.workspace-saved-card-list-drop--over'
  ).forEach(el => {
    el.classList.remove('workspace-saved-folder-drop--over', 'workspace-saved-folder-header--drag-over', 'workspace-saved-card-list-drop--over');
  });
}

function applyWorkspaceSavedCardDropHighlight(target) {
  if (!target) {
    if (workspaceSavedCardDropHighlightKey) clearWorkspaceSavedCardDragHighlights();
    return;
  }

  const key = workspaceSavedCardDropTargetKey(target);
  if (workspaceSavedCardDropHighlightKey === key) return;

  clearWorkspaceSavedCardDragHighlights();
  workspaceSavedCardDropHighlightKey = key;

  if (target.type === 'card') {
    target.card.classList.add(
      target.insertAfter ? 'saveprompt-card--drop-after' : 'saveprompt-card--drop-before'
    );
    return;
  }

  ensureWorkspaceSavedFolderVisibleForCardDrop(target.folderId);

  if (target.type === 'header') {
    target.header.classList.add('workspace-saved-folder-header--drag-over');
    target.block?.classList.add('workspace-saved-folder-drop--over');
    return;
  }

  if (target.type === 'list') {
    target.list.classList.add('workspace-saved-card-list-drop--over');
    target.block?.classList.add('workspace-saved-folder-drop--over');
    return;
  }

  if (target.type === 'block') {
    target.block.classList.add('workspace-saved-folder-drop--over');
    target.block
      .querySelector('.js-workspace-saved-folder-header')
      ?.classList.add('workspace-saved-folder-header--drag-over');
  }
}

function moveWorkspaceSavedCardItemFromDropTarget(draggedItemId, sourceFolderId, target) {
  if (!target?.folderId) return false;
  const options = { insertBeforeItemId: null, insertAfterItemId: null };
  if (target.type === 'card') {
    if (target.insertAfter) options.insertAfterItemId = target.card.dataset.itemId;
    else options.insertBeforeItemId = target.card.dataset.itemId;
  }
  return moveWorkspaceSavedCardItem(draggedItemId, sourceFolderId, target.folderId, options);
}

function moveWorkspaceSavedCardItem(draggedItemId, sourceFolderId, targetFolderId, options = {}) {
  const { insertBeforeItemId = null, insertAfterItemId = null, render = true } = options;
  const folders = savedItemsData.folders;
  if (!folders?.length || !draggedItemId || !sourceFolderId || !targetFolderId) return false;

  const sourceFolder = folders.find(f => f.id === sourceFolderId);
  const targetFolder = folders.find(f => f.id === targetFolderId);
  if (!sourceFolder?.items || !targetFolder) return false;
  if (!targetFolder.items) targetFolder.items = [];

  const fromIdx = sourceFolder.items.findIndex(i => i.id === draggedItemId);
  if (fromIdx < 0) return false;

  let insertIdx = targetFolder.items.length;
  if (insertBeforeItemId) {
    insertIdx = targetFolder.items.findIndex(i => i.id === insertBeforeItemId);
    if (insertIdx < 0) insertIdx = targetFolder.items.length;
  } else if (insertAfterItemId) {
    const afterIdx = targetFolder.items.findIndex(i => i.id === insertAfterItemId);
    insertIdx = afterIdx < 0 ? targetFolder.items.length : afterIdx + 1;
  }

  const sameFolder = sourceFolderId === targetFolderId;
  if (sameFolder && insertIdx > fromIdx) insertIdx--;

  if (sameFolder && insertIdx === fromIdx) return false;

  const [moved] = sourceFolder.items.splice(fromIdx, 1);
  targetFolder.items.splice(insertIdx, 0, moved);
  saveSavedItems();
  if (render) renderSavedItems();
  return true;
}

function showWorkspaceSavedFolderContextMenu(event, folderId, nameBtn, anchorEl) {
  event.preventDefault();
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'workspace__context-menu';

  const renameBtn = document.createElement('button');
  renameBtn.className = 'workspace__context-menu-item';
  renameBtn.innerHTML = `
    <span class="workspace__context-menu-icon" aria-hidden="true"><img src="assets/icons/write.svg" alt=""></span>
    <span>이름 변경</span>
  `;
  renameBtn.addEventListener('click', () => {
    closeContextMenu();
    startRenameWorkspaceSavedFolder(folderId, nameBtn);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'workspace__context-menu-item workspace__context-menu-item--danger';
  deleteBtn.innerHTML = `
    <span class="workspace__context-menu-icon" aria-hidden="true"><img src="assets/icons/trash.svg" alt=""></span>
    <span>삭제</span>
  `;
  deleteBtn.addEventListener('click', () => {
    closeContextMenu();
    void persistDeleteWorkspaceSavedFolder(folderId);
  });

  menu.appendChild(renameBtn);
  menu.appendChild(deleteBtn);
  document.body.appendChild(menu);
  contextMenuElement = menu;

  const rect = (anchorEl || event.target).getBoundingClientRect();
  menu.style.left = `${rect.right - 120}px`;
  menu.style.top = `${rect.bottom + 4}px`;

  requestAnimationFrame(() => {
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - menuRect.height - 10}px`;
    }
    menu.classList.add('visible');
  });
}

/** 워크스페이스 저장 폴더 헤더 클릭 → 펼침/접힘 (폴더별 독립, 홈과 동일 UI 클래스) */
function toggleWorkspaceSavedFolder(folderId) {
  if (expandedWorkspaceSavedFolderIds.has(folderId)) {
    expandedWorkspaceSavedFolderIds.delete(folderId);
  } else {
    expandedWorkspaceSavedFolderIds.add(folderId);
  }
  renderSavedItems();
}

/** 워크스페이스 저장 프롬프트 폴더 추가 */
async function addWorkspaceSavedFolder() {
  const name = await showPromptModal(
    'Enter a folder name',
    DEFAULT_WORKSPACE_FOLDER_NAME,
    { title: 'New folder', okText: 'Add', cancelText: 'Cancel' }
  );
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) { showToast('폴더 이름을 입력해 주세요.'); return; }
  const newFolder = {
    id: `sfolder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: trimmed,
    items: [],
  };
  if (!savedItemsData.folders) savedItemsData.folders = [];
  savedItemsData.folders.push(newFolder);
  expandedWorkspaceSavedFolderIds.add(newFolder.id);
  saveSavedItems();
  renderSavedItems();
  showToast('폴더가 추가되었습니다.');
}

/** 워크스페이스 저장 폴더 이름 인라인 변경 (홈과 동일: 이름 변경 중 휴지통으로 삭제) */
function startRenameWorkspaceSavedFolder(folderId, nameBtn) {
  const folder = savedItemsData.folders.find(f => f.id === folderId);
  if (!folder || !nameBtn) return;

  const oldName = folder.name || DEFAULT_WORKSPACE_FOLDER_NAME;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'home-project-folder-rename-input';
  input.value = oldName;
  nameBtn.replaceWith(input);
  input.focus();
  input.select();

  const header = input.closest('.js-workspace-saved-folder-header');
  const existingAddBtn = header?.querySelector('.home-sidebar__folder-add');
  const folderMenuBtn = header?.querySelector('.js-workspace-saved-folder-menu');
  if (folderMenuBtn) folderMenuBtn.hidden = true;
  let trashBtn = null;
  const ac = new AbortController();

  function insertTrash() {
    trashBtn = document.createElement('button');
    trashBtn.type = 'button';
    trashBtn.className = 'home-sidebar__folder-add folder-rename-delete-btn';
    trashBtn.title = '폴더 삭제';
    trashBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:15px;color:#e05;">delete</span>`;
    if (existingAddBtn) {
      existingAddBtn.replaceWith(trashBtn);
    } else if (header) {
      header.appendChild(trashBtn);
    }
    trashBtn.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ac.abort();
      void persistDeleteWorkspaceSavedFolder(folderId);
    }, { signal: ac.signal });
  }
  insertTrash();

  let finished = false;
  function commit() {
    if (finished) return;
    finished = true;
    ac.abort();
    const val = input.value.trim();
    if (!val) { showToast('폴더 이름을 입력해 주세요.'); renderSavedItems(); return; }
    folder.name = val;
    saveSavedItems();
    renderSavedItems();
  }
  function cancel() {
    if (finished) return;
    finished = true;
    ac.abort();
    renderSavedItems();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => { setTimeout(commit, 120); });
}

/** 워크스페이스 저장 프롬프트 폴더 삭제 */
async function persistDeleteWorkspaceSavedFolder(folderId) {
  const folder = savedItemsData.folders.find(f => f.id === folderId);
  if (!folder) return;
  const itemCount = (folder.items || []).length;
  const msg = itemCount > 0
    ? `This folder and ${itemCount} saved prompt(s) inside will be deleted. This cannot be undone.`
    : 'This folder will be deleted. This cannot be undone.';
  const ok = await showConfirmModal(msg, { title: 'Delete folder', okText: 'Delete', cancelText: 'Cancel' });
  if (!ok) { renderSavedItems(); return; }
  savedItemsData.folders = savedItemsData.folders.filter(f => f.id !== folderId);
  expandedWorkspaceSavedFolderIds.delete(folderId);
  saveSavedItems();
  renderSavedItems();
  showToast('폴더가 삭제되었습니다.');
}

function syncPromptCollectionGridIfActive() {
  const homeView = document.getElementById('home-view');
  if (homeView?.classList.contains('view-visible') && getActiveHomeTab() === 'collection') {
    renderPromptCollectionCards();
  }
}

// 저장된 항목의 이미지 배열 (다중 이미지 + 구 호환)
function getItemImages(item) {
  if (!item) return [];
  if (Array.isArray(item.images) && item.images.length > 0) return item.images;
  if (item.imageDataUrl) return [item.imageDataUrl];
  return [];
}

/** 저장 항목에 images / imageDataUrl 동기화 (카드 썸네일·구 데이터 호환) */
function applyImagesToSavedItem(item, images) {
  if (!item) return;
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  item.images = list;
  if (list.length > 0) {
    item.imageDataUrl = list[0];
  } else {
    delete item.imageDataUrl;
  }
}

// 저장된 항목 카드 생성 (Figma: 썸네일들 + 제목 + 설명)
function openWorkspaceSavedCardContextMenu(menuBtn, item, folderId) {
  closeCardContextMenu();
  const menu = document.getElementById('saved-card-context-menu') || createSavedCardContextMenu();
  const rect = menuBtn.getBoundingClientRect();
  menu.style.left = `${rect.right - 120}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  menu.dataset.itemId = item.id;
  menu.dataset.folderId = folderId;
  menu.dataset.open = '1';
  menu.style.display = 'block';
  _cardMenuCloseHandler = () => {
    closeCardContextMenu();
  };
  setTimeout(() => {
    document.addEventListener('click', _cardMenuCloseHandler);
  }, 0);
}

function createSavedCardElement(item, folderId) {
  const card = document.createElement('div');
  card.className = 'saveprompt-card sidebar__saved-card js-workspace-saved-card-drag-source';
  card.dataset.itemId = item.id;
  card.dataset.folderId = folderId;

  const images = getItemImages(item);
  if (images.length > 0) {
    const imagesRow = document.createElement('div');
    imagesRow.className = 'saveprompt-card__thumbs sidebar__saved-card-images';
    images.forEach((dataUrl, i) => {
      if (i >= 4) return;
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = item.name || '';
      img.draggable = false;
      img.onerror = () => img.remove();
      imagesRow.appendChild(img);
    });
    card.appendChild(imagesRow);
  }

  // 제목
  const title = document.createElement('div');
  title.className = 'saveprompt-card__title sidebar__saved-card-title';
  title.textContent = item.name || 'Untitled';
  card.appendChild(title);

  // 프롬프트 설명
  if (item.prompt) {
    const prompt = document.createElement('div');
    prompt.className = 'saveprompt-card__body sidebar__saved-card-prompt';
    prompt.textContent = item.prompt;
    card.appendChild(prompt);
  }

  // 더보기(⋮) 버튼 → 편집/삭제 메뉴 · 드래그 핸들(카드와 동일 DnD)
  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'saveprompt-card__menu sidebar__saved-card-menu js-workspace-saved-card-drag-source';
  menuBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">more_vert</span>';
  menuBtn.title = '메뉴 · 드래그하여 이동';

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (
      workspaceSavedCardDragDidMove ||
      workspaceSavedCardPointerExceededThreshold ||
      workspaceSavedCardSuppressClick
    ) return;
    openWorkspaceSavedCardContextMenu(menuBtn, item, folderId);
  });

  card.appendChild(menuBtn);

  // 카드 클릭 → 보기/수정 모달
  card.addEventListener('click', (e) => {
    if (e.target.closest('.sidebar__saved-card-menu')) return;
    if (
      workspaceSavedCardDragDidMove ||
      workspaceSavedCardPointerExceededThreshold ||
      workspaceSavedCardSuppressClick
    ) return;
    openSavedItemModal(item, folderId);
  });

  return card;
}

// 카드 컨텍스트 메뉴 (편집/삭제) 닫기
let _cardMenuCloseHandler = null;

function closeCardContextMenu() {
  const menu = document.getElementById('saved-card-context-menu');
  if (menu) {
    menu.style.display = 'none';
    menu.removeAttribute('data-open');
  }
  if (_cardMenuCloseHandler) {
    document.removeEventListener('click', _cardMenuCloseHandler);
    _cardMenuCloseHandler = null;
  }
}

function createSavedCardContextMenu() {
  let menu = document.getElementById('saved-card-context-menu');
  if (menu) return menu;
  menu = document.createElement('div');
  menu.id = 'saved-card-context-menu';
  menu.className = 'saved-card-context-menu';
  menu.setAttribute('role', 'menu');
  menu.style.display = 'none';
  menu.innerHTML = `
    <button type="button" class="saved-card-context-menu__item" data-action="copy" role="menuitem">
      <span class="material-symbols-outlined" style="font-size:16px;">content_copy</span>
      <span>복사</span>
    </button>
    <button type="button" class="saved-card-context-menu__item" data-action="edit" role="menuitem">
      <img src="assets/icons/write.svg" alt="편집" style="width:16px;height:16px;">
      <span>편집</span>
    </button>
    <button type="button" class="saved-card-context-menu__item saved-card-context-menu__item--danger" data-action="delete" role="menuitem">
      <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
      <span>삭제</span>
    </button>
  `;
  menu.addEventListener('click', (e) => e.stopPropagation());
  menu.querySelector('[data-action="copy"]').addEventListener('click', async () => {
    const itemId = menu.dataset.itemId;
    const folderId = menu.dataset.folderId;
    closeCardContextMenu();
    if (!itemId || !folderId) return;
    const folder = savedItemsData.folders.find((f) => f.id === folderId);
    const item = folder?.items.find((i) => i.id === itemId);
    await copyPromptWithFeedback(item?.prompt || '');
  });
  menu.querySelector('[data-action="edit"]').addEventListener('click', () => {
    const itemId = menu.dataset.itemId;
    const folderId = menu.dataset.folderId;
    closeCardContextMenu();
    if (!itemId || !folderId) return;
    const folder = savedItemsData.folders.find(f => f.id === folderId);
    const item = folder?.items.find(i => i.id === itemId);
    if (item) {
      openSavedItemsForm(getItemImages(item), item.prompt || '', {
        title: item.name || '',
        editItemId: item.id,
        editFolderId: folderId
      });
    }
  });
  menu.querySelector('[data-action="delete"]').addEventListener('click', async () => {
    const itemId = menu.dataset.itemId;
    const folderId = menu.dataset.folderId;
    closeCardContextMenu();
    if (!itemId || !folderId) return;
    const ok = await showConfirmModal(
      'Are you sure you want to delete this saved prompt? This cannot be undone.',
      { title: 'Delete prompt', okText: 'Delete', cancelText: 'Cancel' }
    );
    if (ok) deleteSavedItem(itemId, folderId);
  });
  document.body.appendChild(menu);
  return menu;
}

// 저장된 항목 삭제
function deleteSavedItem(itemId, folderId) {
  const folder = savedItemsData.folders.find(f => f.id === folderId);
  if (folder) {
    folder.items = folder.items.filter(item => item.id !== itemId);
    if (folder.items.length === 0) {
      savedItemsData.folders = savedItemsData.folders.filter(f => f.id !== folderId);
      expandedWorkspaceSavedFolderIds.delete(folderId);
    }
    saveSavedItems();
    renderSavedItems();
    showToast('항목이 삭제되었습니다.');
  }
}

/** Prompt Collection: 특정 프로젝트의 savedPromptLibrary에서 항목 삭제 */
function deleteSavedItemFromProject(itemId, folderId, projectId) {
  const project = projectsData.find(p => p.id === projectId);
  if (!project) return;
  ensureProjectSavedPromptLibrary(project);
  const folder = project.savedPromptLibrary.folders.find(f => f.id === folderId);
  if (!folder) return;
  folder.items = folder.items.filter(item => item.id !== itemId);
  if (folder.items.length === 0) {
    project.savedPromptLibrary.folders = project.savedPromptLibrary.folders.filter(f => f.id !== folderId);
    expandedWorkspaceSavedFolderIds.delete(folderId);
  }
  saveProjects();
  if (activeProjectId === projectId) {
    hydrateSavedItemsFromProject(projectId);
    renderSavedItems();
  }
  if (getActiveHomeTab() === 'collection') {
    renderPromptCollectionCards();
  }
  showToast('항목이 삭제되었습니다.');
}

// 저장된 항목 모달 열기
function openSavedItemModal(item, folderId, projectId) {
  const modal = document.getElementById('prompt-view-modal');
  const nameInput = document.getElementById('prompt-view-name');
  const contentTextarea = document.getElementById('prompt-view-content');
  const folderSelect = document.getElementById('prompt-view-folder');
  const editBtn = document.getElementById('prompt-view-edit-btn');
  const saveBtn = document.getElementById('prompt-view-save-btn');
  const pasteBtn = document.getElementById('prompt-view-paste-btn');
  const title = document.querySelector('.prompt-view-modal__title');

  const targetProjectId = projectId || activeProjectId;
  if (targetProjectId) hydrateSavedItemsFromProject(targetProjectId);

  if (modal) {
    if (nameInput) nameInput.value = item.name || 'Untitled';
    if (contentTextarea) contentTextarea.value = item.prompt || '';

    if (folderSelect) {
      folderSelect.innerHTML = '';
      savedItemsData.folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        option.selected = folder.id === folderId;
        folderSelect.appendChild(option);
      });
    }

    setSavedItemViewMode(false, item.id, folderId);
    modal.style.display = 'flex';
    modal.dataset.itemId = item.id;
    modal.dataset.folderId = folderId;
    modal.dataset.isSavedItem = 'true';
    if (targetProjectId) modal.dataset.collectionProjectId = targetProjectId;
    else delete modal.dataset.collectionProjectId;
    if (title) title.textContent = '저장된 항목 보기';
  }
}

function setSavedItemViewMode(isEdit, itemId, folderId) {
  const nameInput = document.getElementById('prompt-view-name');
  const contentTextarea = document.getElementById('prompt-view-content');
  const folderSelect = document.getElementById('prompt-view-folder');
  const editBtn = document.getElementById('prompt-view-edit-btn');
  const saveBtn = document.getElementById('prompt-view-save-btn');
  const pasteBtn = document.getElementById('prompt-view-paste-btn');
  const title = document.querySelector('.prompt-view-modal__title');

  if (isEdit) {
    if (nameInput) { nameInput.readOnly = false; nameInput.style.background = ''; nameInput.style.cursor = 'text'; }
    if (contentTextarea) { contentTextarea.readOnly = false; contentTextarea.style.background = ''; contentTextarea.style.cursor = 'text'; }
    if (folderSelect) { folderSelect.disabled = false; }
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'block';
    if (pasteBtn) pasteBtn.style.display = 'none';
    if (title) title.textContent = '저장된 항목 수정';
  } else {
    if (nameInput) { nameInput.readOnly = true; nameInput.style.background = 'rgba(245,247,250,0.8)'; nameInput.style.cursor = 'default'; }
    if (contentTextarea) { contentTextarea.readOnly = true; contentTextarea.style.background = 'rgba(245,247,250,0.8)'; contentTextarea.style.cursor = 'default'; }
    if (folderSelect) { folderSelect.disabled = true; }
    if (editBtn) editBtn.style.display = 'block';
    if (saveBtn) saveBtn.style.display = 'none';
    if (pasteBtn) pasteBtn.style.display = 'block';
    if (title) title.textContent = '저장된 항목 보기';
  }
}

// ========== 통합 저장 모달 (중앙 팝업, 여러 장 이미지 + 편집 모드) ==========
function initUnifiedSaveModal() {
  const modal = document.getElementById('unified-save-modal');
  const form = document.getElementById('unified-save-form');
  const closeBtn = document.getElementById('unified-save-modal-close');
  const overlay = modal?.querySelector('.unified-save-modal__overlay');
  const pasteBtn = document.getElementById('unified-save-paste-btn');
  const previewBox = document.getElementById('unified-save-preview');
  const placeholderEl = document.getElementById('unified-save-preview-placeholder');
  const fileInput = document.getElementById('unified-save-file-input');
  const imagesListEl = document.getElementById('unified-save-images-list');
  const submitBtn = document.getElementById('unified-save-submit-btn');

  if (!modal) return;
  modal.unifiedSaveImages = modal.unifiedSaveImages || [];

  function getImages() {
    return modal.unifiedSaveImages || [];
  }

  function addImage(dataUrl) {
    if (!dataUrl) return;
    modal.unifiedSaveImages = modal.unifiedSaveImages || [];
    modal.unifiedSaveImages.push(dataUrl);
    renderUnifiedSaveImagesList();
  }

  function removeImage(index) {
    modal.unifiedSaveImages = modal.unifiedSaveImages || [];
    modal.unifiedSaveImages.splice(index, 1);
    renderUnifiedSaveImagesList();
  }

  function renderUnifiedSaveImagesList() {
    if (!imagesListEl) return;
    imagesListEl.innerHTML = '';
    const list = getImages();
    list.forEach((dataUrl, index) => {
      const wrap = document.createElement('div');
      wrap.className = 'unified-save-modal__thumb';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = '';
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'unified-save-modal__thumb-remove';
      rm.innerHTML = '×';
      rm.title = '이미지 제거';
      rm.addEventListener('click', (e) => { e.stopPropagation(); removeImage(index); });
      wrap.appendChild(img);
      wrap.appendChild(rm);
      imagesListEl.appendChild(wrap);
    });
  }
  if (modal) modal._renderUnifiedSaveImages = renderUnifiedSaveImagesList;

  function closeModal() {
    modal.style.display = 'none';
    if (form) form.reset();
    if (fileInput) fileInput.value = '';
    modal.unifiedSaveImages = [];
    delete modal.dataset.editItemId;
    delete modal.dataset.editFolderId;
    delete modal.dataset.sourceAppId;
    delete modal.dataset.collectionProjectId;
    const modalTitle = modal.querySelector('.unified-save-modal__title');
    if (modalTitle) modalTitle.textContent = 'Save';
    renderUnifiedSaveImagesList();
  }
  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);

  async function pasteImageFromClipboard() {
    try {
      const clipboard = await navigator.clipboard.read();
      for (const item of clipboard) {
        const type = item.types.find(t => t === 'image/png' || t === 'image/jpeg' || t === 'image/webp');
        if (type) {
          const blob = await item.getType(type);
          const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
          addImage(dataUrl);
          showToast('클립보드 이미지를 넣었습니다.');
          return;
        }
      }
      showToast('클립보드에 이미지가 없습니다.');
    } catch (err) {
      showToast('클립보드 접근이 거부되었습니다.');
    }
  }

  function openUnifiedSaveFilePicker() {
    fileInput?.click();
  }

  function handleUnifiedSaveFilesSelected() {
    const files = fileInput?.files;
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      showToast('이미지 파일을 선택해 주세요.');
      if (fileInput) fileInput.value = '';
      return;
    }
    let pending = imageFiles.length;
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        addImage(ev.target.result);
        pending -= 1;
        if (pending === 0) {
          showToast(imageFiles.length > 1
            ? `${imageFiles.length}개의 이미지를 추가했습니다.`
            : '이미지를 추가했습니다.');
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInput) fileInput.value = '';
  }

  const filePickerTarget = placeholderEl || previewBox;
  filePickerTarget?.addEventListener('click', openUnifiedSaveFilePicker);
  fileInput?.addEventListener('change', handleUnifiedSaveFilesSelected);
  pasteBtn?.addEventListener('click', () => { pasteImageFromClipboard(); });

  modal?.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
        addImage(dataUrl);
        showToast('이미지를 붙여넣었습니다.');
        return;
      }
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const titleText = formData.get('title')?.trim() || 'Untitled';
    const promptContent = formData.get('prompt')?.trim() || '';
    const images = getImages().slice();

    if (!promptContent && images.length === 0) {
      showToast('이미지 또는 프롬프트를 입력하세요.');
      return;
    }

    const editItemId = modal.dataset.editItemId;
    const editFolderId = modal.dataset.editFolderId;

    if (editItemId && editFolderId) {
      const folder = savedItemsData.folders.find(f => f.id === editFolderId);
      const item = folder?.items.find(i => i.id === editItemId);
      if (item) {
        item.name = titleText;
        item.prompt = promptContent;
        applyImagesToSavedItem(item, images);
        if (!item.appId || !item.openAppIds?.length) {
          applyWorkspaceSourceAppsToSavedItem(item, {
            openAppIds: parseModalSourceOpenAppIds(modal),
            primaryAppId: modal.dataset.sourceAppId || null,
          });
        }
        saveSavedItems(modal.dataset.collectionProjectId || activeProjectId);
        renderSavedItems();
        syncPromptCollectionGridIfActive();
        closeModal();
        showToast('수정되었습니다.');
      }
      return;
    }

    let finalImages = images;
    const urlIndices = [];
    images.forEach((url, i) => {
      if (url.startsWith('http://') || url.startsWith('https://')) urlIndices.push(i);
    });
    if (urlIndices.length > 0) {
      try {
        for (const i of urlIndices) {
          finalImages[i] = await convertImageUrlToDataUrl(images[i]) || images[i];
        }
      } catch {
        showToast('이미지 변환 실패');
        return;
      }
    }

    let folder = savedItemsData.folders[0];
    if (!folder) {
      folder = {
        id: `folder-${Date.now()}`,
        name: DEFAULT_WORKSPACE_FOLDER_NAME,
        items: []
      };
      savedItemsData.folders.push(folder);
    }
    const newSavedItem = {
      id: `item-${Date.now()}`,
      name: titleText,
      prompt: promptContent,
      createdAt: new Date().toISOString()
    };
    applyImagesToSavedItem(newSavedItem, finalImages);
    applyWorkspaceSourceAppsToSavedItem(newSavedItem, {
      openAppIds: parseModalSourceOpenAppIds(modal),
      primaryAppId: modal.dataset.sourceAppId || null,
    });
    folder.items.push(newSavedItem);
    saveSavedItems();
    renderSavedItems();
    closeModal();
    showToast('저장되었습니다.');
  });
}

// 통합 저장 모달 열기 (외부에서 호출)
// initialImageOrImages: 단일 dataUrl 문자열 또는 dataUrl[] 배열
// options: { title, editItemId, editFolderId } 편집 모드일 때
function openSavedItemsForm(initialImageOrImages = '', promptContent = '', options = {}) {
  const modal = document.getElementById('unified-save-modal');
  const titleInput = document.getElementById('unified-save-title');
  const promptTextarea = document.getElementById('unified-save-prompt');
  const submitBtn = document.getElementById('unified-save-submit-btn');

  if (!modal) return;

  document.getElementById('unified-save-form')?.reset();
  modal.unifiedSaveImages = [];
  delete modal.dataset.editItemId;
  delete modal.dataset.editFolderId;
  delete modal.dataset.sourceAppId;
  delete modal.dataset.sourceOpenAppIds;
  delete modal.dataset.collectionProjectId;

  let initialImages = [];
  if (Array.isArray(initialImageOrImages)) {
    initialImages = initialImageOrImages.filter(Boolean);
  } else if (initialImageOrImages && typeof initialImageOrImages === 'string') {
    initialImages = [initialImageOrImages];
  }

  const isEdit = options.editItemId && options.editFolderId;
  if (isEdit) {
    modal.dataset.editItemId = options.editItemId;
    modal.dataset.editFolderId = options.editFolderId;
    if (submitBtn) submitBtn.textContent = '저장';
  } else {
    if (submitBtn) submitBtn.textContent = '추가하기';
    const openAppIds = getWorkspaceSourceAppIds();
    if (openAppIds.length) modal.dataset.sourceOpenAppIds = JSON.stringify(openAppIds);
    const srcApp = options.sourceAppId || getWorkspaceSourceAppId();
    if (srcApp) modal.dataset.sourceAppId = srcApp;
    else if (openAppIds.length) modal.dataset.sourceAppId = openAppIds[0];
  }

  if (options.title != null && titleInput) titleInput.value = options.title;
  if (promptTextarea && promptContent != null) promptTextarea.value = promptContent;

  function doneRender() {
    if (modal._renderUnifiedSaveImages) modal._renderUnifiedSaveImages();
  }

  if (initialImages.length === 0) {
    doneRender();
  } else {
    const dataUrls = initialImages.filter(u => !u.startsWith('http://') && !u.startsWith('https://'));
    const urls = initialImages.filter(u => u.startsWith('http://') || u.startsWith('https://'));
    dataUrls.forEach(u => modal.unifiedSaveImages.push(u));
    if (urls.length === 0) {
      doneRender();
    } else {
      Promise.all(urls.map(u => convertImageUrlToDataUrl(u))).then(results => {
        results.forEach(d => { if (d) modal.unifiedSaveImages.push(d); });
        doneRender();
      }).catch(() => doneRender());
    }
  }

  modal.style.display = 'flex';
  setTimeout(() => { if (titleInput) titleInput.focus(); }, 100);
}


// 이미지 URL을 dataUrl로 변환 (기존 함수 재사용)
async function convertImageUrlToDataUrl(url) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('이미지 URL 변환 실패:', error);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (canvasError) {
          console.warn('Canvas 변환 실패:', canvasError);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}

// 프롬프트 보기 모달 초기화
function initPromptViewModal() {
  const modal = document.getElementById('prompt-view-modal');
  const closeBtn = document.getElementById('prompt-view-modal-close-btn');
  const editBtn = document.getElementById('prompt-view-edit-btn');
  const saveBtn = document.getElementById('prompt-view-save-btn');
  const pasteBtn = document.getElementById('prompt-view-paste-btn');
  const form = document.getElementById('prompt-view-form');
  const overlay = modal?.querySelector('.prompt-view-modal__overlay');

  // 닫기 버튼들
  closeBtn?.addEventListener('click', closePromptViewModal);
  overlay?.addEventListener('click', closePromptViewModal);

  // 수정 버튼 → 통합 저장 모달(이미지·붙여넣기 포함)로 편집
  editBtn?.addEventListener('click', () => {
    const itemId = modal?.dataset.itemId;
    const folderId = modal?.dataset.folderId;
    const isSavedItem = modal?.dataset.isSavedItem === 'true';
    const collectionProjectId = modal?.dataset.collectionProjectId;

    if (!isSavedItem || !itemId || !folderId) return;

    const folder = savedItemsData.folders.find(f => f.id === folderId);
    const item = folder?.items.find(i => i.id === itemId);
    if (!item) return;

    closePromptViewModal();
    openSavedItemsForm(getItemImages(item), item.prompt || '', {
      title: item.name || '',
      editItemId: item.id,
      editFolderId: folderId,
      collectionProjectId: collectionProjectId || activeProjectId || ''
    });
  });

  // 입력창에 붙여넣기 버튼
  pasteBtn?.addEventListener('click', () => {
    const contentTextarea = document.getElementById('prompt-view-content');
    if (contentTextarea) {
      insertPromptToInput(contentTextarea.value);
      closePromptViewModal();
    }
  });

  // 저장 버튼
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const itemId = modal?.dataset.itemId;
    const folderId = modal?.dataset.folderId;
    const isSavedItem = modal?.dataset.isSavedItem === 'true';
    
    if (!isSavedItem || !itemId || !folderId) return;

    const formData = new FormData(form);
    const newFolderId = formData.get('folder');
    const itemName = formData.get('name')?.trim();
    const promptContent = formData.get('content')?.trim();

    if (!itemName) {
      showToast('이름을 입력하세요.');
      return;
    }

    // 항목 찾기
    const oldFolder = savedItemsData.folders.find(f => f.id === folderId);
    const item = oldFolder?.items.find(i => i.id === itemId);
    
    if (!item) {
      showToast('항목을 찾을 수 없습니다.');
      return;
    }

    // 폴더가 변경된 경우
    if (newFolderId && newFolderId !== folderId) {
      const newFolder = savedItemsData.folders.find(f => f.id === newFolderId);
      if (newFolder) {
        // 기존 폴더에서 제거
        oldFolder.items = oldFolder.items.filter(i => i.id !== itemId);
        // 새 폴더에 추가
        item.name = itemName;
        item.prompt = promptContent || '';
        newFolder.items.push(item);
        if (oldFolder.items.length === 0) {
          savedItemsData.folders = savedItemsData.folders.filter(f => f.id !== folderId);
          expandedWorkspaceSavedFolderIds.delete(folderId);
        }
      }
    } else {
      // 같은 폴더에서 수정
      item.name = itemName;
      item.prompt = promptContent || '';
    }

    const collectionProjectId = modal?.dataset.collectionProjectId;
    saveSavedItems(collectionProjectId || activeProjectId);
    renderSavedItems();
    syncPromptCollectionGridIfActive();
    closePromptViewModal();
    showToast('항목이 수정되었습니다.');
  });
}

// 프롬프트 보기 모달 닫기
function closePromptViewModal() {
  const modal = document.getElementById('prompt-view-modal');
  if (modal) {
    const collectionProjectId = modal.dataset.collectionProjectId;
    modal.style.display = 'none';
    delete modal.dataset.itemId;
    delete modal.dataset.folderId;
    delete modal.dataset.isSavedItem;
    delete modal.dataset.collectionProjectId;
    if (collectionProjectId && collectionProjectId !== activeProjectId) {
      restoreSavedItemsToActiveWorkspace();
    }
  }
}

// 프롬프트를 입력창에 삽입
function insertPromptToInput(content) {
  const unifiedInput = document.getElementById('unified-input');
  if (unifiedInput) {
    unifiedInput.value = content;
    unifiedInput.focus();
    unifiedInput.style.height = 'auto';
    unifiedInput.style.height = Math.min(unifiedInput.scrollHeight, 180) + 'px';
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) sendBtn.disabled = false;
    showToast('프롬프트가 입력창에 추가되었습니다.');
  }
}

// ==================== 레이아웃 선택 기능 ====================
function initLayoutSelector() {
  const layoutBtn = document.getElementById('layout-btn');
  if (!layoutBtn) {
    console.warn('Layout button not found');
    return;
  }

  const workspaceControls = document.querySelector('.workspace__controls');
  if (!workspaceControls) {
    console.warn('Workspace controls not found');
    return;
  }

  // 기존 팝오버가 있으면 제거
  const existingPopover = document.getElementById('layout-popover');
  if (existingPopover) {
    existingPopover.remove();
  }

  // 팝오버 생성
  const popover = document.createElement('div');
  popover.className = 'layout-popover';
  popover.id = 'layout-popover';
  popover.innerHTML = `
    <div class="layout-popover__options" id="layout-options"></div>
  `;
  workspaceControls.style.position = 'relative';
  workspaceControls.appendChild(popover);

  layoutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Layout button clicked');
    const isVisible = popover.classList.contains('visible');
    if (isVisible) {
      popover.classList.remove('visible');
    } else {
      updateLayoutOptions();
      popover.classList.add('visible');
    }
  });

  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.layout-popover') && !e.target.closest('.workspace__layout-btn')) {
      popover.classList.remove('visible');
    }
  });
  
  console.log('Layout selector initialized');
}

function updateLayoutOptions() {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;

  const count = activeCanvas.windows.size;
  const optionsContainer = document.getElementById('layout-options');
  if (!optionsContainer) return;

  optionsContainer.innerHTML = '';

  const currentLayout = activeCanvas.layout || getDefaultLayout(count);
  const layouts = getAvailableLayouts(count);

  layouts.forEach(layout => {
    const option = document.createElement('div');
    option.className = 'layout-option';
    if (currentLayout === layout.id) {
      option.classList.add('active');
    }

    const boxesHtml = Array.from({ length: layout.boxes }, () => '<div></div>').join('');

    option.innerHTML = `
      <div class="layout-option__icon ${layout.iconClass}">
        ${boxesHtml}
      </div>
      <span class="layout-option__label">${layout.label}</span>
    `;

    option.addEventListener('click', () => {
      setCanvasLayout(layout.id);
      document.getElementById('layout-popover')?.classList.remove('visible');
    });

    optionsContainer.appendChild(option);
  });
}

function getAvailableLayouts(count) {
  if (count === 2) {
    return [
      { id: 'canvas-layout-2-h', label: '좌우 분할', iconClass: 'layout-option__icon--2h', boxes: 2 },
      { id: 'canvas-layout-2-v', label: '상하 분할', iconClass: 'layout-option__icon--2v', boxes: 2 },
    ];
  } else if (count === 3) {
    return [
      { id: 'canvas-layout-3-left', label: '왼쪽 1개', iconClass: 'layout-option__icon--3-left', boxes: 3 },
      { id: 'canvas-layout-3-right', label: '오른쪽 1개', iconClass: 'layout-option__icon--3-right-fixed', boxes: 3 },
      { id: 'canvas-layout-3-top', label: '위 1개', iconClass: 'layout-option__icon--3-top', boxes: 3 },
      { id: 'canvas-layout-3-bottom', label: '아래 1개', iconClass: 'layout-option__icon--3-bottom', boxes: 3 },
    ];
  }
  return [];
}

function getDefaultLayout(count) {
  if (count === 1) return 'canvas-layout-1';
  if (count === 2) return 'canvas-layout-2-h';
  if (count === 3) return 'canvas-layout-3-left';
  if (count === 4) return 'canvas-layout-4';
  return null;
}

function setCanvasLayout(layoutId) {
  const activeCanvas = getActiveCanvas();
  if (!activeCanvas) return;

  console.log('Setting canvas layout to:', layoutId);
  activeCanvas.layout = layoutId;
  
  // 즉시 레이아웃 클래스 업데이트
  updateWorkspaceLayoutClass();
  
  // 창들을 다시 렌더링해서 새로운 순서로 배치
  renderWorkspaceWindows();
  
  saveCanvasesToStorage();
  showToast('레이아웃이 변경되었습니다.');
}

function updateLayoutButton() {
  const layoutBtn = document.getElementById('layout-btn');
  if (!layoutBtn) return;

  const activeCanvas = getActiveCanvas();
  const count = activeCanvas ? activeCanvas.windows.size : 0;

  // 2개 or 3개 창일 때만 레이아웃 버튼 표시
  if (count === 2 || count === 3) {
    layoutBtn.style.display = 'flex';
  } else {
    layoutBtn.style.display = 'none';
    // 팝오버 닫기
    document.getElementById('layout-popover')?.classList.remove('visible');
  }
}
