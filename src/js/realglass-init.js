// RealGlass 초기화 및 적용
let realGlassInstance = null;

async function initRealGlass() {
  try {
    // RealGlass 인스턴스 생성
    realGlassInstance = new RealGlass();
    
    // 초기화 (배경 스크린샷)
    await realGlassInstance.init({
      ignoreElements: [] // 필요시 무시할 요소 추가
    });
    
    console.log('✅ RealGlass 초기화 완료');
    
    // UI 박스들에 적용
    await applyRealGlassToElements();
    
  } catch (error) {
    console.error('❌ RealGlass 초기화 실패:', error);
  }
}

async function applyRealGlassToElements() {
  if (!realGlassInstance) return;
  
  // 1. AI 윈도우들에 적용
  const aiWindows = document.querySelectorAll('.ai-window');
  for (const window of aiWindows) {
    await applyToElement(window, {
      borderRadius: 8,
      chromaticAberration: 2.0,
      frosting: 0.25,
      lightStrength: 2.2,
      thickness: 2.0,
      ior: 1.52,
      lightX: 0.6,
      lightY: 0.3,
      glassOpacity: 0.15,
      tintColor: [0.88, 0.92, 1.0],
      tintStrength: 0.2,
      specularShininess: 64
    });
  }
  
  // 2. 사이드바 앱 박스들에 적용
  const appBoxes = document.querySelectorAll('.sidebar__app');
  for (const box of appBoxes) {
    await applyToElement(box, {
      borderRadius: 8,
      chromaticAberration: 1.5,
      frosting: 0.2,
      lightStrength: 1.8,
      thickness: 1.8,
      ior: 1.52,
      lightX: 0.7,
      lightY: 0.3,
      glassOpacity: 0.1,
      tintColor: [0.9, 0.93, 1.0],
      tintStrength: 0.15,
      specularShininess: 48
    });
  }
  
  // 3. 앱 래퍼에 적용
  const appsWrapper = document.querySelector('.sidebar__apps-wrapper');
  if (appsWrapper) {
    await applyToElement(appsWrapper, {
      borderRadius: 8,
      chromaticAberration: 1.6,
      frosting: 0.2,
      lightStrength: 2.0,
      thickness: 1.9,
      ior: 1.53,
      lightX: 0.5,
      lightY: 0.3,
      glassOpacity: 0.12,
      tintColor: [0.88, 0.92, 1.0],
      tintStrength: 0.16,
      specularShininess: 56
    });
  }
  
  // 4. 플로팅 컨트롤에 적용
  const floatingControl = document.querySelector('.floating-control');
  if (floatingControl) {
    await applyToElement(floatingControl, {
      borderRadius: 999,
      chromaticAberration: 1.8,
      frosting: 0.22,
      lightStrength: 2.1,
      thickness: 2.0,
      ior: 1.53,
      lightX: 0.5,
      lightY: 0.2,
      glassOpacity: 0.15,
      tintColor: [0.88, 0.92, 1.0],
      tintStrength: 0.18,
      specularShininess: 60
    });
  }
  
  console.log('✅ 모든 UI 박스에 RealGlass 적용 완료');
}

async function applyToElement(element, options) {
  try {
    const glass = new RealGlass(realGlassInstance);
    await glass.init();
    await glass.apply(element, options);
    
    // RealGlass 캔버스를 배경으로 보내기
    const canvas = element.querySelector('canvas');
    if (canvas) {
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '1';
      canvas.style.pointerEvents = 'none';
    }
  } catch (error) {
    console.error('RealGlass 적용 실패:', element, error);
  }
}

// 새로운 AI 윈도우가 추가될 때마다 RealGlass 적용
function observeNewWindows() {
  const workspaceCanvas = document.getElementById('workspace-canvas');
  if (!workspaceCanvas) return;
  
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.classList && node.classList.contains('ai-window')) {
          await applyToElement(node, {
            borderRadius: 8,
            chromaticAberration: 1.5,
            frosting: 0.15,
            lightStrength: 1.8,
            thickness: 1.8,
            ior: 1.55,
            lightX: 0.6,
            lightY: 0.3,
            tintColor: [0.85, 0.9, 1.0],
            tintStrength: 0.15,
            specularShininess: 32
          });
        }
      }
    }
  });
  
  observer.observe(workspaceCanvas, {
    childList: true,
    subtree: true
  });
}

// 새로운 앱 박스가 추가될 때마다 RealGlass 적용
function observeNewAppBoxes() {
  const appList = document.getElementById('ai-app-list');
  if (!appList) return;
  
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.classList && node.classList.contains('sidebar__app')) {
          await applyToElement(node, {
            borderRadius: 8,
            chromaticAberration: 1.0,
            frosting: 0.12,
            lightStrength: 1.5,
            thickness: 1.5,
            ior: 1.52,
            lightX: 0.7,
            lightY: 0.3,
            tintColor: [0.9, 0.92, 1.0],
            tintStrength: 0.1,
            specularShininess: 24
          });
        }
      }
    }
  });
  
  observer.observe(appList, {
    childList: true
  });
}

// 페이지 로드 후 초기화 - RealGlass 비활성화 (파스텔 디자인 사용)
window.addEventListener('load', async () => {
  console.log('✨ 파스텔 그라데이션 디자인 활성화');
  // RealGlass 대신 CSS 그라데이션 사용
  // 필요시 아래 주석을 해제하여 RealGlass 활성화 가능
  /*
  if (typeof RealGlass !== 'undefined') {
    await initRealGlass();
    observeNewWindows();
    observeNewAppBoxes();
  } else {
    console.error('❌ RealGlass 라이브러리가 로드되지 않았습니다.');
  }
  */
});

// 윈도우 리사이즈 시 재초기화
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(async () => {
    if (realGlassInstance) {
      await realGlassInstance.init();
      await applyRealGlassToElements();
    }
  }, 500);
});

export { initRealGlass, applyRealGlassToElements, realGlassInstance };

