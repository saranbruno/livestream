import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

type WebRTCHandlers = {
    createOffer: (viewerId?: string) => Promise<RTCSessionDescriptionInit | null>;
    applyAnswer: (answer: RTCSessionDescriptionInit, viewerId?: string) => void | Promise<void>;
    addIceCandidate: (candidate: RTCIceCandidateInit, viewerId?: string) => void | Promise<void>;
    onIceCandidate: (
        cb:
            | ((c: RTCIceCandidateInit) => void)
            | ((viewerId: string, c: RTCIceCandidateInit) => void)
    ) => void;
};

export function useWebRTCSocket(
    room: string,
    webrtc: WebRTCHandlers & { isRecording: boolean }
) {
    const socketRef = useRef<Socket | null>(null);
    const viewersQueue = useRef<string[]>([]);

    useEffect(() => {
        const socket = io({ path: "/server/socket.io", transports: ["websocket"] });
        socketRef.current = socket;

        socket.emit("join-room", { room, role: "broadcaster" });

        socket.on("viewer-requested-offer", async (viewerId: string) => {
            if (!webrtc.isRecording) {
                viewersQueue.current.push(viewerId);
                return;
            }
            const offer = await webrtc.createOffer(viewerId);
            if (!offer) return;
            socket.emit("webrtc-offer", { to: viewerId, offer });
        });

        socket.on("webrtc-answer", (payload: any) => {
            if (payload?.from && payload?.answer) {
                webrtc.applyAnswer(payload.answer, payload.from);
            } else {
                webrtc.applyAnswer(payload);
            }
        });

        socket.on("webrtc-ice", (payload: any) => {
            if (payload?.from && payload?.candidate) {
                webrtc.addIceCandidate(payload.candidate, payload.from);
            } else {
                webrtc.addIceCandidate(payload);
            }
        });

        webrtc.onIceCandidate((a: any, b?: any) => {
            if (typeof a === "string") {
                const viewerId = a;
                const candidate = b as RTCIceCandidateInit;
                socket.emit("webrtc-ice", { to: viewerId, candidate });
            } else {
                const candidate = a as RTCIceCandidateInit;
                viewersQueue.current.forEach((viewerId) => {
                    socket.emit("webrtc-ice", { to: viewerId, candidate });
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [room, webrtc]);

    useEffect(() => {
        if (!webrtc.isRecording) {
            socketRef.current?.emit("live-stopped", room);
            return;
        }

        (async () => {
            const pending = [...viewersQueue.current];
            viewersQueue.current = [];

            for (const viewerId of pending) {
                const offer = await webrtc.createOffer(viewerId);
                if (!offer) continue;
                socketRef.current?.emit("webrtc-offer", { to: viewerId, offer });
            }
        })();

        socketRef.current?.emit("live-started", room);
    }, [webrtc.isRecording, room, webrtc]);
}
