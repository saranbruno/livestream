import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import { io, Socket } from "socket.io-client";
import { useParams } from "react-router-dom";

type ChunkMeta = { id: string; room: string; mimeType: string };
type LiveChunk = { meta: ChunkMeta; buffer: ArrayBuffer };

export default function Viewer() {
    const { room } = useParams();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const socket = io({ path: "/server/socket.io" });
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        socket.emit("join-room", room);

        pc.ontrack = (e) => {
            videoRef.current!.srcObject = e.streams[0];
        };

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket.emit("webrtc-ice", {
                    to: room,
                    candidate: e.candidate,
                });
            }
        };

        socket.on("webrtc-offer", async ({ offer, from }) => {
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("webrtc-answer", {
                to: from,
                answer,
            });
        });

        socket.on("webrtc-ice", (candidate) => {
            pc.addIceCandidate(candidate);
        });

        return () => {
            pc.close();
            socket.disconnect();
        };
    }, [room]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            controls
            style={{ width: "100%" }}
        />
    );
}