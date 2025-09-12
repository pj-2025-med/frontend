import { useCallback, useState } from 'react';
import {
  ToolGroupManager,
  ArrowAnnotateTool,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  annotation,
} from '@cornerstonejs/tools';
import { getRenderingEngine } from '@cornerstonejs/core';
import {
  exportAllAnnotations,
  fetchAnnotationsFromServer,
  injectBundleIntoViewportWithScope,
  saveAnnotationsToServer,
} from '@/services/annotation';
import type { AnnotationBundlePayload } from '@/types/annotation';
import {
  PencilLine,
  MoveUpRight,
  Ruler,             // Length
  Square,            // RectangleROI
  Circle,            // EllipticalROI (환경에 따라 CircleROI)
  Triangle,// Angle
  Crosshair,         // Probe
  X, // Bidirectional
  Check,
  Save, FolderOpen, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  toolGroupId?: string;
  studyKey: string;
  seriesKey?: string;
  renderingEngineId: string;
  viewportId: string | null;
}

type AnnotationTool =
  | 'ArrowAnnotate'
  | 'Length'
  | 'RectangleROI'
  | 'EllipticalROI' // 보스 환경이 CircleROI면 이 문자열/버튼도 CircleROI로 바꿔주세요
  | 'Angle'
  | 'Probe'
  | 'Bidirectional'
  | 'FreehandROI';

const TOOL_ITEMS: Array<{
  name: AnnotationTool;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
    { name: 'ArrowAnnotate', label: '화살표', Icon: MoveUpRight },
    { name: 'Length', label: '거리', Icon: Ruler },
    { name: 'RectangleROI', label: '사각형', Icon: Square },
    { name: 'EllipticalROI', label: '타원', Icon: Circle }, // ← CircleROI 환경이면 이름/라벨 변경
    { name: 'Angle', label: '각도', Icon: Triangle },
    { name: 'Probe', label: '픽셀 정보', Icon: Crosshair },
    { name: 'Bidirectional', label: '양방향', Icon: X },
    //{ name: 'FreehandROI',    label: 'Freehand',     Icon: Pencil },
  ];

const ANNOTATION_TOOLS = TOOL_ITEMS.map(t => t.name);

