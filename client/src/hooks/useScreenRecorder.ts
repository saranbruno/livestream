import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useWebRTCStreamer(room: string) {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io({ path: "/server/socket.io" });
        socketRef.current = socket;

        socket.emit("join-room", room);

        socket.on("viewer-joined", async (viewerId) => {
            if (!pcRef.current) return;

            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);

            socket.emit("webrtc-offer", { room, offer });
        });

        socket.on("webrtc-answer", async (answer) => {
            await pcRef.current?.setRemoteDescription(answer);
        });

        socket.on("webrtc-ice", (candidate) => {
            pcRef.current?.addIceCandidate(candidate);
        });

        return () => {
            socket.disconnect()
        };
    }, [room]);

    const start = async () => {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socketRef.current?.emit("webrtc-ice", {
                    to: room,
                    candidate: e.candidate,
                });
            }
        };
    };

    return { start };
}
