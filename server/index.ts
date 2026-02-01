import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => res.send("Backend Video Server Running"));

const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: "*" },
    maxHttpBufferSize: 50 * 1e6,
    pingTimeout: 60000,
});

const livesOnline: string[] = [];
const liveInitChunks = new Map<string, { mimeType: string; buffer: ArrayBuffer }>();

app.get("/get-online", (req, res) => {
    res.send({ rooms: livesOnline });
});

function toArrayBuffer(data: ArrayBuffer | SharedArrayBuffer | Buffer): ArrayBuffer {
    if (data instanceof ArrayBuffer) {
        return data;
    }
    if (Buffer.isBuffer(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice().buffer;
    }

    return new Uint8Array(data).slice().buffer;
}

io.on("connection", (socket) => {
    console.log(`[Connect] Socket ID: ${socket.id}`);

    socket.on("join-room", (room: string) => {
        socket.join(room);
        const isLive = livesOnline.includes(room);
        console.log(`[Join] ${socket.id} entrou em ${room}. Live on? ${isLive}`);

        socket.emit("joined-room", room, isLive);

        if (isLive) {
            const init = liveInitChunks.get(room);
            if (init) {
                console.log(`[Sync] Enviando Init gravado para ${socket.id}`);
                socket.emit("live-chunk", { id: "init", room, mimeType: init.mimeType }, init.buffer);
            }
        }
    });

    socket.on("live-start", (room: string) => {
        console.log(`[Streamer] Live iniciada: ${room}`);
        if (!livesOnline.includes(room)) livesOnline.push(room);

        liveInitChunks.delete(room);

        io.to(room).emit("live-started");
    });

    socket.on("video-chunk", (meta: { id: string; room: string; mimeType: string }, payload: any) => {
        if (!meta || !meta.room) return;

        const buffer = toArrayBuffer(payload);

        if (!liveInitChunks.has(meta.room)) {
            console.log(`[Streamer] ${meta.room} - Capturado HEADER (Init). Bytes: ${buffer.byteLength}`);

            liveInitChunks.set(meta.room, {
                mimeType: meta.mimeType,
                buffer
            });

            io.to(meta.room).emit("live-chunk", { ...meta, id: "init" }, buffer);
            return;
        }

        io.to(meta.room).emit("live-chunk", meta, buffer);
    });

    socket.on("live-end", (room: string) => {
        console.log(`[Streamer] Live fim: ${room}`);
        const idx = livesOnline.indexOf(room);
        if (idx !== -1) livesOnline.splice(idx, 1);
        liveInitChunks.delete(room);
        io.to(room).emit("live-ended");
    });

    socket.on("disconnect", () => {
        console.log("Disconnect:", socket.id);
    });
});

const PORT = Number(process.env.BACKEND_PORT || 2173);
httpServer.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 Backend Socket.IO rodando na porta ${PORT}`);
    console.log(`-----------------------------------------`);
});