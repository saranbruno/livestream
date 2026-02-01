import { useEffect, useRef } from "react";
import { Box, Typography, Paper, Chip, Stack, Button } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import { useSocketRecorder } from "../../hooks/useSocketRecorder";
import { useParams } from "react-router-dom";
import { useWebRTCStreamer } from "../../hooks/useScreenRecorder";

export default function Recorder() {
    const { room } = useParams<{ room: string }>();
    const { startLive, sendChunk, stopLive } = useSocketRecorder(room || "default");

    const videoPreviewRef = useRef<HTMLVideoElement>(null);

    const {
        start
    } = useWebRTCStreamer(room);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#2b1f42",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 960,
                    bgcolor: "#14141a",
                    borderRadius: 3,
                    p: 3,
                    border: "1px solid rgba(138, 43, 226, 0.15)",
                }}
            >
                <Stack spacing={2}>
                    

                    <Stack direction="row" spacing={1.5}>
                        <Button
                            onClick={start}
                            variant="contained"
                            sx={{
                                bgcolor: "#8a2be2",
                                color: "#fff",
                                "&:hover": { bgcolor: "#7a22cc" },
                                "&.Mui-disabled": { bgcolor: "rgba(138,43,226,0.25)", color: "rgba(255,255,255,0.35)" },
                            }}
                            fullWidth
                        >
                            Iniciar
                        </Button>

                    </Stack>

                    <Typography fontSize={12} color="#666" textAlign="right">
                        Sala: {room}
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
