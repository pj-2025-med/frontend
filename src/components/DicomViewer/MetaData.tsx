import { useEffect, useState } from 'react';
import { metaData } from '@cornerstonejs/core';

interface Props {
    firstImageId?: string;
}
export default function MetaData({ firstImageId }: Props) {
    const [info, setInfo] = useState<any>(null);

    useEffect(() => {
        if (!firstImageId) return;
        // Cornerstone 메타데이터 모듈 키 사용
        const patient = metaData.get('patientModule', firstImageId);
        const study = metaData.get('generalStudyModule', firstImageId);
        const series = metaData.get('generalSeriesModule', firstImageId);
        const plane = metaData.get('imagePlaneModule', firstImageId);

        setInfo({
            //patient
            patientName: patient?.patientName,
            patientID: patient?.patientID,
            sex: patient?.patientSex,
            birthDate: patient?.patientBirthDate,

            //study
            studyDesc: study?.studyDescription,

            //series
            modality: series?.modality,
            seriesDesc: series?.seriesDescription,

            //plane
            pixelSpacing: plane?.pixelSpacing,
            sliceThickness: plane?.sliceThickness,
        });

        /*
        const p = metaData.get('patientModule', firstImageId);
        const s = metaData.get('generalStudyModule', firstImageId);
        const ser = metaData.get('generalSeriesModule', firstImageId);
        console.log({p, s, ser});*/
        
    }, [firstImageId]);

    if (!info) return null;
    /*
    return (
        <div style={{
            position: 'absolute', top: 10, left: 10, color: '#fff',
            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.4,
            textShadow: '0 0 4px black',
        }}>
            <div>{info.patientID}</div>
            <div>{info.patientName}</div>
            <div>{info.birthDate} {info.sex}</div>
            <div>{info.modality} · {info.studyDesc} · {info.seriesDesc}</div>
            <div>pxSpacing: {info.pixelSpacing?.join?.('×')} · thick: {info.sliceThickness}</div>
        </div>
    );*/
    return (
  <div className="absolute top-2 left-2 z-10 pointer-events-none">
    <div className="
      font-mono text-xs leading-4 text-neutral-100
      bg-black/40 backdrop-blur-[2px]
      border border-neutral-800 rounded-md
      px-2 py-1.5
      drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]
    ">
      <div>{info.patientID ?? "-"}</div>
      <div className="truncate max-w-[240px]">{info.patientName ?? "-"}</div>
      <div>{info.birthDate ?? "-"} {info.sex ?? "-"}</div>
      <div className="truncate max-w-[280px]">
        {info.modality ?? "-"} · {info.studyDesc ?? "-"} · {info.seriesDesc ?? "-"}
      </div>
      {/*
      <div>
        pxSpacing: {spacing} · thick: {info.sliceThickness ?? "-"}mm
      </div> */}
    </div>
  </div>
);
}
