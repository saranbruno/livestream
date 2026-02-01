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

io.on("connection", (socket) => {
    console.log("Socket:", socket.id);

    socket.on("join-room", ({ room, role }) => {
        socket.join(room);
        if (role === "viewer") socket.to(room).emit("viewer-joined", socket.id);
    });

    socket.on("request-offer", ({ room }) => {
        socket.to(room).emit("viewer-requested-offer", socket.id);
    });

    socket.on("webrtc-offer", ({ to, offer }) => {
        socket.to(to).emit("webrtc-offer", { offer, from: socket.id });
    });

    socket.on("webrtc-answer", ({ to, answer }) => {
        socket.to(to).emit("webrtc-answer", answer);
    });

    socket.on("webrtc-ice", ({ to, candidate }) => {
        socket.to(to).emit("webrtc-ice", candidate);
    });

    socket.on("live-started", (room: string) => {
        if (!livesOnline.includes(room)) livesOnline.push(room);
        io.to(room).emit("live-started");
        console.log(`Live started: ${room}`);
    });

    socket.on("live-stopped", (room: string) => {
        const index = livesOnline.indexOf(room);
        if (index > -1) livesOnline.splice(index, 1);
        io.to(room).emit("live-stopped");
        console.log(`Live stopped: ${room}`);
    });

    socket.on("disconnect", () => console.log("Disconnect:", socket.id));
});

const PORT = Number(process.env.BACKEND_PORT || 2173);
httpServer.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 Backend Socket.IO rodando na porta ${PORT}`);
    console.log(`-----------------------------------------`);
});
