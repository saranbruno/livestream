import { useEffect, useRef, useState } from "react";
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

export type ChunkMeta = { id: string; room: string; mimeType: string };
export type LiveChunk = { meta: ChunkMeta; buffer: ArrayBuffer };

export function useSocketViewer(ROOM: string, onReceiveChunk?: (chunk: LiveChunk) => void) {

    const [isOnline, setIsOnline] = useState<boolean>(false);
    const onReceiveRef = useRef<typeof onReceiveChunk>(onReceiveChunk);

    useEffect(() => {
        onReceiveRef.current = onReceiveChunk;
    }, [onReceiveChunk]);

    useEffect(() => {
        const socket = getSocket();

        const handleConnect = () => {
            socket.emit("join-room", ROOM);
        };

        const onJoinedRoom = (room: string, status: boolean) => setIsOnline(status);

        const handleLiveChunk = (meta: ChunkMeta, buffer: ArrayBuffer) => {
            onReceiveRef.current?.({ meta, buffer });
        };

        socket.on("connect", handleConnect);
        socket.on("joined-room", onJoinedRoom);
        socket.on("live-started", () => setIsOnline(true));
        socket.on("live-chunk", handleLiveChunk);
        socket.on("live-ended", () => setIsOnline(false));

        return () => {
            socket.off("connect", handleConnect);
            socket.off("joined-room", onJoinedRoom);
            socket.off("live-started");
            socket.off("live-chunk", handleLiveChunk);
            socket.off("live-ended");
        };
    }, [ROOM]);

    return { isOnline };
}
