// src/components/Register.tsx
import * as React from "react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlainDialog as Dialog,
  PlainDialogContent as DialogContent,
  PlainDialogTitle as DialogTitle,
} from "./PlainDialog";

/**
 * 회원가입 완료 시 상위에서 처리하고 싶다면 onSuccess 콜백을 prop으로 넘겨주세요.
 */

const baseUrl = import.meta.env.VITE_BASE_URL;

export interface RegisterProps {
  onSuccess?: (user: { userId: string; userName: string; email: string }) => void;
  /** 기본값: "http://localhost:8080/api/register" */
  registerEndpoint?: string;
}

const Register: React.FC<RegisterProps> = ({
  onSuccess,
  registerEndpoint = `${baseUrl}/api/register`,
}) => {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 성공 모달 상태
  const [successOpen, setSuccessOpen] = useState(false);

  // 간단한 유효성 검사
  const isValidEmail = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const canSubmit =
    userId.trim().length > 0 &&
    userName.trim().length > 0 &&
    isValidEmail(email) &&
    password.trim().length >= 6 &&
    !isLoading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setErr(null);

    try {
      const payload = {
        userId: userId.trim(),
        password: password, // 서버에서 해시 처리 가정
        userName: userName.trim(),
        email: email.trim(),
      };

      const res = await fetch(registerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `회원가입 실패: ${res.status} ${res.statusText}`);
      }

      onSuccess?.({
        userId: payload.userId,
        userName: payload.userName,
        email: payload.email,
      });

      // ✅ 성공 시: 모달 열기
      setSuccessOpen(true);
    } catch (e: any) {
      setErr(e?.message ?? "네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [canSubmit, email, onSuccess, password, registerEndpoint, userId, userName]);

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-neutral-900 text-neutral-100 flex items-center justify-center px-4">
        <Card className="bg-neutral-900 border border-neutral-800 shadow-none w-full max-w-md">
          <CardHeader className="border-b border-neutral-800">
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold">
                P+
              </div>
              <CardTitle className="tracking-tight">PACS+ 회원가입</CardTitle>
              <p className="text-sm text-neutral-400">
                아래 정보를 입력해 계정을 생성하세요
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* userId */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-200">아이디 (userId)</label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="예: doctorA"
                className="h-11 rounded-lg bg-neutral-800 border-neutral-700 placeholder:text-neutral-500"
                autoComplete="username"
              />
            </div>

            {/* userName */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-200">이름 (userName)</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="예: 홍길동"
                className="h-11 rounded-lg bg-neutral-800 border-neutral-700 placeholder:text-neutral-500"
                autoComplete="name"
              />
            </div>

            {/* email */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-200">이메일 (email)</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="you@example.com"
                className={`h-11 rounded-lg bg-neutral-800 border-neutral-700 placeholder:text-neutral-500 ${
                  email && !isValidEmail(email) ? "border-red-600" : ""
                }`}
                autoComplete="email"
              />
              {email && !isValidEmail(email) && (
                <p className="text-xs text-red-400">올바른 이메일 형식이 아닙니다.</p>
              )}
            </div>

            {/* password */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-200">비밀번호 (password)</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="최소 6자 이상"
                className={`h-11 rounded-lg bg-neutral-800 border-neutral-700 placeholder:text-neutral-500 ${
                  password && password.length < 6 ? "border-red-600" : ""
                }`}
                autoComplete="new-password"
              />
              {password && password.length < 6 && (
                <p className="text-xs text-red-400">비밀번호는 최소 6자 이상이어야 합니다.</p>
              )}
            </div>

            {/* 에러 메시지 */}
            {err && (
              <div className="rounded-md border border-red-800/60 bg-red-900/20 p-3 text-sm text-red-300">
                {err}
              </div>
            )}

            {/* 회원가입 버튼 */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-11 w-full rounded-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800"
            >
              {isLoading ? "처리 중..." : "회원가입"}
            </Button>

            {/* ▶ 추가: 회원정보 보기 버튼 (현재 입력값으로 모달 오픈) */}
            <Button
            type="button"
            onClick={() =>
                navigate("/userinfo", {
                state: { userId, userName, email, password },
                })
            }
            className="h-10 w-full rounded-full bg-neutral-800 hover:bg-neutral-700"
            >
            회원정보 보기
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ✅ 회원가입 성공/미리보기 모달 */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <DialogTitle className="text-lg font-bold">회원정보</DialogTitle>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="w-20 text-neutral-400">아이디:</span>
                <span className="text-white break-all">{userId}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-20 text-neutral-400">이름:</span>
                <span className="text-white break-all">{userName}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-20 text-neutral-400">이메일:</span>
                <span className="text-white break-all">{email}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-20 text-neutral-400">비밀번호:</span>
                <span className="text-white break-all">
                  {"•".repeat(Math.max(password.length, 6))}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setSuccessOpen(false)}
                className="bg-white text-black hover:bg-gray-200"
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Register;
