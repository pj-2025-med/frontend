import type { Types } from "@cornerstonejs/core";
import { useCallback } from "react";

// 시리즈 스택
export default function useSeriesStack(engineRef: React.MutableRefObject<any>) {
    const setStackToViewport = useCallback(async (imageIds: string[], viewportId: string) => {
        if (!engineRef.current) return;
        if (!Array.isArray(imageIds) || imageIds.length === 0) throw new Error('빈 imageIds');

        const re = engineRef.current;
        const vp = re.getViewport(viewportId) as Types.IStackViewport;
        await vp.setStack(imageIds, 0);
        vp.render();
    }, [engineRef]);

    return { setStackToViewport };
}
