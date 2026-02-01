import { useCallback, useRef, useState } from "react";

type OnChunk = (chunk: { blob: Blob; mimeType: string }) => void;

function pickMimeTypeWithAudio() {
    const candidates = [
        'video/webm; codecs="vp8,opus"',
        'video/webm; codecs="vp9,opus"',
        "video/webm",
    ];

    for (const t of candidates) {
        if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
}

export default function useScreenRecorder(onChunk?: OnChunk) {
    const [isRecording, setIsRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string>();

    const chunksRef = useRef<Blob[]>([]);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async () => {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        streamRef.current = stream;

        const chosen = pickMimeTypeWithAudio();
        const recorder = chosen ? new MediaRecorder(stream, { mimeType: chosen }) : new MediaRecorder(stream);
        recorderRef.current = recorder;

        chunksRef.current = [];
        setVideoUrl(undefined);

        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunksRef.current.push(e.data);
                onChunk?.({ blob: e.data, mimeType: recorder.mimeType || "video/webm" });
            }
        };

        recorder.onstop = () => {
            const fullBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
            setVideoUrl(URL.createObjectURL(fullBlob));
            chunksRef.current = [];
            setIsRecording(false);

            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            recorderRef.current = null;
        };

        recorder.start(1000);
        setIsRecording(true);
    }, [onChunk]);

    const stopRecording = useCallback(() => {
        recorderRef.current?.stop();
    }, []);

    return { isRecording, startRecording, stopRecording, videoUrl };
}
