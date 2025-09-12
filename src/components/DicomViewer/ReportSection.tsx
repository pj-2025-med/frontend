import * as React from "react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type{ CommentRow } from "@/components/types";

interface CommentSectionProps {
  studyKey: number;
  comments: CommentRow[];
  isLoading: boolean;
  onAddComment: (title: string, content: string) => Promise<void>;
  onUpdateComment: (commentId: number, title: string, content: string, original: CommentRow) => Promise<void>;
  onDeleteComment: (commentId: number, comment: CommentRow) => Promise<void>;
}

export const ReportSection: React.FC<CommentSectionProps> = ({
  studyKey,
  comments,
  isLoading,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}) => {
  const [commentTitle, setCommentTitle] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const submitComment = useCallback(async () => {
    const title = commentTitle.trim();
    const content = commentBody.trim();
    if (!title || !content) return;

    setIsPosting(true);
    try {
      await onAddComment(title, content);
      setCommentTitle("");
      setCommentBody("");
    } catch (e) {
      console.error(e);
      // 사용자에게 에러를 표시하는 로직을 여기에 추가할 수 있습니다.
    } finally {
      setIsPosting(false);
    }
  }, [onAddComment, commentTitle, commentBody]);

    // --- Edit State ---
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [original, setOriginal] = useState<CommentRow | null>(null);
  const handleStartEdit = (comment: CommentRow) => {
    setEditingCommentId(comment.commentId);
    setEditingTitle(comment.commentTitle);
    setEditingContent(comment.commentContent);
    setOriginal(comment);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingTitle("");
    setEditingContent("");
  };

  const handleSaveEdit = async () => {
    if (editingCommentId === null || !editingTitle.trim() || !editingContent.trim() || original === null) return;
    setIsUpdating(true);
    try {
      await onUpdateComment(editingCommentId, editingTitle, editingContent, original);
      handleCancelEdit();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (commentId: number, comment: CommentRow) => {
    if (window.confirm("정말로 이 코멘트를 삭제하시겠습니까?")) {
      await onDeleteComment(commentId, comment);
    }
  };

  return (
    <section id="comments" className="mt-4">
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60">
      <div className="border-b border-neutral-800 px-6 py-4">
        <h3 className="text-center font-semibold">
          코멘트 <span className="text-neutral-400">(Study Key: {studyKey})</span>
        </h3>
      </div>

      {/* 🔄 기존 grid 두 컬럼 → 한 컬럼 또는 좌측만 사용 */}
      <div className="p-6">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
          {/* ✅ 새 코멘트 작성 영역을 '위'로 이동 */}
          <div className="border-b border-neutral-800 p-4 sticky top-0 bg-neutral-900/70 backdrop-blur">
            <p className="mb-3 text-sm text-neutral-400">새 코멘트</p>
            <Input
              value={commentTitle}
              onChange={(e) => setCommentTitle(e.target.value)}
              placeholder="제목"
              className="mb-3 bg-neutral-800 border-neutral-700 placeholder:text-neutral-500"
            />
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={4}
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-neutral-500"
            />
            <div className="mt-3 flex justify-end">
              <Button
                onClick={submitComment}
                disabled={isPosting || !commentTitle.trim() || !commentBody.trim()}
                className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800"
              >
                {isPosting ? "등록 중..." : "등록"}
              </Button>
            </div>
          </div>

          {/* ⬇️ 기존 코멘트 리스트는 '아래'로 */}
          {isLoading ? (
            <div className="py-10 text-center text-neutral-500">코멘트를 불러오는 중입니다...</div>
          ) : comments.length > 0 ? (
            <ul className="space-y-4 p-4">
              {comments.map((comment) =>
                editingCommentId === comment.commentId ? (
                  // --- Edit Mode ---
                  <li key={comment.commentId} className="rounded-xl border border-sky-500 p-4">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      placeholder="제목"
                      className="mb-3 bg-neutral-800 border-neutral-700 placeholder:text-neutral-500"
                    />
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      placeholder="내용"
                      rows={4}
                      className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-neutral-500"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="ghost" onClick={handleCancelEdit}>취소</Button>
                      <Button onClick={handleSaveEdit} disabled={isUpdating} className="bg-sky-500 hover:bg-sky-600">
                        {isUpdating ? "저장 중..." : "저장"}
                      </Button>
                    </div>
                  </li>
                ) : (
                  // --- View Mode ---
                  <li key={comment.commentId} className="rounded-xl border border-white p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-neutral-100">{comment.commentTitle}</p>
                        <span className="text-xs text-neutral-500">by {comment.userId}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleStartEdit(comment)}>수정</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-400"
                          onClick={() => handleDelete(comment.commentId, comment)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-neutral-300 whitespace-pre-wrap">
                      {comment.commentContent}
                    </p>
                    <div className="mt-3 text-right text-xs text-neutral-500 space-y-1">
                      <p>생성: {comment.createdAt}</p>
                      <p>수정: {comment.updatedAt}</p>
                    </div>
                  </li>
                )
              )}
            </ul>
          ) : (
            <div className="py-10 text-center text-neutral-500">코멘트가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  </section>
  );
};

