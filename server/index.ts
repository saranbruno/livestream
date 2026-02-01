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

io.on("connection", (socket) => {
    socket.on("join-room", (room: string) => {
        socket.join(room);
        socket.emit("joined-room", room);
    });

    socket.on(
        "video-chunk",
        (meta: { id: string; room: string; mimeType: string }, payload: ArrayBuffer | Buffer) => {
            if (!meta?.room || !meta?.id || !meta?.mimeType) return;

            const buffer =
                payload instanceof ArrayBuffer
                    ? payload
                    : payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);

            io.to(meta.room).emit("live-chunk", meta, buffer);
        }
    );

    socket.on("disconnect", () => { });
});

const PORT = Number(process.env.BACKEND_PORT || 2173);

httpServer.listen(PORT, () => {
    console.log(`Backend + Socket.IO em http://localhost:${PORT}`);
});
