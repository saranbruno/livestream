import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

type WebRTCHandlers = {
    createOffer: () => Promise<RTCSessionDescriptionInit | null>;
    applyAnswer: (answer: RTCSessionDescriptionInit) => void;
    addIceCandidate: (candidate: RTCIceCandidateInit) => void;
    onIceCandidate: (cb: (c: RTCIceCandidateInit) => void) => void;
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
            const offer = await webrtc.createOffer();
            if (!offer) return;
            socket.emit("webrtc-offer", { to: viewerId, offer });
        });

        socket.on("webrtc-answer", webrtc.applyAnswer);
        socket.on("webrtc-ice", webrtc.addIceCandidate);

        webrtc.onIceCandidate((candidate) => {
            const allViewers = [...viewersQueue.current];
            viewersQueue.current = [];
            allViewers.forEach((viewerId) => {
                socket.emit("webrtc-ice", { to: viewerId, candidate });
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [room, webrtc]);

    useEffect(() => {
        if (!webrtc.isRecording) return;
        (async () => {
            const pending = [...viewersQueue.current];
            viewersQueue.current = [];
            for (const viewerId of pending) {
                const offer = await webrtc.createOffer();
                if (!offer) continue;
                socketRef.current?.emit("webrtc-offer", { to: viewerId, offer });
            }
        })();
    }, [webrtc.isRecording]);
}
