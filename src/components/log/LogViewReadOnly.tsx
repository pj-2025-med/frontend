// src/pages/LogsViewReadOnly.tsx
import { AnimatePresence, motion } from "framer-motion";
import { startTransition } from "react";
import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import AnnotationModal, { type AnnotationModalData } from "../AnnotationModal";
import { normalizeToYMDHMS } from "../../DateFormat";

const baseUrl = import.meta.env.VITE_BASE_URL;

type ActionType = "C" | "I" | "U" | "D" | "R" | string;

type LogRaw = {
  logId: number;
  studyKey: number;
  userId: string;
  commentId: number | null;
  commentType: string;
  originalTitle: string | null;
  originalContent: string | null;
  newTitle: string | null;
  newContent: string | null;
  actionType: ActionType;
  createdAt: string;
  updatedAt?: string | null;
};

type LogRow = Omit<LogRaw, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

function getActionTypeInfo(actionType: ActionType) {
  switch (actionType) {
    case "C": return { text: "생성", className: "bg-green-100 text-green-800" };
    case "I": return { text: "추가", className: "bg-blue-100 text-blue-800" };
    case "U": return { text: "수정", className: "bg-yellow-100 text-yellow-800" };
    case "D": return { text: "삭제", className: "bg-red-100 text-red-800" };
    case "R": return { text: "조회", className: "bg-gray-200 text-gray-800" };
    default:  return { text: actionType, className: "bg-gray-100 text-gray-800" };
  }
}
const isAnnotationType = (t: string) => (t || "").toUpperCase() === "ANNOTATION";

const PAGE_SIZE = 20;

