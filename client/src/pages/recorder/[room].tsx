import { useEffect } from "react";
import { Box, Typography, Paper, Chip, Stack, Button } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import useScreenRecorder from "../../hooks/useScreenRecorder";
import { useSocketRecorder } from "../../hooks/useSocketRecorder";
import { useParams } from "react-router-dom";

export default function Recorder() {
    const { room } = useParams<{ room: string }>();

    const { startLive, sendChunk, stopLive } = useSocketRecorder(room);

    const { isRecording, startRecording, stopRecording, videoUrl } = useScreenRecorder(({ blob, mimeType }) => {
        sendChunk(blob, mimeType);
    });

    useEffect(() => {
        if (isRecording) startLive();
        else stopLive();
    }, [isRecording]);

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
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <CircleIcon sx={{ fontSize: 10, fill: isRecording ? "#8a2be2" : "#555" }} />
                                </Box>
                            }
                            label={isRecording ? "AO VIVO" : "OFFLINE"}
                            sx={{
                                bgcolor: "transparent",
                                color: isRecording ? "#c9a7ff" : "#777",
                                border: "1px solid",
                                borderColor: isRecording ? "rgba(138,43,226,0.5)" : "rgba(255,255,255,0.15)",
                            }}
                        />
                    </Stack>

                    <Box
                        sx={{
                            width: "100%",
                            aspectRatio: "16 / 9",
                            bgcolor: videoUrl ? "black" : "#0b0b0f",
                            borderRadius: 2,
                            overflow: "hidden",
                            border: videoUrl ? "none" : "1px dashed rgba(138, 43, 226, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {videoUrl ? (
                            <video
                                src={videoUrl}
                                controls
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                }}
                            />
                        ) : (
                            <Typography color="#777">
                                {isRecording ? "Transmitindo..." : "Clique em iniciar para começar a live"}
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" spacing={1.5}>
                        <Button
                            onClick={startRecording}
                            disabled={isRecording}
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

                        <Button
                            onClick={stopRecording}
                            disabled={!isRecording}
                            variant="outlined"
                            sx={{
                                borderColor: "rgba(138,43,226,0.5)",
                                color: "#c9a7ff",
                                "&:hover": { borderColor: "rgba(138,43,226,0.9)", bgcolor: "rgba(138,43,226,0.08)" },
                                "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.25)" },
                            }}
                            fullWidth
                        >
                            Parar
                        </Button>
                    </Stack>

                    {videoUrl && (
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                component="a"
                                href={videoUrl}
                                download="tela.webm"
                                variant="text"
                                sx={{ color: "#c9a7ff", "&:hover": { bgcolor: "rgba(138,43,226,0.08)" } }}
                            >
                                Baixar gravação
                            </Button>
                        </Box>
                    )}

                    <Typography fontSize={12} color="#666" textAlign="right">
                        Sala: {room}
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
