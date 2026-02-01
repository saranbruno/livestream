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

app.get("/", (req, res) => res.send("Backend OK!"));

const io = new Server(httpServer, {
    path: "/server/socket.io",
    cors: { origin: "*" },
    maxHttpBufferSize: 50 * 1e6,
});

const livesOnline: string[] = [];

io.on("connection", (socket) => {
    console.log("Usuario conectado: ", socket.id);

    socket.on("join-room", (room: string) => {
        console.log(`Usuario ${socket.id} conectado a sala ${room}`);
        socket.join(room);
        const status = livesOnline.includes(room);
        socket.emit("joined-room", room, status);
    });

    socket.on("live-start", (room: string) => {
        console.log(`Live inciada na sala: ${room}`);
        livesOnline.push(room);
        io.to(room).emit("live-started");
    });

    socket.on("video-chunk", (meta: { id: string; room: string; mimeType: string }, payload: ArrayBuffer | Buffer) => {
        if (!meta?.room || !meta?.id || !meta?.mimeType) return;

        const buffer =
            payload instanceof ArrayBuffer
                ? payload
                : payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);

        io.to(meta.room).emit("live-chunk", meta, buffer);
    });

    socket.on("live-end", (room: string) => {
        console.log(`Live finalizada na sala: ${room}`);
        const idx = livesOnline.indexOf(room);
        if (idx !== -1) livesOnline.splice(idx, 1);
        io.to(room).emit("live-ended");
    });

    socket.on("disconnect", () => {
        console.log("Usuario desconectado: ", socket.id);
    });
});

const PORT = Number(process.env.BACKEND_PORT || 2173);

httpServer.listen(PORT, () => {
    console.log(`Backend + Socket.IO em http://localhost:${PORT}`);
});
