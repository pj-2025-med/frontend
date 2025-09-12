import { Enums, RenderingEngine } from "@cornerstonejs/core";
import { ToolGroupManager } from "@cornerstonejs/tools";

export type Layout = {
  rows: number,
  cols: number
}

export function viewportGrid(
  re: RenderingEngine,
  gridRoot: HTMLDivElement,
  next: Layout
): string[] {
  gridRoot.innerHTML = ''; // 기존 그리드 초기화
  const ids: string[] = [];
  const total = next.rows * next.cols;

  for (let i = 0; i < total; i++) {
    // 셀 생성
    const cell = document.createElement('div');
    cell.style.position = 'relative';
    cell.style.width = '100%';
    cell.style.height = '100%';
    gridRoot.appendChild(cell);

    // 캔버스 호스트 생성
    const canvasHost = document.createElement('div');
    canvasHost.style.position = 'absolute';
    canvasHost.style.inset = '0';
    canvasHost.style.outline = 'none';
    //canvasHost.tabIndex = -1;
    cell.appendChild(canvasHost);

    // 오버레이 호스트 생성(메타데이터 표시)
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.pointerEvents = 'none';
    //overlay.style.zIndex = '1';
    overlay.dataset.overlayFor = `vp-${i}`;
    cell.appendChild(overlay);

    // 뷰포트 등록
    const viewportId = `vp-${i}`;
    re.enableElement({
      viewportId: viewportId,
      element: canvasHost,
      type: Enums.ViewportType.STACK,
    });
    ids.push(viewportId);
  }
  return ids;
}

// 그리드, 툴즈 재생성
export function rebuildGridAndBindTools(
  re: RenderingEngine,
  gridRoot: HTMLDivElement,
  layout: Layout,
  toolGroupId: string,
  engineId: string,
): string[] {

  // ToolGroup 확보
  const tg = ToolGroupManager.getToolGroup(toolGroupId) ?? ToolGroupManager.createToolGroup(toolGroupId);
  if (!tg) throw new Error('ToolGroup 생성/획득 실패')

  // ToolGroup에서 기존 뷰포트 분리 (중복 매핑 방지)
  try {
    const infos = tg?.getViewportsInfo?.() ?? [];
    for (const info of infos) {
      if (info.renderingEngineId === engineId) {
        //tg.removeViewport(info.viewportId, engineId);
        tg.removeViewports(info.viewportId, engineId);
      }
    }
  } catch {}

  //기존 뷰포트 disable
  const prevViewports = [...re.getViewports()];
  for (const vp of prevViewports) {
    try { re.disableElement(vp.id); } 
    catch {}
  }

  // 새 그리드 생성
  const vpIds = viewportGrid(re, gridRoot, layout);

  // ToolGroup에 새 뷰포트 연결
  for (const vid of vpIds) {
    tg.addViewport(vid, engineId);
  }

  // 캔버스 크기 확정
  try {
    re.resize(true);
  } catch {}
  
  return vpIds;
}

// 각 대응하는 뷰포트 위에 메타데이터 렌더
export function getOverlayHost(root: HTMLDivElement, viewportId: string): HTMLDivElement | null {
  return root.querySelector(`div[data-overlay-for="${viewportId}"]`)
}
