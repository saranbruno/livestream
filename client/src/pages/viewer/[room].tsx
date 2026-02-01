import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import { io, Socket } from "socket.io-client";
import { useParams } from "react-router-dom";

type ChunkMeta = { id: string; room: string; mimeType: string };
type LiveChunk = { meta: ChunkMeta; buffer: ArrayBuffer };

export default function Viewer() {
    const { room } = useParams<{ room: string }>();
    const [isOnline, setIsOnline] = useState(false);
    const [debugInfo, setDebugInfo] = useState("Conectando...");
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    
    const queueRef = useRef<ArrayBuffer[]>([]);
    const isInitRef = useRef(false);
    const isProcessingRef = useRef(false);

    const pump = () => {
        const sb = sourceBufferRef.current;
        const ms = mediaSourceRef.current;

        if (!sb || !ms || ms.readyState !== "open" || sb.updating || isProcessingRef.current) {
            return;
        }

        if (queueRef.current.length > 0) {
            const chunk = queueRef.current.shift();
            if (!chunk) return;

            try {
                isProcessingRef.current = true;
                sb.appendBuffer(chunk);
            } catch (err) {
                console.error("Erro crítico no appendBuffer:", err);
                isProcessingRef.current = false;
            }
        }
    };

    const setupMediaSource = (mimeType: string, initBuffer: ArrayBuffer) => {
        const video = videoRef.current;
        if (!video) return;

        if (sourceBufferRef.current && mediaSourceRef.current?.readyState === 'open') {
             return; 
        }

        console.log(`[Player] Configurando MediaSource para: ${mimeType}`);
        
        const ms = new MediaSource();
        mediaSourceRef.current = ms;
        video.src = URL.createObjectURL(ms);

        const onSourceOpen = () => {
            console.log("[Player] MediaSource ABERTO!");
            URL.revokeObjectURL(video.src);

            try {
                if (!MediaSource.isTypeSupported(mimeType)) {
                    setDebugInfo(`Erro: Codec ${mimeType} não suportado.`);
                    return;
                }

                const sb = ms.addSourceBuffer(mimeType);
                sb.mode = "segments";
                sourceBufferRef.current = sb;

                sb.addEventListener("updateend", () => {
                    isProcessingRef.current = false;
                    
                    if (video.paused && !video.seeking) {
                        video.play().catch(e => console.log("Autoplay:", e.message));
                    }
                    
                    pump();
                });

                sb.addEventListener("error", (e) => console.error("Erro SourceBuffer", e));

                isInitRef.current = true;
                queueRef.current.push(initBuffer);
                pump();
                
                setDebugInfo("Reproduzindo...");

            } catch (e) {
                console.error("[Player] Falha ao criar SourceBuffer", e);
                setDebugInfo("Erro interno no player.");
            }
        };

        ms.addEventListener("sourceopen", onSourceOpen);
    };

    useEffect(() => {
        isInitRef.current = false;
        queueRef.current = [];
        setIsOnline(false);
        setDebugInfo("Conectando ao servidor...");

        const socket: Socket = io("http://localhost:2173", { 
            path: "/server/socket.io",
            transports: ["websocket"]
        });

        socket.on("connect", () => {
            console.log("Socket conectado:", socket.id);
            socket.emit("join-room", room);
        });

        socket.on("joined-room", (r, status) => {
            setIsOnline(status);
            setDebugInfo(status ? "Aguardando vídeo..." : "Offline");
        });

        socket.on("live-started", () => {
            setIsOnline(true);
            if (mediaSourceRef.current) {
                window.location.reload(); 
            }
        });

        socket.on("live-ended", () => {
            setIsOnline(false);
            setDebugInfo("Live encerrada.");
        });

        socket.on("live-chunk", (meta: ChunkMeta, data: ArrayBuffer) => {
            const buffer = data instanceof ArrayBuffer ? data : (data as any).buffer;

            if (meta.id === "init") {
                if (!isInitRef.current) {
                    console.log("[Socket] Recebido INIT. Iniciando Player.");
                    setupMediaSource(meta.mimeType, buffer);
                }
                return;
            }

            if (isInitRef.current) {
                queueRef.current.push(buffer);
                pump();
            } else {

            }
        });

        return () => {
            socket.disconnect();
            if (videoRef.current) {
                videoRef.current.removeAttribute("src");
                videoRef.current.load();
            }
            mediaSourceRef.current = null;
            sourceBufferRef.current = null;
            queueRef.current = [];
        };
    }, [room]);

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#2b1f42", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 960, bgcolor: "#14141a", borderRadius: 3, p: 3, border: "1px solid rgba(138, 43, 226, 0.15)" }}>
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ color: "#fff" }} fontSize={18} fontWeight={600}>Livestream: {room}</Typography>
                        <Chip
                            icon={<Box sx={{ display: "flex", alignItems: "center" }}><CircleIcon sx={{ fontSize: 10, fill: isOnline ? "#8a2be2" : "#555" }} /></Box>}
                            label={isOnline ? "AO VIVO" : "OFFLINE"}
                            sx={{ bgcolor: "transparent", color: isOnline ? "#c9a7ff" : "#777", border: "1px solid", borderColor: isOnline ? "rgba(138,43,226,0.5)" : "rgba(255,255,255,0.15)" }}
                        />
                    </Stack>

                    <Box sx={{ width: "100%", aspectRatio: "16 / 9", bgcolor: "black", borderRadius: 2, overflow: "hidden", position: "relative" }}>
                        {isOnline ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                controls
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                        ) : (
                            <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0b0b0f" }}>
                                <Typography color="#777">Aguardando início da transmissão...</Typography>
                            </Box>
                        )}
                    </Box>

                    <Typography fontSize={12} color="#666" textAlign="right">
                        Debug: {debugInfo}
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}