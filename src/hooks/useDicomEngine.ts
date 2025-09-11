import { useState, useEffect, useRef } from 'react';
import {
    RenderingEngine,
    //init as coreInit,
} from '@cornerstonejs/core';
//import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import {
    //init as toolsInit,
    addTool,
    ToolGroupManager,
    Enums as toolsEnums,
    PanTool,
    ZoomTool,
    StackScrollTool,
    WindowLevelTool,
    ArrowAnnotateTool,
    LengthTool,
    RectangleROITool,
    EllipticalROITool,
    AngleTool,
    ProbeTool,
    BidirectionalTool,
} from '@cornerstonejs/tools';
import { ensureCornerstoneReady } from './bootstrap';

const RENDERING_ENGINE_ID = 'rendering-engine';
//const VIEWPORT_ID = 'viewport';
const TOOLGROUP_ID = 'toolgroup';


// 초기화 (core/ tools/ engine/ toolgroup 생성)
export default function useDicomEngine() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const engineRef = useRef<RenderingEngine | null>(null);
    const [isReady, setIsReady] = useState(false);

    // 1) Cornerstone 초기화 (앱 생애주기 1회)
    useEffect(() => {
        let mounted = true;
        (async () => {
            await ensureCornerstoneReady();

            if (!mounted) return;

            // 렌더링 엔진 & 뷰포트
            const re = new RenderingEngine(RENDERING_ENGINE_ID);
            engineRef.current = re;
/*
            // 툴 등록
            addTool(PanTool);
            addTool(ZoomTool);
            addTool(StackScrollTool);
            addTool(WindowLevelTool);
            addTool(ArrowAnnotateTool);*/

            // 툴 그룹 생성/연결
            let tg = ToolGroupManager.getToolGroup(TOOLGROUP_ID);
            if (!tg) {
                tg = ToolGroupManager.createToolGroup(TOOLGROUP_ID)!;
            }

            // 조작 툴
            tg.addTool(PanTool.toolName);
            tg.addTool(ZoomTool.toolName);
            tg.addTool(StackScrollTool.toolName);
            tg.addTool(WindowLevelTool.toolName);

            // 주석 툴
            [
                ArrowAnnotateTool.toolName,
                LengthTool.toolName,
                RectangleROITool.toolName,
                EllipticalROITool.toolName,
                AngleTool.toolName,
                ProbeTool.toolName,
                BidirectionalTool.toolName,
            ].forEach((name) => tg.addTool(name));

            //tg.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);

            // 바인딩 (좌: 윈도우레벨 / 우: 줌 / Ctrl+좌: 팬 / 휠 : 스택)
            // 조작
            tg.setToolActive(WindowLevelTool.toolName, {
                bindings: [{ mouseButton: toolsEnums.MouseBindings.Primary }],
            });
            tg.setToolActive(PanTool.toolName, {
                bindings: [{
                    mouseButton: toolsEnums.MouseBindings.Primary,
                    modifierKey: toolsEnums.KeyboardBindings.Ctrl,
                }],
            });
            tg.setToolActive(ZoomTool.toolName, {
                bindings: [{ mouseButton: toolsEnums.MouseBindings.Secondary }],
            });

            // StackScrollTool 은 기본 동작(드래그 기반)을 사용
            tg.setToolActive(StackScrollTool.toolName, {
                bindings: [{ mouseButton: toolsEnums.MouseBindings.Wheel }],
            });

            // 주석(기본 passive)
            [
                ArrowAnnotateTool.toolName,
                LengthTool.toolName,
                RectangleROITool.toolName,
                EllipticalROITool.toolName,
                AngleTool.toolName,
                ProbeTool.toolName,
                BidirectionalTool.toolName,
            ].forEach((name) => tg.setToolPassive(name));

            // 화살표 주석 텍스트 입력 안함
            tg.setToolConfiguration(ArrowAnnotateTool.toolName, {
                getTextCallback: () => '',
                changeTextCallback: () => '',
            })

            setIsReady(true);
        })();

        return () => {
            mounted = false;
            try {
                engineRef.current?.destroy();
            } catch (err) {
                console.warn('렌더링 엔진 정리 중 오류 발생:', err);
            }
            engineRef.current = null;

            // try { ToolGroupManager.destroyToolGroup(TOOLGROUP_ID);} catch{}
            // 뷰어 생애주기에 맞춰 툴그룹 지우려면 주석해제
        };
    }, []);

    return {
        containerRef,
        engineRef,
        toolGroupId: TOOLGROUP_ID,
        //viewportId: VIEWPORT_ID,
        renderingEngineId: RENDERING_ENGINE_ID,
        isReady,
    };
}
