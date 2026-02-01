import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:2173";

let globalSocket: Socket | null = null;

function getSocket() {
    if (!globalSocket) {
        globalSocket = io(SOCKET_URL, { transports: ["websocket"] });
    } else if (!globalSocket.connected) {
        globalSocket.connect();
    }
    return globalSocket;
}

export type ChunkMeta = { id: string; room: string; mimeType: string };
export type LiveChunk = { meta: ChunkMeta; buffer: ArrayBuffer };

export function useSocket(ROOM: string, onReceiveChunk?: (chunk: LiveChunk) => void) {
    const onReceiveRef = useRef<typeof onReceiveChunk>(onReceiveChunk);

    useEffect(() => {
        onReceiveRef.current = onReceiveChunk;
    }, [onReceiveChunk]);

    useEffect(() => {
        const socket = getSocket();

        const handleConnect = () => {
            socket.emit("join-room", ROOM);
        };

        const handleLiveChunk = (meta: ChunkMeta, buffer: ArrayBuffer) => {
            onReceiveRef.current?.({ meta, buffer });
        };

        socket.on("connect", handleConnect);
        socket.on("live-chunk", handleLiveChunk);

        if (socket.connected) handleConnect();

        return () => {
            socket.off("connect", handleConnect);
            socket.off("live-chunk", handleLiveChunk);
        };
    }, [ROOM]);

    const sendChunk = async (blob: Blob, mimeType: string) => {
        const socket = getSocket();
        const buffer = await blob.arrayBuffer();
        const meta: ChunkMeta = { id: Date.now().toString(), room: ROOM, mimeType };
        socket.emit("video-chunk", meta, buffer);
    };

    return { sendChunk };
}
