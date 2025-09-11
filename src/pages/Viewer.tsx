import DicomViewer from '@/components/DicomViewer/DicomViewer';
import { useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MessageSquare } from "lucide-react";
import ReportPanel from '@/components/DicomViewer/ReportPanel';

export default function Viewer() {
    // 라우터 파라미터: 문자열로 받고, 필요한 곳만 숫자로 변환
    const { studyKey: studyKeyParam } = useParams<{ studyKey: string }>();
    const studyKeyStr = studyKeyParam ?? "";
    const studyKeyNum = Number(studyKeyStr) || 0;

    const [openReport, setOpenReport] = useState(false);

    return (
        <div className="w-screen h-screen flex flex-col bg-neutral-950 text-neutral-100">
            {/* 페이지 헤더 */}
            <header className="flex items-center gap-3 px-4 sm:px-6 md:px-8 h-14 border-b border-neutral-800 bg-neutral-900/70 backdrop-blur">
                <Button
                    size="icon"
                    className="text-neutral-300"
                    onClick={() => history.back()}
                    aria-label="뒤로가기"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-base sm:text-lg font-semibold tracking-tight">
                    MEDICON 뷰어
                </h1>
                <div className="ml-auto text-xs text-neutral-400">
                    Study: {studyKeyNum || "-"}
                </div>
            </header>

            {/* 본문 */}
            <main className="flex h-[calc(100vh-56px)] w-full">
                {/* 뷰어 영역 */}
                
                    <section className="relative flex-1 min-w-0 overflow-hidden">
          <DicomViewer studyKey={studyKeyStr} />
        </section>

                    {/* ▶ 세로 버튼 바 (헤더 아래 · 뷰어 오른쪽) */}
                    <nav
                        role="toolbar"
                        aria-orientation="vertical"
                        className="absolute right-4 top-4 z-20 w-20 rounded-2xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-2 shadow-lg flex flex-col items-stretch gap-2"
                    >
                        <Button
                            className={`flex flex-col items-center gap-1 py-3 text-neutral-200 hover:bg-neutral-800/60 focus-visible:ring-neutral-700 ${openReport ? "bg-neutral-800/60" : ""
                                }`}
                            onClick={() => setOpenReport(v => !v)}
                            aria-expanded={openReport}
                            aria-controls="comment-panel"
                            aria-label="코멘트 패널 토글"
                        >
                            <MessageSquare className="h-5 w-5" />
                            <span className="text-[11px] leading-none">코멘트</span>
                        </Button>

                        {/* 필요하면 여기에 다른 버튼도 추가해서 세로로 쌓으면 됨 */}
                    </nav>

                {/* 사이드 코멘트 패널: 닫힐 때는 width=0 으로 공간 비차지 */}
                <aside
                    id="report-panel"
                    className={`h-full border-l border-neutral-800 bg-neutral-900 transition-[width] duration-300 ease-in-out overflow-hidden ${openReport ? "w-[440px]" : "w-0"
                        }`}
                    aria-hidden={!openReport}
                >
                    {openReport && (
                        <ReportPanel
                            open={openReport}
                            onClose={() => setOpenReport(false)}
                            studyKey={studyKeyNum}
                            defaultWidth={440}
                        />
                    )}
                </aside>
            </main>
        </div>
    );
}

