// src/pages/UserInfoAdmin.tsx
import * as React from "react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UserRow = {
  userId: string;
  userName: string;
  email: string;
  createdYear: number; // 생성년도(예: 2025)
};

const baseUrl = import.meta.env.VITE_BASE_URL;

const API_BASE = `${baseUrl}/api`;

// 하이라이트 유틸
function highlight(text: string, keyword: string) {
  if (!keyword.trim()) return text;
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "gi");
  const parts = text.split(re);
  const matches = text.match(re);
  if (!matches) return text;
  const out: React.ReactNode[] = [];
  parts.forEach((p, i) => {
    out.push(p);
    if (i < parts.length - 1) {
      out.push(
        <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">
          {matches[i]}
        </mark>
      );
    }
  });
  return <>{out}</>;
}

const UserInfoAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 검색/필터 (디바운스)
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setQ(qInput), 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [qInput]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.userId.toLowerCase().includes(s) ||
        r.userName.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        String(r.createdYear).includes(s)
    );
  }, [rows, q]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/showAll`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `조회 실패: ${res.status} ${res.statusText}`);
      }
      const data: UserRow[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message ?? "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="fixed inset-0 bg-neutral-900 text-neutral-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">회원정보 관리</h1>
          <div className="flex items-center gap-2">
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="검색: 아이디/이름/이메일/년도"
              className="w-72 h-10 bg-neutral-800 border-neutral-700 placeholder:text-neutral-500"
            />
            <Button
              onClick={fetchAll}
              className="h-10 bg-sky-500 hover:bg-sky-600"
              disabled={loading}
            >
              {loading ? "새로고침..." : "새로고침"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="h-10 bg-white text-black hover:bg-gray-200"
            >
              뒤로가기
            </Button>
          </div>
        </div>

        {err && (
          <div className="rounded-md border border-red-800/60 bg-red-900/20 p-3 text-sm text-red-300">
            {err}
          </div>
        )}

        <Card className="bg-neutral-900 border border-neutral-800 shadow-none">
          <CardHeader className="border-b border-neutral-800">
            <CardTitle className="text-base">
              전체 회원 목록
              {q.trim() && (
                <span className="ml-2 text-xs text-neutral-400">
                  (검색어: <b className="text-neutral-200">{q}</b>)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-800/60 text-neutral-300">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">아이디</th>
                  <th className="px-4 py-3 text-left font-medium">이름</th>
                  <th className="px-4 py-3 text-left font-medium">이메일</th>
                  <th className="px-4 py-3 text-left font-medium">생성년도</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-neutral-400"
                    >
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}

                {filtered.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-t border-neutral-800 hover:bg-neutral-800/30"
                  >
                    {/* 아이디 */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono">
                        {highlight(row.userId, q)}
                      </div>
                    </td>

                    {/* 이름 */}
                    <td className="px-4 py-3 align-top">
                      <span>{highlight(row.userName, q)}</span>
                    </td>

                    {/* 이메일 */}
                    <td className="px-4 py-3 align-top">
                      <span className="text-neutral-300">
                        {highlight(row.email, q)}
                      </span>
                    </td>

                    {/* 생성년도 */}
                    <td className="px-4 py-3 align-top">
                      <span>{highlight(String(row.createdYear ?? "-"), q)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserInfoAdmin;
