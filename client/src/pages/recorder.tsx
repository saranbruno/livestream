import useScreenRecorder from "../hooks/useScreenRecorder";
import { useSocketRecorder } from "../hooks/useSocketRecorder";

export default function Recorder() {
    const {
        startLive,
        sendChunk,
        stopLive
    } = useSocketRecorder("livedobruno");

    const { isRecording, startRecording, stopRecording, videoUrl } = useScreenRecorder(({ blob, mimeType }) => {
        sendChunk(blob, mimeType);
    });

    return (
        <div>
            <button
                onClick={() => {
                    startRecording();
                    startLive();
                }}
                disabled={isRecording}
            >
                Iniciar Gravação
            </button>

            <button
                onClick={() => {
                    stopRecording();
                    stopLive();
                }}
                disabled={!isRecording}
            >
                Parar Gravação
            </button>

            {isRecording && <div>Gravando...</div>}

            {videoUrl && (
                <>
                    <video src={videoUrl} controls width="500" />
                    <a href={videoUrl} download="tela.webm">
                        Baixar
                    </a>
                </>
            )}
        </div>
    );
}
