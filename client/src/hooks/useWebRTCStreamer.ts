import { useRef, useState, useCallback } from "react";

export function useWebRTCStreamer() {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    const iceCallbackRef = useRef<((c: RTCIceCandidateInit) => void) | null>(null);

    const start = useCallback(async () => {
        if (isRecording) return;

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pcRef.current = pc;
        streamRef.current = stream;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        setPreviewStream(stream);

        pc.onicecandidate = e => {
            if (e.candidate) {
                iceCallbackRef.current?.(e.candidate);
            }
        };

        stream.getVideoTracks()[0].onended = stop;
        setIsRecording(true);
    }, [isRecording]);

    const stop = useCallback(() => {
        pcRef.current?.getSenders().forEach(s => s.track?.stop());
        pcRef.current?.close();

        streamRef.current?.getTracks().forEach(t => t.stop());

        pcRef.current = null;
        streamRef.current = null;

        setPreviewStream(null);
        setIsRecording(false);
    }, []);

    const createOffer = async () => {
        if (!pcRef.current) return null;

        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        return offer;
    };

    const applyAnswer = (answer: RTCSessionDescriptionInit) =>
        pcRef.current?.setRemoteDescription(answer);

    const addIceCandidate = (candidate: RTCIceCandidateInit) =>
        pcRef.current?.addIceCandidate(candidate);

    const onIceCandidate = (cb: (c: RTCIceCandidateInit) => void) => {
        iceCallbackRef.current = cb;
    };

    return {
        start,
        stop,
        isRecording,
        previewStream,
        createOffer,
        applyAnswer,
        addIceCandidate,
        onIceCandidate,
    };
}
