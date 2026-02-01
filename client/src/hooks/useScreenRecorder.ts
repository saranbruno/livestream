import { useCallback, useEffect, useRef, useState } from "react";

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
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    const chunksRef = useRef<Blob[]>([]);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    const onChunkRef = useRef(onChunk);
    useEffect(() => {
        onChunkRef.current = onChunk;
    }, [onChunk]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            
            streamRef.current = stream;
            setMediaStream(stream);

            const chosen = pickMimeTypeWithAudio();
            const options = chosen ? { mimeType: chosen } : undefined;
            const recorder = new MediaRecorder(stream, options);
            
            recorderRef.current = recorder;
            chunksRef.current = [];
            setVideoUrl(undefined);

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                    onChunkRef.current?.({ 
                        blob: e.data, 
                        mimeType: recorder.mimeType || "video/webm" 
                    });
                }
            };

            recorder.onstop = () => {
                const fullBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
                setVideoUrl(URL.createObjectURL(fullBlob));
                chunksRef.current = [];
                setIsRecording(false);
                setMediaStream(null);

                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                recorderRef.current = null;
            };

            stream.getVideoTracks()[0].onended = () => {
                recorder.stop();
            };

            recorder.start(500);
            setIsRecording(true);
        } catch (err) {
            console.error("Erro ao iniciar gravação:", err);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
        }
    }, []);

    return { isRecording, startRecording, stopRecording, videoUrl, mediaStream };
}