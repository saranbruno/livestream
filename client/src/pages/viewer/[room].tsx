import { useEffect, useRef, useState } from "react";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";

type OfferPayload =
    | { offer: RTCSessionDescriptionInit; from: string }
    | RTCSessionDescriptionInit;

export default function Viewer() {
    const { room } = useParams<{ room: string }>();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [isOnline, setIsOnline] = useState(false);
    const [queueSize] = useState(0);

    const peerIdRef = useRef<string | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

    useEffect(() => {
        const socket = io({ path: "/server/socket.io" });

        socket.emit("join-room", { room, role: "viewer" });
        socket.emit("request-offer", { room });

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.ontrack = (e) => {
            if (videoRef.current) {
                videoRef.current.srcObject = e.streams[0];
            }
            setIsOnline(true);
        };

        pc.onicecandidate = (e) => {
            if (e.candidate && peerIdRef.current) {
                socket.emit("webrtc-ice", { to: peerIdRef.current, candidate: e.candidate });
            }
        };

        const normalizeCandidate = (payload: any): RTCIceCandidateInit | null => {
            if (!payload) return null;

            const maybeNested = payload.candidate;
            const c =
                maybeNested &&
                    typeof maybeNested === "object" &&
                    typeof maybeNested.candidate === "string"
                    ? maybeNested
                    : payload;

            if (!c || typeof c.candidate !== "string") return null;

            return {
                candidate: c.candidate,
                sdpMid: c.sdpMid ?? null,
                sdpMLineIndex: c.sdpMLineIndex ?? null,
                usernameFragment: c.usernameFragment ?? null,
            };
        };


        socket.on("webrtc-offer", async (payload: OfferPayload) => {
            const offer =
                (payload as any)?.offer ?? (payload as RTCSessionDescriptionInit);
            const from =
                (payload as any)?.from ?? peerIdRef.current;

            if (from) peerIdRef.current = from;

            await pc.setRemoteDescription(offer);

            pendingCandidates.current.forEach((c) => {
                pc.addIceCandidate(c);
            });
            pendingCandidates.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (from) socket.emit("webrtc-answer", { to: from, answer });
        });

        socket.on("webrtc-ice", (payload: any) => {
            const candidate = normalizeCandidate(payload);
            if (!candidate) return;

            const from = payload?.from;
            if (from && !peerIdRef.current) peerIdRef.current = from;

            if (pcRef.current?.remoteDescription) {
                pcRef.current.addIceCandidate(candidate);
            } else {
                pendingCandidates.current.push(candidate);
            }
        });

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") setIsOnline(true);
            if (["failed", "disconnected", "closed"].includes(pc.connectionState)) setIsOnline(false);
        };

        return () => {
            pc.close();
            socket.disconnect();
            setIsOnline(false);
        };
    }, [room]);

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#2b1f42", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 960, bgcolor: "#14141a", borderRadius: 3, p: 3, border: "1px solid rgba(138, 43, 226, 0.15)" }}>
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ color: "#fff" }} fontSize={18} fontWeight={600}>Livestream</Typography>
                        <Chip
                            icon={<Box sx={{ display: "flex", alignItems: "center" }}><CircleIcon sx={{ fontSize: 10, fill: isOnline ? "#8a2be2" : "#555" }} /></Box>}
                            label={isOnline ? "AO VIVO" : "OFFLINE"}
                            sx={{
                                bgcolor: "transparent",
                                color: isOnline ? "#c9a7ff" : "#777",
                                border: "1px solid",
                                borderColor: isOnline ? "rgba(138,43,226,0.5)" : "rgba(255,255,255,0.15)",
                            }}
                        />
                    </Stack>

                    <Box sx={{ width: "100%", aspectRatio: "16 / 9", bgcolor: "black", borderRadius: 2, overflow: "hidden", display: isOnline ? "block" : "none" }}>
                        <video ref={videoRef} autoPlay playsInline controls muted style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </Box>

                    {!isOnline && (
                        <Box sx={{ width: "100%", aspectRatio: "16 / 9", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0b0b0f", borderRadius: 2, border: "1px dashed rgba(138, 43, 226, 0.25)" }}>
                            <Typography color="#777">A live não está online no momento</Typography>
                        </Box>
                    )}

                    <Typography fontSize={12} color="#666" textAlign="right">Chunks na fila: {queueSize}</Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
