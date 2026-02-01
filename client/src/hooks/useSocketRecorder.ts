import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let globalSocket: Socket | null = null;

function getSocket() {
    if (!globalSocket) {
        globalSocket = io({
            path: "/server/socket.io",
            transports: ["websocket"],
        });
    } else if (!globalSocket.connected) {
        globalSocket.connect();
    }
    return globalSocket;
}

type ChunkMeta = { id: string; room: string; mimeType: string };
type LiveChunk = { meta: ChunkMeta; buffer: ArrayBuffer };

export function useSocketRecorder(ROOM: string) {

    useEffect(() => {
        const socket = getSocket();

        const handleConnect = () => {
            socket.emit("join-room", ROOM);
        };

        socket.on("connect", handleConnect);

        return () => {
            socket.off("connect", handleConnect);
        };
    }, [ROOM]);

    const startLive = () => {
        const socket = getSocket();

        socket.emit("live-start", ROOM);
    }

    const sendChunk = async (blob: Blob, mimeType: string) => {
        const socket = getSocket();
        const buffer = await blob.arrayBuffer();
        const meta: ChunkMeta = { id: Date.now().toString(), room: ROOM, mimeType };
        socket.emit("video-chunk", meta, buffer);
    };

    const stopLive = () => {
        const socket = getSocket();

        socket.emit("live-end", ROOM);
    }

    return { startLive, sendChunk, stopLive };
}
