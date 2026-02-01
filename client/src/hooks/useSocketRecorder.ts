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
    const peerIdRef = useRef<string | null>(null);

    useEffect(() => {
        const socket = io({
            path: "/server/socket.io",
            transports: ["websocket"],
        });

        socketRef.current = socket;

        socket.emit("join-room", {
            room,
            role: "broadcaster",
        });

        socket.on("viewer-joined", async (viewerId) => {
            peerIdRef.current = viewerId;

            if (!webrtc.isRecording) {
                console.log("Viewer entrou, aguardando start()");
                return;
            }

            const offer = await webrtc.createOffer();
            if (!offer) return;

            socket.emit("webrtc-offer", {
                to: viewerId,
                offer,
            });
        });

        socket.on("viewer-requested-offer", async (viewerId) => {
            peerIdRef.current = viewerId;

            if (!webrtc.isRecording) return;

            const offer = await webrtc.createOffer();
            if (!offer) return;

            socket.emit("webrtc-offer", {
                to: viewerId,
                offer,
            });
        });

        socket.on("webrtc-answer", webrtc.applyAnswer);
        socket.on("webrtc-ice", webrtc.addIceCandidate);

        webrtc.onIceCandidate(candidate => {
            if (!peerIdRef.current) return;
            socket.emit("webrtc-ice", {
                to: peerIdRef.current,
                candidate,
            });
        });

        return () => {
            socket.disconnect();
        }
    }, [room]);

    useEffect(() => {
        if (!webrtc.isRecording) return;
        if (!peerIdRef.current) return;

        (async () => {
            const offer = await webrtc.createOffer();
            if (!offer) return;

            socketRef.current?.emit("webrtc-offer", {
                to: peerIdRef.current,
                offer,
            });
        })();
    }, [webrtc.isRecording]);
}

