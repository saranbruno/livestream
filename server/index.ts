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
    console.log("Socket:", socket.id);

    socket.on("join-room", (room) => {
        socket.join(room);
        socket.to(room).emit("viewer-joined", socket.id);
    });

    socket.on("webrtc-offer", ({ room, offer }) => {
        socket.to(room).emit("webrtc-offer", {
            offer,
            from: socket.id,
        });
    });

    socket.on("webrtc-answer", ({ to, answer }) => {
        socket.to(to).emit("webrtc-answer", answer);
    });

    socket.on("webrtc-ice", ({ to, candidate }) => {
        socket.to(to).emit("webrtc-ice", candidate);
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