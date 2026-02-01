import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import { LiveChunk, useSocketViewer } from "../../hooks/useSocketViewer";
import { useParams } from "react-router-dom";

export default function Viewer() {
    const { room } = useParams<{ room: string }>();

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
        } catch {
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

    const { isOnline } = useSocketViewer(room!, (chunkData: LiveChunk) => {
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

    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#2b1f42",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 960,
                    bgcolor: "#14141a",
                    borderRadius: 3,
                    p: 3,
                    border: "1px solid rgba(138, 43, 226, 0.15)"
                }}
            >
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ color: "#fff" }} fontSize={18} fontWeight={600}>
                            Livestream
                        </Typography>

                        <Chip
                            icon={
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                    }}
                                >
                                    <CircleIcon
                                        sx={{
                                            fontSize: 10,
                                            fill: isOnline ? "#8a2be2" : "#555",
                                        }}
                                    />
                                </Box>
                            }
                            label={isOnline ? "AO VIVO" : "OFFLINE"}
                            sx={{
                                bgcolor: "transparent",
                                color: isOnline ? "#c9a7ff" : "#777",
                                border: "1px solid",
                                borderColor: isOnline
                                    ? "rgba(138,43,226,0.5)"
                                    : "rgba(255,255,255,0.15)",
                            }}
                        />
                    </Stack>

                    {isOnline ? (
                        <Box
                            sx={{
                                width: "100%",
                                aspectRatio: "16 / 9",
                                bgcolor: "black",
                                borderRadius: 2,
                                overflow: "hidden"
                            }}
                        >
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                controls
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain"
                                }}
                            />
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                width: "100%",
                                aspectRatio: "16 / 9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "#0b0b0f",
                                borderRadius: 2,
                                border: "1px dashed rgba(138, 43, 226, 0.25)"
                            }}
                        >
                            <Typography color="#777">
                                A live não está online no momento
                            </Typography>
                        </Box>
                    )}

                    <Typography
                        fontSize={12}
                        color="#666"
                        textAlign="right"
                    >
                        Chunks na fila: {queueSize}
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
