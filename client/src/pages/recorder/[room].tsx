import { useEffect, useRef } from "react";
import { Box, Typography, Paper, Chip, Stack, Button } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import { useParams } from "react-router-dom";
import { useWebRTCStreamer } from "../../hooks/useScreenRecorder";
import { useWebRTCSocket } from "../../hooks/useSocketRecorder";

export default function Recorder() {
    const { room } = useParams<{ room: string }>();

    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

    const streamer = useWebRTCStreamer();
    
    useWebRTCSocket(room!, {
        ...streamer,
        isRecording: streamer.isRecording,
    });

    const { isRecording, start, stop, previewStream } = streamer;

    useEffect(() => {
        if (videoPreviewRef.current && previewStream) {
            videoPreviewRef.current.srcObject = previewStream;
        }
    }, [previewStream]);

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
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ color: "#fff" }} fontSize={18} fontWeight={600}>
                            Livestream
                        </Typography>

                        <Chip
                            icon={
                                <CircleIcon
                                    sx={{ fontSize: 10, fill: isRecording ? "#8a2be2" : "#555" }}
                                />
                            }
                            label={isRecording ? "AO VIVO" : "OFFLINE"}
                            sx={{
                                bgcolor: "transparent",
                                color: isRecording ? "#c9a7ff" : "#777",
                                border: "1px solid",
                                borderColor: isRecording
                                    ? "rgba(138,43,226,0.5)"
                                    : "rgba(255,255,255,0.15)",
                            }}
                        />
                    </Stack>

                    <Box
                        sx={{
                            width: "100%",
                            aspectRatio: "16 / 9",
                            bgcolor: isRecording ? "black" : "#0b0b0f",
                            borderRadius: 2,
                            overflow: "hidden",
                            border: isRecording
                                ? "none"
                                : "1px dashed rgba(138, 43, 226, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {isRecording ? (
                            <video
                                ref={videoPreviewRef}
                                autoPlay
                                muted
                                playsInline
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                        ) : (
                            <Typography color="#777">
                                Clique em iniciar para começar a live
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" spacing={1.5}>
                        <Button
                            onClick={start}
                            disabled={isRecording}
                            variant="contained"
                            fullWidth
                            sx={{
                                bgcolor: "#8a2be2",
                                "&:hover": { bgcolor: "#7a22cc" },
                            }}
                        >
                            Iniciar
                        </Button>

                        <Button
                            onClick={stop}
                            disabled={!isRecording}
                            variant="outlined"
                            fullWidth
                            sx={{
                                borderColor: "rgba(138,43,226,0.5)",
                                color: "#c9a7ff",
                                "&:hover": {
                                    borderColor: "rgba(138,43,226,0.9)",
                                    bgcolor: "rgba(138,43,226,0.08)",
                                },
                            }}
                        >
                            Parar
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
