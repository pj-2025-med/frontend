import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DicomViewer from '@/components/DicomViewer/DicomViewer'
import { useParams } from "react-router";

export default function Viewer() {
    const { studyKey } = useParams();
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <DicomViewer studyKey = {studyKey ?? ''}/>
        </div>
    );
}

