// src/services/annotation.ts
import { annotation } from "@cornerstonejs/tools";
import { API_ROOT } from "@/config/api";
import type { AnnotationBundlePayload, AnyAnnotation } from "@/types/annotation";
import { getRenderingEngine } from "@cornerstonejs/core";

/* ============ 유틸 ============ */
/*
function pickArrow(ann: any): ann is ArrowAnnotationData {
  return ann?.metadata?.toolName === "ArrowAnnotate" || ann?.toolName === "ArrowAnnotate";
}*/

function makeUid() {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "anno-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ============ Export ============ */
/*
export function exportArrowAnnotations(): ArrowAnnotationData[] {
  const all = annotation.state.getAllAnnotations(); // 모든 툴 포함
  const arrows: ArrowAnnotationData[] = all
    .filter(pickArrow)
    .map((a: any) => ({
      annotationUID: a.annotationUID ?? makeUid(),
      toolName: a.metadata?.toolName ?? a.toolName ?? "ArrowAnnotate",
      referencedImageId: a.metadata?.referencedImageId ?? a.referencedImageId,
      data: a.data ?? {},
      metadata: a.metadata ?? {},
    }));
  return arrows;
}*/

// toolName 보강
function ensureToolName(a: AnyAnnotation, fallback?: string): AnyAnnotation {
  const tn = a?.metadata?.toolName ?? a?.toolName ?? fallback;
  if (tn) {
    a.toolName = tn;
    a.metadata = a.metadata || {};
    a.metadata.toolName = tn;
  }
  return a;
}

// 저장 전에 최소 보정(이미지ID 채우기 등)
function normalizeAnnotation(a: AnyAnnotation, fallbackImageId?: string): AnyAnnotation {
  ensureToolName(a);
  if (!a.referencedImageId && a?.metadata?.referencedImageId) {
    a.referencedImageId = a.metadata.referencedImageId;
  }
  if (!a.referencedImageId && fallbackImageId) {
    a.referencedImageId = fallbackImageId;
  }
  return a;
}

// getAllAnnotations 없는 환경까지 고려한 안전 수집
function getAllSupportedAnnotations(toolNames?: string[]): AnyAnnotation[] {
  const out: AnyAnnotation[] = [];
  const getAll = (annotation.state as any).getAllAnnotations;
  if (typeof getAll === 'function') {
    try {
      const arr = getAll();
      for (const a of arr ?? []) out.push(ensureToolName(a));
      return out;
    } catch {}
  }
  // fallback: 툴 리스트가 있으면 툴별 조회
  if (toolNames?.length) {
    for (const t of toolNames) {
      try {
        const arr =
          (annotation.state as any).getAnnotations?.(t, { annotationGroupSelector: undefined }) ??
          (annotation.state as any).getAnnotations?.(t);
        if (Array.isArray(arr)) for (const a of arr) out.push(ensureToolName(a, t));
      } catch {}
    }
  }
  return out;
}

// 🔹 새로 추가: 멀티툴 전체 export
export function exportAllAnnotations(toolNames?: string[]): AnyAnnotation[] {
  return getAllSupportedAnnotations(toolNames);
}




/* ============ Save to Server ============ */
export async function saveAnnotationsToServer(payload: AnnotationBundlePayload) {
  function parseImageIdKeys(
    imageId: string,
  ): { studyKey: number; seriesKey: number; imageKey: number; frameNo: number } | null {
    const regex = /studies\/(\d+)\/series\/(\d+)\/(images|instances)\/(\d+)(?:\/frames\/(\d+))?/;

    try {
      const match = imageId.match(regex);
      if (!match) throw new Error(`Could not parse required keys from imageId: ${imageId}`);
      const studyKey = parseInt(match[1], 10);
      const seriesKey = parseInt(match[2], 10);
      const imageKey = parseInt(match[4], 10);
      const frameNo  = match[5] ? parseInt(match[5], 10) : -1;

      if (isNaN(studyKey) || isNaN(seriesKey) || isNaN(imageKey)) {
        console.error("Failed to parse one or more keys from imageId", imageId);
        return null;
      }
      return { studyKey, seriesKey, imageKey, frameNo };
    } catch (e) {
      console.error(`Failed to parse imageId: ${imageId}`, e);
      return null;
    }
  }

  const { currentImageId } = payload;

  const normalized: AnyAnnotation[] = (payload.annotations ?? [])
  .map(a => normalizeAnnotation(a, currentImageId))
  .map(a => ensureToolName(a));

  const groupedByImageId: Record<string, AnyAnnotation[]> = {};
  if (normalized.length > 0) {
    normalized.reduce((acc, ann) => {
      const imageId = ann.referencedImageId;
      if (!imageId) {
        console.warn("Annotation without referencedImageId found, skipping:", ann);
        return acc;
      }
      //if (!acc[imageId]) acc[imageId] = [];
      //acc[imageId].push(ann);
      (acc[imageId] ||= []).push(ann);
      return acc;
    }, groupedByImageId);
  } else if (currentImageId) {
    groupedByImageId[currentImageId] = [];
  }

  const backendPayload = Object.entries(groupedByImageId)
    .map(([imageId, imageAnnotations]) => {
      const keys = parseImageIdKeys(imageId);
      if (!keys) return null;
      return {
        ...keys,
        annotations: JSON.stringify({ version: "5.3.0", objects: imageAnnotations }),
        createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (backendPayload.length === 0) {
    console.log("저장할 주석 데이터가 없습니다 (currentImageId도 없음).");
    return;
  }

  const ANNOTATION_API_ROOT = API_ROOT.replace("/dicom", "/annotations");

  const promises = backendPayload.map((payloadItem) => {
    const { studyKey, seriesKey, imageKey } = payloadItem;
    const url = `${ANNOTATION_API_ROOT}/studies/${studyKey}/series/${seriesKey}/images/${imageKey}`;

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadItem),
      credentials: "include",
    });
  });

  try {
    const responses = await Promise.all(promises);
    for (const res of responses) {
      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Annotation 저장 실패: ${res.status}, URL: ${res.url}, Body: ${errorBody}`);
      }
    }
  } catch (error) {
    console.error("Annotation 저장 중 오류 발생:", error);
    throw error;
  }
}

/* ============ Fetch from Server ============ */
export async function fetchAnnotationsFromServer(params: {
  studyKey: string;
  seriesKey: string;
  imageKey: string;
}) {
  const ANNOTATION_API_ROOT = API_ROOT.replace("/dicom", "/annotations");
  const { studyKey, seriesKey, imageKey } = params;

  const url = `${ANNOTATION_API_ROOT}/studies/${studyKey}/series/${seriesKey}/images/${imageKey}`;
  console.log("Fetching annotations from URL:", url);

  const res = await fetch(url, { credentials: "include" });
  console.log("Annotation fetch response:", res);
  if (!res.ok) {
    throw new Error(`Annotation 불러오기 실패: ${res.status} - ${res.statusText}`);
  }

  const text = await res.text();

  if (!text) {
    return {
      studyKey,
      seriesKey,
      imageIdScope: "image" as const,
      annotations: [],
      savedAt: new Date().toISOString(),
    } as AnnotationBundlePayload;
  }

  try {
    const rawArray = JSON.parse(text);
    if (!Array.isArray(rawArray) || rawArray.length === 0) {
      return {
        studyKey,
        seriesKey,
        imageIdScope: "image" as const,
        annotations: [],
        savedAt: new Date().toISOString(),
      } as AnnotationBundlePayload;
    }

    const raw = rawArray[0] as
      | AnnotationBundlePayload
      | { annotations?: string | { version?: string; objects?: any[] } | any[]; savedAt?: string };

    let annotationsArr: any[] = [];

    if (Array.isArray((raw as any).annotations)) {
      annotationsArr = (raw as any).annotations as any[];
    } else if (typeof (raw as any).annotations === "string") {
      try {
        const parsed = JSON.parse((raw as any).annotations);
        let final: any[] = [];
        if (typeof parsed?.annotations === "string") {
          try {
            const inner = JSON.parse(parsed.annotations);
            if (Array.isArray(inner?.objects)) final = inner.objects;
            else if (Array.isArray(inner)) final = inner;
          } catch {}
        } else if (Array.isArray(parsed?.objects)) final = parsed.objects;
        else if (Array.isArray(parsed)) final = parsed;
        annotationsArr = final;
      } catch {
        annotationsArr = [];
      }
    } else if ((raw as any).annotations && typeof (raw as any).annotations === "object") {
      const obj = (raw as any).annotations as any;
      if (Array.isArray(obj?.objects)) annotationsArr = obj.objects;
      else if (Array.isArray(obj)) annotationsArr = obj;
      else annotationsArr = [];
    }

    console.log("Parsed annotations for import:", annotationsArr);

    const bundle: AnnotationBundlePayload = {
      studyKey,
      seriesKey,
      imageIdScope: "image" as const,
      annotations: (annotationsArr ?? []).map(a => ensureToolName(a)),
      savedAt: (raw as any).savedAt ?? new Date().toISOString(),
    };

    return bundle;
  } catch (e) {
    console.error("Failed to parse annotations JSON:", e);
    throw new Error("Failed to parse annotations from server.");
  }
}

/* ============ 주석 정리/주입 유틸 ============ */
function clearElementAnnotations(el: HTMLDivElement) {
  try {
    const all = (annotation.state as any).getAllAnnotations?.() ?? (annotation.state as any).getAnnotations?.() ?? [];
    for (const a of all) {
      if (a?.metadata?.element && a.metadata.element !== el) continue;
      (annotation.state as any).removeAnnotation?.(a.annotationUID, el);
    }
  } catch {}
}

export function injectBundleIntoViewportWithScope(
  bundleLike: any,
  renderingEngineId: string,
  viewportId: string,
  toolGroupId?: string
) {
  const re = getRenderingEngine(renderingEngineId);
  const vp: any = re?.getViewport(viewportId);
  const el = vp?.element as HTMLDivElement | undefined;
  if (!re || !vp || !el) return;

  clearElementAnnotations(el);

  let annos: any[] = [];
  if (Array.isArray(bundleLike?.objects)) annos = bundleLike.objects;
  else if (Array.isArray(bundleLike?.annotations)) annos = bundleLike.annotations;
  else if (typeof bundleLike?.annotations === "string") {
    try {
      const parsed = JSON.parse(bundleLike.annotations);
      if (Array.isArray(parsed?.objects)) annos = parsed.objects;
      else if (Array.isArray(parsed)) annos = parsed;
    } catch {}
  }

  let currentImageId: string | undefined;
  try {
    if (typeof vp.getCurrentImageId === "function") currentImageId = vp.getCurrentImageId();
    else if (typeof vp.getCurrentImageIdIndex === "function" && typeof vp.getImageIds === "function") {
      const idx = vp.getCurrentImageIdIndex();
      const ids = vp.getImageIds?.();
      currentImageId = Array.isArray(ids) ? ids[idx] : undefined;
    }
  } catch {}

  const wado = (id?: string) => (id && id.startsWith("wadouri:") ? id : id ? `wadouri:${id}` : undefined);

  for (const raw of annos || []) {
    const a = JSON.parse(JSON.stringify(raw));
    a.annotationUID = makeUid();
    ensureToolName(a, 'ArrowAnnotate');

    a.metadata = {
      ...(a.metadata ?? {}),
      element: el,
      ...(toolGroupId ? { toolGroupId } : {}),
    };

    const rid = wado(a.referencedImageId ?? a.metadata?.referencedImageId ?? currentImageId);
    if (rid) {
      a.referencedImageId = rid;
      a.metadata.referencedImageId = rid;
      a.metadata.referencedImageURI = rid.replace(/^wadouri:/, "");
    }

    (annotation.state as any).addAnnotation?.(a, el);
  }

  console.log("[Inject OK]", { viewportId, toolGroupId, count: annos?.length ?? 0 });
  re.render?.();
}

/** 전역 상태에 남아 있는 소유권 없는(unscoped) 주석 제거 */
export function purgeUnscopedAnnotations() {
  try {
    const all =
      (annotation.state as any).getAllAnnotations?.() ??
      (annotation.state as any).getAnnotations?.() ??
      [];

    for (const a of all) {
      const hasEl = !!a?.metadata?.element;
      const hasTG = !!a?.metadata?.toolGroupId;
      if (!hasEl && !hasTG) {
        (annotation.state as any).removeAnnotation?.(a.annotationUID);
      }
    }
  } catch (e) {
    console.warn("purgeUnscopedAnnotations failed", e);
  }
}

/* ====== ⬇️ 추가: 소유권/이미지ID 기준 삭제 유틸 (3중 방어) ====== */
export function removeAnnotationsScoped(options: { element?: HTMLElement; toolGroupId?: string }) {
  try {
    const all =
      (annotation.state as any).getAllAnnotations?.() ??
      (annotation.state as any).getAnnotations?.() ??
      [];

    for (const a of all) {
      if (options.element && a?.metadata?.element !== options.element) continue;
      if (options.toolGroupId && a?.metadata?.toolGroupId !== options.toolGroupId) continue;
      (annotation.state as any).removeAnnotation?.(a.annotationUID, options.element);
    }
  } catch (e) {
    console.warn("removeAnnotationsScoped failed", e);
  }
}

/** 정확히 일치하는 referencedImageId 로 삭제 */
export function removeAnnotationsByImageId(imageId: string) {
  try {
    const all = (annotation.state as any).getAllAnnotations?.() ?? [];
    for (const a of all) {
      const rid = a?.metadata?.referencedImageId ?? a?.referencedImageId;
      if (rid === imageId) {
        (annotation.state as any).removeAnnotation?.(a.annotationUID);
      }
    }
  } catch (e) {
    console.warn("removeAnnotationsByImageId failed", e);
  }
}

/** referencedImageId 문자열 포함으로 삭제 (예: '?vp=left' / '?vp=right') */
export function removeAnnotationsByImageIdIncludes(fragment: string) {
  try {
    const all = (annotation.state as any).getAllAnnotations?.() ?? [];
    for (const a of all) {
      const rid = (a?.metadata?.referencedImageId ?? a?.referencedImageId)?.toString() || "";
      if (rid.includes(fragment)) {
        (annotation.state as any).removeAnnotation?.(a.annotationUID);
      }
    }
  } catch (e) {
    console.warn("removeAnnotationsByImageIdIncludes failed", e);
  }
}