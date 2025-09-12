import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import MetaData from './MetaData';
import useDicomEngine from '../../hooks/useDicomEngine';
import useSeriesStack from '../../hooks/useSeriesStack';
import { fetchStudy } from '../../services/dicomApi';
import { getOverlayHost, rebuildGridAndBindTools } from '../../layouts/grid';
import Toolbar from './Toolbar';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Layout = {
    rows: number,
    cols: number
}

type Props = {
    studyKey: string;
}

const RENDERING_ENGINE_ID = 'rendering-engine';
const TOOLGROUP_ID = 'toolgroup';

export default function DicomViewer({ studyKey }: Props) {
    const { containerRef, engineRef, renderingEngineId, toolGroupId, isReady } = useDicomEngine();
    const { setStackToViewport } = useSeriesStack(engineRef);

    const [layout, setLayout] = useState<Layout>({ rows: 1, cols: 1 });
    const [loading, setLoading] = useState(false);
    const [firstImgByVp, setFirstImgByVp] = useState<Record<string, string>>({});
    const [viewportId, setViewportId] = useState<string[]>([]);
    const [activeViewportId, setActiveViewportId] = useState<string | null>(null);
    const [selectedSeriesKey, setSelectedSeriesKey] = useState<number>(1);  // 기본 선택된 시리즈 키

    const [study, setStudy] = useState<any>(null);

    // 레이아웃 적용
    const applyLayout = (rows: number, cols: number) => {
        if (!engineRef.current || !containerRef.current) return;
        setLayout({ rows, cols });
        rebuildGridAndBindTools(
            engineRef.current,
            containerRef.current,
            { rows, cols },
            toolGroupId,
            renderingEngineId,
        );
        setFirstImgByVp({});
    };

    const buildGrid = useCallback(() => {
        if (!engineRef.current || !containerRef.current) return [] as string[];
        const vpIds = rebuildGridAndBindTools(
            engineRef.current,
            containerRef.current,
            layout,
            toolGroupId,
            renderingEngineId
        );
        setViewportId(vpIds);
        if (!activeViewportId && vpIds.length) setActiveViewportId(vpIds[0]);
        return vpIds;
    }, [engineRef, containerRef, layout, toolGroupId, renderingEngineId, activeViewportId]);

    const loadFromStart = useCallback(
        async (vpIdsParam?: string[]) => {
            if (!engineRef.current || !containerRef.current) return;
            setLoading(true);

            try {
                if (!study) return;  // Study 정보가 없으면 리턴
                const list = Array.isArray(study.series) ? study.series : [];
                if (!list.length) { console.error('시리즈 없음'); return; }

                const sorted = [...list].sort((a, b) => (a.seriesKey ?? 0) - (b.seriesKey ?? 0));
                const startIdx = sorted.findIndex(s => s.seriesKey === selectedSeriesKey);
                if (startIdx < 0) return;

                const vpIds = vpIdsParam && vpIdsParam.length ? vpIdsParam : buildGrid();
                if (!vpIds.length) return;

                const need = Math.min(layout.rows * layout.cols, vpIds.length, sorted.length - startIdx);

                const nextMap: Record<string, string> = {};

                for (let i = 0; i < need; i++) {
                    const vpId = vpIds[i];
                    const imageIds = sorted[startIdx + i].imageIds;
                    await setStackToViewport(imageIds, vpIds[i]);
                    nextMap[vpId] = imageIds[0];
                } 

                setFirstImgByVp(nextMap);
            } catch (e: any) {
                console.error('시리즈 로드 중 에러', e);
            } finally {
                setLoading(false);
            }
        }, [engineRef, containerRef, studyKey, layout.rows, layout.cols, selectedSeriesKey, buildGrid, setStackToViewport, study]
    );

    useEffect(() => {
        const loadStudyData = async () => {
            try {
                const fetchedStudy = await fetchStudy(studyKey);
                setStudy(fetchedStudy);
            } catch (e) {
                console.error('Study 정보 로드 중 오류 발생', e);
            }
        };
        loadStudyData();
    }, [studyKey]);

    useEffect(() => {
        if (!isReady || !engineRef.current || !containerRef.current) return;
        if (!study) return;

        const vpIds = buildGrid();
        const raf = requestAnimationFrame(() => loadFromStart(vpIds));
        return () => cancelAnimationFrame(raf);
    }, [isReady, studyKey, layout.rows, layout.cols, study]);

    // 시리즈 선택 시 로드
    useEffect(() => {
        if (study) {
            loadFromStart();
        }
    }, [selectedSeriesKey, study]);

    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-100 flex-1 flex flex-col">
            <Card className="m-4 sm:m-6 md:m-8 bg-neutral-900/60 border-neutral-800 shadow-none flex-1 flex flex-col">
                <CardHeader className="border-b border-neutral-800">
                    <CardTitle>MEDICONNECT 뷰어</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        {/* 레이아웃 선택 */}
                        <Select
                            value={`${layout.rows}x${layout.cols}`}
                            onValueChange={(val) => {
                                const [r, c] = val.split("x").map(Number);
                                applyLayout(r, c);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-[120px] bg-neutral-800 border-neutral-700">
                                <SelectValue placeholder="레이아웃" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100">
                                <SelectItem value="1x1">1x1</SelectItem>
                                <SelectItem value="2x2">2x2</SelectItem>
                                <SelectItem value="3x3">3x3</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* 시리즈 선택 */}
                        <Select
                            value={selectedSeriesKey.toString()}
                            onValueChange={(val) => setSelectedSeriesKey(Number(val))}
                        >
                            <SelectTrigger className="w-full md:w-[120px] bg-neutral-800 border-neutral-700">
                                <SelectValue placeholder="시리즈 선택" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100">
                                {study?.series?.map((series: any) => (
                                    <SelectItem key={series.seriesKey} value={series.seriesKey.toString()}>
                                        {`Series ${series.seriesKey}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-sm text-neutral-400 flex-1">
                            좌: 윈도우레벨 / Ctrl+좌: 팬 / 우: 줌 / 휠: 스택 스크롤
                        </span>

                        <Toolbar
                            toolGroupId={toolGroupId}
                            renderingEngineId={renderingEngineId}
                            viewportId={activeViewportId ?? viewportId[0]}
                            studyKey={studyKey}
                            seriesKey={selectedSeriesKey.toString()}  // 숫자 값을 문자열로 변환
                        />
                    </div>

                    <div
                        ref={containerRef}
                        onContextMenu={(e) => e.preventDefault()}
                        className="w-full h-full min-h-[1080px] grid overflow-hidden
                        rounded-xl border border-neutral-800
                        bg-neutral-800 gap-[2px]"
                        style={{
                            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                            gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                        }}
                    />
                </CardContent>
            </Card>

            {containerRef.current &&
                Object.entries(firstImgByVp).map(([vpId, imgId]) => {
                    const host = getOverlayHost(containerRef.current!, vpId);
                    return host
                        ? createPortal(<MetaData firstImageId={imgId} />, host, `meta-${vpId}`)
                        : null;
                })}
        </div>
    );
}
