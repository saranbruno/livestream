import { useCallback, useEffect, useRef, useState } from "react";
import { LiveChunk, useSocketViewer } from "../hooks/useSocketViewer";

export default function Viewer() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);

    const msOpenRef = useRef(false);
    const mimeRef = useRef<string | null>(null);

    const queueRef = useRef<ArrayBuffer[]>([]);
    const [queueSize, setQueueSize] = useState(0);

    const processingRef = useRef(false);

    const ensureSourceBuffer = useCallback((mime: string) => {
        if (sourceBufferRef.current) return true;

        const ms = mediaSourceRef.current;
        if (!ms || ms.readyState !== "open") return false;

        if (!MediaSource.isTypeSupported(mime)) return false;

        sourceBufferRef.current = ms.addSourceBuffer(mime);
        return true;
    }, []);

    const pump = useCallback(() => {
        const ms = mediaSourceRef.current;
        const sb = sourceBufferRef.current;

        if (!ms || ms.readyState !== "open") return;
        if (!sb || sb.updating) return;
        if (processingRef.current) return;
        if (queueRef.current.length === 0) return;

        processingRef.current = true;

        const buf = queueRef.current.shift()!;
        setQueueSize(queueRef.current.length);

        try {
            sb.appendBuffer(new Uint8Array(buf));
        } catch (e) {
            processingRef.current = false;
            return;
        }

        sb.addEventListener(
            "updateend",
            () => {
                processingRef.current = false;
                pump();
            },
            { once: true }
        );
    }, []);

    const { isOnline } = useSocketViewer("livedobruno", (chunkData: LiveChunk) => {
        const mime = chunkData.meta.mimeType;

        if (!mimeRef.current) mimeRef.current = mime;

        if (msOpenRef.current && !sourceBufferRef.current) {
            const ok = ensureSourceBuffer(mimeRef.current);
            if (!ok) return;
        }

        queueRef.current.push(chunkData.buffer);
        setQueueSize(queueRef.current.length);

        const v = videoRef.current;
        if (v && v.paused) {
            v.play().catch(() => { });
        }

        pump();
    });

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const ms = new MediaSource();
        mediaSourceRef.current = ms;

        const url = URL.createObjectURL(ms);
        video.src = url;

        const onOpen = () => {
            msOpenRef.current = true;
            if (mimeRef.current && !sourceBufferRef.current) {
                const ok = ensureSourceBuffer(mimeRef.current);
                if (ok) pump();
            }
        };

        const onClose = () => {
            msOpenRef.current = false;
            sourceBufferRef.current = null;
        };

        ms.addEventListener("sourceopen", onOpen);
        ms.addEventListener("sourceclose", onClose);

        return () => {
            msOpenRef.current = false;
            sourceBufferRef.current = null;
            ms.removeEventListener("sourceopen", onOpen);
            ms.removeEventListener("sourceclose", onClose);
            if (ms.readyState === "open") {
                try {
                    ms.endOfStream();
                } catch { }
            }
            URL.revokeObjectURL(url);
        };
    }, [ensureSourceBuffer, pump]);

    const enableAudio = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = false;
        v.play().catch(() => { });
    };

    return (
        <div>
            <h2>Viewer Live</h2>
            <button onClick={enableAudio}>Ativar áudio</button>
            <video ref={videoRef} autoPlay muted playsInline controls width="800" />
            <p>Chunks na fila: {queueSize}</p>
            <p>Online: {isOnline ? "true" : "false"}</p>
        </div>
    );
}
