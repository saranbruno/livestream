import { useRef, useState, useCallback } from "react";

type IceCb =
    | ((candidate: RTCIceCandidateInit) => void) // compat (1 viewer)
    | ((viewerId: string, candidate: RTCIceCandidateInit) => void); // multi

const DEFAULT_VIEWER_ID = "__default__";

export function useWebRTCStreamer() {
    const streamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    const [isRecording, setIsRecording] = useState(false);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    const iceCallbackRef = useRef<IceCb | null>(null);

    const createPeerIfNeeded = useCallback((viewerId: string) => {
        const existing = peersRef.current.get(viewerId);
        if (existing) return existing;

        if (!streamRef.current) {
            throw new Error("Stream não iniciado. Chame start() antes de criar offer.");
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        const stream = streamRef.current;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
            if (!e.candidate) return;

            const cb = iceCallbackRef.current;
            if (!cb) return;

            if (cb.length === 1) (cb as (c: RTCIceCandidateInit) => void)(e.candidate);
            else (cb as (id: string, c: RTCIceCandidateInit) => void)(viewerId, e.candidate);
        };

        pc.onconnectionstatechange = () => {
            const st = pc.connectionState;
            if (st === "failed" || st === "closed" || st === "disconnected") {
                peersRef.current.delete(viewerId);
                try {
                    pc.close();
                } catch { }
            }
        };

        peersRef.current.set(viewerId, pc);
        return pc;
    }, []);

    const start = useCallback(async () => {
        if (isRecording) return;

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });

        streamRef.current = stream;
        setPreviewStream(stream);

        stream.getVideoTracks()[0].onended = () => stop();

        setIsRecording(true);
    }, [isRecording]);

    const stop = useCallback(() => {
        for (const pc of peersRef.current.values()) {
            try {
                pc.getSenders().forEach((s) => s.track?.stop());
            } catch { }
            try {
                pc.close();
            } catch { }
        }
        peersRef.current.clear();

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        setPreviewStream(null);
        setIsRecording(false);
    }, []);

    const createOffer = async (viewerId: string = DEFAULT_VIEWER_ID) => {
        const pc = createPeerIfNeeded(viewerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        return offer;
    };

    const applyAnswer = (answer: RTCSessionDescriptionInit, viewerId: string = DEFAULT_VIEWER_ID) => {
        const pc = createPeerIfNeeded(viewerId);
        return pc.setRemoteDescription(answer);
    };

    const addIceCandidate = (candidate: RTCIceCandidateInit, viewerId: string = DEFAULT_VIEWER_ID) => {
        const pc = createPeerIfNeeded(viewerId);
        return pc.addIceCandidate(candidate);
    };

    const onIceCandidate = (cb: IceCb) => {
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
