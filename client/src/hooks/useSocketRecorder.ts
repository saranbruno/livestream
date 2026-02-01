import { useEffect } from "react";
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
        getSocket().emit("live-start", ROOM);
    };

    const sendChunk = async (blob: Blob, mimeType: string) => {
        const buffer = await blob.arrayBuffer();
        const meta: ChunkMeta = {
            id: Date.now().toString(),
            room: ROOM,
            mimeType,
        };
        getSocket().emit("video-chunk", meta, buffer);
    };

    const stopLive = () => {
        getSocket().emit("live-end", ROOM);
    };

    return { startLive, sendChunk, stopLive };
}
