import { init as coreInit } from "@cornerstonejs/core";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";
import { init as toolsInit, addTool } from "@cornerstonejs/tools";
import {
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
} from "@cornerstonejs/tools";

let ready = false;

export async function ensureCornerstoneReady() {
  if (ready) return;
  await coreInit();
  await dicomImageLoaderInit({ maxWebWorkers: 2 });
  await toolsInit();

  // 툴 전역 등록
  // 조작 툴
  addTool(PanTool);
  addTool(ZoomTool);
  addTool(StackScrollTool);
  addTool(WindowLevelTool);

  // 주석 툴
  addTool(ArrowAnnotateTool);
  addTool(LengthTool);
  addTool(RectangleROITool);
  addTool(EllipticalROITool);
  addTool(AngleTool);
  addTool(ProbeTool);
  addTool(BidirectionalTool);

  ready = true;
}