export default function Toolbar({
  toolGroupId = 'cs3d-tg',
  studyKey,
  seriesKey,
  renderingEngineId,
  viewportId,
}: Props) {
  const [activeTool, setActiveTool] = useState<AnnotationTool | 'none'>('none');
  const [open, setOpen] = useState(false); // Popover 열림
  //const [annotating, setAnnotating] = useState(false);
  /*
    // 중복 식별자 방지: toggleArrowAnnotate → handleToggleAnnotate
    const handleToggleAnnotate = useCallback(() => {
      const tg = ToolGroupManager.getToolGroup(toolGroupId);
      if (!tg) {
        console.warn('ToolGroup을 찾을 수 없습니다:', toolGroupId);
        return;
      }
  
      if (annotating) {
        tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: 1 }] });
        tg.setToolActive(PanTool.toolName, { bindings: [{ mouseButton: 2 }] });
        tg.setToolActive(ZoomTool.toolName, { bindings: [{ mouseButton: 4 }] });
  
  
        tg.setToolPassive(ArrowAnnotateTool.toolName);
        setAnnotating(false);
      } else {
        tg.setToolActive(ArrowAnnotateTool.toolName, { bindings: [{ mouseButton: 1 }] });
        tg.setToolPassive(WindowLevelTool.toolName);
        setAnnotating(true);
      }
    }, [annotating, toolGroupId]);
  */
  const getTG = useCallback(() => ToolGroupManager.getToolGroup(toolGroupId), [toolGroupId]);

  const setAllAnnotationPassive = useCallback(() => {
    const tg = getTG();
    if (!tg) return;
    ANNOTATION_TOOLS.forEach(name => {
      try { tg.setToolPassive(name); } catch { }
    });
  }, [getTG]);

  // 주석 활성화
  const setActive = useCallback((toolName: AnnotationTool) => {
    const tg = getTG();
    if (!tg) return;
    setAllAnnotationPassive();

    // WL 잠시 passive
    try { tg.setToolPassive(WindowLevelTool.toolName); } catch { }
    tg.setToolActive(toolName, { bindings: [{ mouseButton: 1 }] });
    setActiveTool(toolName);
  }, [getTG, setAllAnnotationPassive]);


  // 주석 모드 종료
  const exitAnnotateMode = useCallback(() => {
    const tg = getTG();
    if (tg) {
      setAllAnnotationPassive();

      // WL 복구
      try { tg.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: 1 }] }); } catch { }
    }
    setActiveTool('none');
  }, [setAllAnnotationPassive]);
  // imageId → 키 파싱

  function parseImageIdKeys(imageId: string): {
    studyKey: number; seriesKey: number; imageKey: number; frameNo: number;
  } | null {
    const regex = /studies\/(\d+)\/series\/(\d+)\/(images|instances)\/(\d+)(?:\/frames\/(\d+))?/;
    try {
      const m = imageId.match(regex);
      if (!m) return null;
      const sKey = parseInt(m[1], 10);
      const seKey = parseInt(m[2], 10);
      const iKey = parseInt(m[4], 10);
      const fNo = m[5] ? parseInt(m[5], 10) : -1;
      if ([sKey, seKey, iKey].some(Number.isNaN)) return null;
      return { studyKey: sKey, seriesKey: seKey, imageKey: iKey, frameNo: fNo };
    } catch {
      return null;
    }
  }

  // 주석 저장
  const onSave = useCallback(async () => {
    try {
      if (!viewportId) {
        alert('뷰포트가 준비되지 않았습니다. 먼저 시리즈를 불러오세요.');
        return;
      }
      const re = getRenderingEngine(renderingEngineId);
      const vp: any = re?.getViewport(viewportId);
      if (!re || !vp) {
        alert('렌더링 엔진 또는 뷰포트를 찾을 수 없습니다.');
        return;
      }
      let currentImageId: string | undefined;
      if (typeof vp.getCurrentImageId === 'function') {
        currentImageId = vp.getCurrentImageId();
      } else if (typeof vp.getCurrentImageIdIndex === 'function' && typeof vp.getImageIds === 'function') {
        const idx = vp.getCurrentImageIdIndex();
        const ids = vp.getImageIds?.();
        currentImageId = Array.isArray(ids) ? ids[idx] : undefined;
      }
      if (!currentImageId) {
        alert('현재 이미지 ID를 가져올 수 없습니다.');
        return;
      }

      const annotations = exportAllAnnotations(ANNOTATION_TOOLS);

      await saveAnnotationsToServer({
        studyKey,
        seriesKey,
        imageIdScope: 'image',
        annotations,
        savedAt: new Date().toISOString(),
        currentImageId,
      });
      alert('주석이 저장되었습니다.');
    } catch (e: any) {
      console.error('Annotation 저장 중 오류 발생:', e);
      alert(`저장 실패: ${e.message}`);
    }
  }, [studyKey, seriesKey, viewportId, renderingEngineId]);

  // 주석 불러오기
  const onLoad = useCallback(async () => {
    if (!viewportId) {
      alert('뷰포트가 준비되지 않았습니다. 먼저 시리즈를 불러오세요.');
      return;
    }
    if (!seriesKey) {
      alert('시리즈가 선택되지 않았습니다.');
      return;
    }

    const re = getRenderingEngine(renderingEngineId);
    const vp: any = re?.getViewport(viewportId);
    if (!re || !vp) {
      alert('렌더링 엔진 또는 뷰포트를 찾을 수 없습니다.');
      return;
    }

    let currentImageId: string | undefined;
    if (typeof vp.getCurrentImageId === 'function') {
      currentImageId = vp.getCurrentImageId();
    } else if (typeof vp.getCurrentImageIdIndex === 'function' && typeof vp.getImageIds === 'function') {
      const idx = vp.getCurrentImageIdIndex();
      const ids = vp.getImageIds?.();
      currentImageId = Array.isArray(ids) ? ids[idx] : undefined;
    }

    if (!currentImageId) {
      alert('현재 이미지 ID를 가져올 수 없습니다.');
      return;
    }

    const keys = parseImageIdKeys(currentImageId);
    if (!keys) {
      console.warn('imageId 파싱 실패:', currentImageId);
      alert('현재 이미지 ID에서 imageKey를 추출할 수 없습니다.');
      return;
    }

    try {
      const bundle = (await fetchAnnotationsFromServer({
        studyKey,
        seriesKey,
        imageKey: String(keys.imageKey),
      })) as AnnotationBundlePayload;

      if (!bundle || !Array.isArray(bundle.annotations) || bundle.annotations.length === 0) {
        alert('주석 데이터가 없습니다.');
        return;
      }

      //injectBundleIntoViewportWithScope(bundle, renderingEngineId, viewportId);
      injectBundleIntoViewportWithScope(
        bundle,
        renderingEngineId,
        viewportId
      )
      alert('주석을 불러왔습니다.');
    } catch (e: any) {
      console.error('주석 불러오기 중 오류 발생:', e);
      alert(`주석 불러오기 실패: ${e.message}`);
    }
  }, [viewportId, seriesKey, renderingEngineId, studyKey]);

  // 주석 삭제
  const onClear = useCallback(() => {
    if (window.confirm('모든 주석을 삭제하시겠습니까?')) {
      annotation.state.removeAllAnnotations();
      const re = getRenderingEngine(renderingEngineId);
      re?.render();
    }
  }, [renderingEngineId]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-2 py-1">
        {/* Annotate 런처 (아이콘 하나) */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              className={activeTool !== 'none'
                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100'}
            >
              <PencilLine className="h-4 w-4" />
              <span className="ml-2">주석</span>
            </Button>
          </PopoverTrigger>

          <PopoverContent side="bottom" align="start" className="w-[280px] border-neutral-800 bg-neutral-900 p-3">
            <div className="mb-2 text-xs text-neutral-400">주석 도구 선택</div>
            <div className="grid grid-cols-4 gap-2">
              {TOOL_ITEMS.map(({ name, label, Icon }) => (
                <Tooltip key={name}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setActive(name); setOpen(false); }}
                      aria-label={label}
                      title={label}
                      className={[
                        'relative inline-flex items-center justify-center rounded-lg border',
                        'outline-none focus:outline-none focus-visible:outline-none',
                        'ring-0 focus:ring-0 focus-visible:ring-0',

                        activeTool === name
                          ? 'border-sky-500 bg-sky-500/10 text-sky-200'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800',
                      ].join(' ')}
                    >
                      <Icon className="h-5 w-5" />
                      {activeTool === name && (
                        <Check className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-neutral-900" />
                      )}
                    </button>
                  </TooltipTrigger>
                  {/*
                  <TooltipContent side="bottom" className="px-2 py-1 text-xs">
                    {label}
                  </TooltipContent>*/}
                </Tooltip>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                className="text-neutral-300 hover:bg-neutral-800"
                onClick={() => { exitAnnotateMode(); setOpen(false); }}
              >
                주석 모드 종료
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-5 w-px bg-neutral-800" />


        {/* 저장 */}
        <Button size="sm" onClick={onSave} className="text-neutral-200 hover:bg-neutral-800">
          <Save className="h-4 w-4" />
          <span className="ml-2">주석 저장</span>
        </Button>

        {/* 불러오기 */}
        <Button size="sm" onClick={onLoad} className="text-neutral-200 hover:bg-neutral-800">
          <FolderOpen className="h-4 w-4" />
          <span className="ml-2">주석 불러오기</span>
        </Button>

        {/* 모두 삭제 */}
        <Button
          size="sm"
          onClick={onClear}
          className="text-neutral-300 hover:bg-red-500/10 hover:text-red-200"
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-2">주석 삭제</span>
        </Button>
      </div>
    </TooltipProvider>
  );
}
