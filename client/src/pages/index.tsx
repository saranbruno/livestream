import { useState } from "react";
import { Box, Paper, Stack, Typography, Button, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";

type Mode = "viewer" | "recorder" | null;

export default function Index() {
    const navigate = useNavigate();

    const [mode, setMode] = useState<Mode>(null);
    const [room, setRoom] = useState("");

    const handleContinue = () => {
        if (!mode || !room.trim()) return;
        navigate(`/${mode}/${room.trim()}`);
    };

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
                    maxWidth: 520,
                    bgcolor: "#14141a",
                    borderRadius: 3,
                    p: 3,
                    border: "1px solid rgba(138, 43, 226, 0.15)",
                }}
            >
                <Stack spacing={3}>
                    {/* Header */}
                    <Typography fontSize={20} fontWeight={600} color="#fff" textAlign="center">
                        Livestream
                    </Typography>

                    {/* Step 1 */}
                    {!mode && (
                        <Stack spacing={2}>
                            <Typography color="#aaa" textAlign="center">
                                O que você deseja fazer?
                            </Typography>

                            <Button
                                variant="contained"
                                fullWidth
                                sx={{
                                    bgcolor: "#8a2be2",
                                    "&:hover": { bgcolor: "#7a22cc" },
                                }}
                                onClick={() => setMode("recorder")}
                            >
                                Gravar uma live
                            </Button>

                            <Button
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
                                onClick={() => setMode("viewer")}
                            >
                                Assistir uma live
                            </Button>
                        </Stack>
                    )}

                    {/* Step 2 */}
                    {mode && (
                        <Stack spacing={2}>
                            <Typography color="#aaa">
                                Nome da sala
                            </Typography>

                            <TextField
                                value={room}
                                onChange={(e) => setRoom(e.target.value)}
                                placeholder="ex: livedobruno"
                                autoFocus
                                fullWidth
                                variant="outlined"
                                InputProps={{
                                    sx: {
                                        bgcolor: "#0b0b0f",
                                        color: "#fff",
                                    },
                                }}
                            />

                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    onClick={() => setMode(null)}
                                    variant="text"
                                    fullWidth
                                    sx={{
                                        color: "#777",
                                        "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                                    }}
                                >
                                    Voltar
                                </Button>

                                <Button
                                    onClick={handleContinue}
                                    disabled={!room.trim()}
                                    variant="contained"
                                    fullWidth
                                    sx={{
                                        bgcolor: "#8a2be2",
                                        "&:hover": { bgcolor: "#7a22cc" },
                                        "&.Mui-disabled": {
                                            bgcolor: "rgba(138,43,226,0.25)",
                                            color: "rgba(255,255,255,0.35)",
                                        },
                                    }}
                                >
                                    Continuar
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
}
