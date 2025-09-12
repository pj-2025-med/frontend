//import * as React from "react";
import { useCallback, useEffect, useState } from "react";
//import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReportSection } from "./ReportSection";
import type { CommentRow } from "@/components/types";
import {
  fetchComments as apiFetchComments,
  postComment as apiPostComment,
  updateComment as apiUpdateComment,
  deleteComment as apiDeleteComment,
} from "@/components/api";

type Props = {
  open: boolean;
  onClose: () => void;
  studyKey: number;
  defaultWidth?: number;
};

export default function ReportPanel({
  open,
  onClose,
  studyKey,
  defaultWidth = 420,
}: Props) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false); // 등록/수정/삭제 중 중복 방지

  const refetch = useCallback(async () => {
    if (!studyKey) return;
    setIsLoading(true);
    try {
      const data = await apiFetchComments(studyKey);
      setComments(data);
    } finally {
      setIsLoading(false);
    }
  }, [studyKey]);

  // 모달 열릴 때마다 최신 데이터 로드
  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  const onAddComment = useCallback(
    async (title: string, content: string) => {
      if (busy) return;
      setBusy(true);
      try {
        await apiPostComment(studyKey, title, content);
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [busy, studyKey, refetch]
  );

  const onUpdateComment = useCallback(
    async (commentId: number, title: string, content: string, original: CommentRow) => {
      if (busy) return;
      setBusy(true);
      try {
        await apiUpdateComment(studyKey, commentId, title, content, original);
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [busy, studyKey, refetch]
  );

  const onDeleteComment = useCallback(
    async (commentId: number, comment: CommentRow) => {
      if (busy) return;
      setBusy(true);
      try {
        await apiDeleteComment(studyKey, commentId, comment);
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [busy, studyKey, refetch]
  );

  return (
    <aside
      className={[
        "relative h-full border-l border-neutral-800 bg-neutral-950/90 backdrop-blur",
        "transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
      style={{ width: defaultWidth, minWidth: 360 }}
      aria-hidden={!open}
    >
      {/* 상단 바 */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="text-sm font-semibold">
          코멘트 <span className="ml-1 text-xs text-neutral-400">(Study Key: {studyKey})</span>
        </div>
        <Button size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>

      {/* 스크롤 영역 */}
      <div className="h-[calc(100%-44px)] overflow-auto">
        <ReportSection
          studyKey={studyKey}
          comments={comments}
          isLoading={isLoading}
          onAddComment={onAddComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      </div>
    </aside>
  );
}


