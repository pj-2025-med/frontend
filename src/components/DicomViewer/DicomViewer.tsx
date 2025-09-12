import DicomViewer from '@/components/DicomViewer/DicomViewer';
import { useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MessageSquare } from "lucide-react";
import ReportPanel from '@/components/DicomViewer/ReportPanel';

export default function Viewer() {
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
                <img
                    src="/medicon-icon.png"  // 로고 이미지 경로
                    alt="MEDICON 로고"
                    className="h-8 w-auto"  // 로고 크기 조정
                />
                <h1 className="text-base sm:text-lg font-semibold tracking-tight">
                    MEDICON
                </h1>
                <div className="ml-auto text-xs text-neutral-400">
                    Study: {studyKeyNum || "-"}
                </div>
            </header>

            {/* 본문 */}
            <main className="relative h-[calc(100vh-56px)] w-full overflow-hidden">
                {/* 뷰어: 항상 화면 꽉 채우기 */}
                <section className="absolute inset-0">
                    <DicomViewer studyKey={studyKeyStr} />
                </section>

                {/* 닫혀 있을 때 열기 런처(작은 탭) */}
                {!openReport && (
                    <button
                        onClick={() => setOpenReport(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-30
                            rounded-l-md bg-neutral-900/80 border border-neutral-800 px-2 py-3
                            hover:bg-neutral-800/80 focus:outline-none"
                        aria-label="코멘트 패널 열기"
                    >
                        <MessageSquare className="h-5 w-5 text-neutral-200" />
                    </button>
                )}

                {/* 툴바 + 패널을 한 컨테이너로 묶어서 같이 슬라이드 */}
                <div
                    className={[
                        "absolute right-0 top-0 z-30 h-full flex items-stretch",
                        "transition-transform duration-300 ease-in-out",
                        openReport ? "translate-x-0" : "translate-x-full", // 패널이 열릴 때 툴바와 함께 사라짐
                    ].join(" ")}
                    aria-hidden={!openReport}
                >
                    {/* 세로 툴바 (패널과 함께 이동) */}
                    {!openReport && (  // 툴바가 열려있을 때는 숨김
                        <nav
                            role="toolbar"
                            aria-orientation="vertical"
                            className="w-16 shrink-0 border-l border-neutral-800
                                bg-neutral-900/80 backdrop-blur p-2
                                flex flex-col items-stretch gap-2 absolute bottom-0 right-0 w-full rounded-l-lg rounded-t-lg"
                        >
                            <Button
                                className="flex flex-col items-center gap-1 py-3 text-neutral-200
                                hover:bg-neutral-800/60 focus-visible:ring-neutral-700"
                                onClick={() => setOpenReport(false)}
                                aria-label="코멘트 패널 닫기"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                <span className="text-[11px] leading-none">닫기</span>
                            </Button>

                            {/* 필요시 다른 버튼 추가 */}
                            <Button
                                variant="secondary"
                                className="flex flex-col items-center gap-1 py-3"
                                onClick={() => {/* 예: 다른 기능 */ }}
                            >
                                <MessageSquare className="h-5 w-5" />
                                <span className="text-[11px] leading-none">코멘트</span>
                            </Button>
                        </nav>
                    )}

                    {/* 패널 본체 */}
                    <aside
                        id="report-panel"
                        className="h-full w-[440px] border-l border-neutral-800
                            bg-neutral-900/95 backdrop-blur overflow-hidden"
                    >
                        <ReportPanel
                            open={openReport}
                            onClose={() => setOpenReport(false)}
                            studyKey={studyKeyNum}
                            defaultWidth={440}
                        />
                    </aside>
                </div>
            </main>
        </div>
    );
}