const LogsViewReadOnly: React.FC = () => {
  // 조회 로그 전용: 액션 타입 'R' 고정
  const navigate = useNavigate();
  const [actionType] = useState<string>("R");
  const [selCommentType, setSelCommentType] = useState<string>("ALL");
  const [selUserId, setSelUserId] = useState<string>("ALL");
  const [selStudyKey, setSelStudyKey] = useState<string>("ALL");
  const [selCommentId, setSelCommentId] = useState<string>("ALL");

  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err,   setErr] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<AnnotationModalData | null>(null);

  const commentTypeOptions = useMemo(() => {
    const set = new Set<string>(); rows.forEach(r => set.add(r.commentType));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const userIdOptions = useMemo(() => {
    const set = new Set<string>(); rows.forEach(r => set.add(r.userId));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const studyKeyOptions = useMemo(() => {
    const set = new Set<string>(); rows.forEach(r => set.add(String(r.studyKey)));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [rows]);

  const commentIdOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => set.add(r.commentId === null ? "NONE" : String(r.commentId)));
    return Array.from(set).sort((a, b) => {
      if (a === "NONE") return -1;
      if (b === "NONE") return 1;
      return Number(a) - Number(b);
    });
  }, [rows]);

  // 조회(R) 로그만 표시
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.actionType !== "R") return false; // 조회만
      if (selCommentType !== "ALL" && r.commentType    !== selCommentType) return false;
      if (selUserId      !== "ALL" && r.userId         !== selUserId)      return false;
      if (selStudyKey    !== "ALL" && String(r.studyKey) !== selStudyKey)  return false;
      if (selCommentId   !== "ALL") {
        if (selCommentId === "NONE") {
          if (r.commentId !== null) return false;
        } else {
          if (String(r.commentId) !== selCommentId) return false;
        }
      }
      return true;
    });
  }, [rows, selCommentType, selUserId, selStudyKey, selCommentId]);

  const fetchLogs = useCallback(
    async (append: boolean, targetPage: number) => {
      setLoading(true); setErr(null);
      try {
        const url = `${baseUrl}/api/v1/logs/showViewLog?page=${targetPage}&size=${PAGE_SIZE}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const raw: LogRaw[] = await res.json();
        const normalized: LogRow[] = raw.map((l) => ({
          ...l,
          createdAt: normalizeToYMDHMS(l.createdAt),
          updatedAt: normalizeToYMDHMS(l.updatedAt ?? null),
        }));

        if (append) {
          setRows(prev => [...prev, ...normalized]);
        } else {
          startTransition(() => setRows(normalized));
        }
        setHasMore(normalized.length === PAGE_SIZE);
      } catch (e: any) {
        setErr(e?.message ?? "로그를 불러오지 못했습니다.");
        if (!append) setRows([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    void fetchLogs(false, 1);
  }, [fetchLogs]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    void fetchLogs(false, 1);
  }, [fetchLogs]);

  const resetFilters = useCallback(() => {
    setSelCommentType("ALL");
    setSelUserId("ALL");
    setSelStudyKey("ALL");
    setSelCommentId("ALL");
  }, []);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    void fetchLogs(true, next);
  }, [loading, hasMore, page, fetchLogs]);

  const openAnnotationModal = (log: LogRow) => {
    setModalData({
      logId: log.logId,
      userId: log.userId,
      studyKey: log.studyKey,
      commentId: log.commentId,
      createdAt: log.createdAt,
      actionType: log.actionType,
      originalTitle: log.originalTitle,
      originalContent: log.originalContent,
      newTitle: log.newTitle,
      newContent: log.newContent,
    });
    setModalOpen(true);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div className="bg-neutral-900 text-neutral-100 min-h-screen flex flex-col">
        <Card className="m-4 sm:m-6 md:m-8 bg-neutral-900/60 border-neutral-800 shadow-none flex-1 flex flex-col">
          <CardHeader className="border-b border-neutral-800">
            <CardTitle>조회 로그</CardTitle>
          </CardHeader>

          <CardContent className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
            {/* 선택 기준 (액션 타입은 '조회(R)' 고정/비활성) */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
              <Select value={actionType} disabled>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 opacity-70">
                  <SelectValue placeholder="액션" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100">
                  <SelectItem value="R">조회(R)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selCommentType} onValueChange={setSelCommentType}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700">
                  <SelectValue placeholder="Comment Type" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100 max-h-72 overflow-auto">
                  <SelectItem value="ALL">타입: 전체</SelectItem>
                  {commentTypeOptions.length === 0 ? (
                    <div className="px-3 py-2 text-neutral-400">옵션 없음</div>
                  ) : (
                    commentTypeOptions.map(t => (
                      <SelectItem key={t} value={t} className="whitespace-nowrap break-keep">
                        {t}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={selUserId} onValueChange={setSelUserId}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700">
                  <SelectValue placeholder="사용자 ID" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100 max-h-72 overflow-auto">
                  <SelectItem value="ALL">사용자: 전체</SelectItem>
                  {userIdOptions.length === 0 ? (
                    <div className="px-3 py-2 text-neutral-400">옵션 없음</div>
                  ) : (
                    userIdOptions.map(u => (
                      <SelectItem key={u} value={u} className="whitespace-nowrap break-keep">
                        {u}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={selStudyKey} onValueChange={setSelStudyKey}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700">
                  <SelectValue placeholder="Study Key" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100 max-h-72 overflow-auto">
                  <SelectItem value="ALL">Study: 전체</SelectItem>
                  {studyKeyOptions.length === 0 ? (
                    <div className="px-3 py-2 text-neutral-400">옵션 없음</div>
                  ) : (
                    studyKeyOptions.map(sk => (
                      <SelectItem key={sk} value={sk} className="whitespace-nowrap break-keep">
                        {sk}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={selCommentId} onValueChange={setSelCommentId}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700">
                  <SelectValue placeholder="Comment ID" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100 max-h-72 overflow-auto">
                  <SelectItem value="ALL">Comment: 전체</SelectItem>
                  {commentIdOptions.length === 0 ? (
                    <div className="px-3 py-2 text-neutral-400">옵션 없음</div>
                  ) : (
                    commentIdOptions.map(cid => (
                      <SelectItem key={cid} value={cid} className="whitespace-nowrap break-keep">
                        {cid === "NONE" ? "없음" : cid}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button onClick={() => navigate("/logView")} className="flex-1 bg-sky-500 hover:bg-sky-600" disabled={loading}>
                  {loading ? "새로고침..." : "로그조회"}
                </Button>
                <Button onClick={resetFilters} variant="outline" className="flex-1 border-neutral-700 text-neutral-200">
                  초기화
                </Button>
              </div>
            </div>

            <div className={`relative overflow-x-auto shadow-md sm:rounded-lg transition-opacity duration-200 ${loading ? "opacity-90" : "opacity-100"}`}>
              <div className="px-6 py-4 bg-white/5 flex items-center gap-3">
                {loading && <span className="inline-block size-2 rounded-full bg-sky-400 animate-pulse" aria-hidden />}
                {err ? (
                  <p className="text-red-400">에러: {err}</p>
                ) : (
                  <p className="text-neutral-300">
                    총 <span className="font-semibold text-neutral-100">{filtered.length}</span>건
                  </p>
                )}
              </div>

              <table className="w-full text-sm text-left text-neutral-300">
                <thead className="text-xs uppercase bg-neutral-800 text-neutral-400">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">사용자</th>
                    {/* ✅ 타입 대신 Study Key 표시 */}
                    <th className="px-6 py-3">Study Key</th>
                    <th className="px-6 py-3">액션</th>
                    <th className="px-6 py-3">변경 내용</th>
                    <th className="px-6 py-3">생성 시간</th>
                    <th className="px-6 py-3">수정 시간</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-800">
                  <AnimatePresence initial={false}>
                    {!err &&
                      filtered.map((log) => {
                        const aBadge = getActionTypeInfo(log.actionType);
                        const originalFull = [log.originalTitle, log.originalContent].filter(Boolean).join(" - ");
                        const newFull = [log.newTitle, log.newContent].filter(Boolean).join(" - ");
                        const annotationRow = isAnnotationType(log.commentType);

                        return (
                          <motion.tr
                            key={`${log.logId}-${log.updatedAt}`}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                            className="bg-neutral-900 hover:bg-neutral-800/50"
                          >
                            <td className="px-6 py-4 font-medium text-neutral-100 whitespace-nowrap break-keep min-w-[56px]">
                              {log.logId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap break-keep min-w-[96px]">
                              {log.userId}
                            </td>
                            {/* ✅ Study Key 값 출력 */}
                            <td className="px-6 py-4 whitespace-nowrap break-keep min-w-[100px]">
                              {log.studyKey}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap break-keep min-w-[96px]">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none whitespace-nowrap break-keep ${aBadge.className}`}>
                                {aBadge.text}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {annotationRow ? (
                                <button
                                  type="button"
                                  onClick={() => openAnnotationModal(log)}
                                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 
                                             bg-neutral-800/60 hover:bg-neutral-700 
                                             text-sky-300 hover:text-sky-200 
                                             text-sm font-medium transition-colors"
                                  title="Annotation 상세 보기"
                                >
                                  자세히 보기
                                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path d="M12.293 4.293a1 1 0 0 1 1.414 0L18 8.586a2 2 0 0 1 0 2.828l-4.293 4.293a1 1 0 0 1-1.414-1.414L14.586 12H4a1 1 0 1 1 0-2h10.586l-2.293-2.293a1 1 0 0 1 0-1.414z" />
                                  </svg>
                                </button>
                              ) : (
                                <span className="text-neutral-100 break-keep">{newFull || originalFull}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap break-keep min-w-[144px]">
                              {log.createdAt}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap break-keep min-w-[144px]">
                              {log.updatedAt || "-"}
                            </td>
                          </motion.tr>
                        );
                      })}
                  </AnimatePresence>

                  {!loading && !err && filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {loading && (
                <div className="pointer-events-none absolute inset-0 bg-neutral-900/20 backdrop-blur-[1px]" />
              )}
            </div>

            <div className="flex justify-center my-4">
              {hasMore && !loading && !err && (
                <Button onClick={loadMore} className="bg-neutral-700 hover:bg-neutral-600">
                  더 불러오기
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <AnnotationModal
          open={!!modalOpen && !!modalData}
          data={modalData as AnnotationModalData}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default LogsViewReadOnly;
