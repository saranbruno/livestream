import useScreenRecorder from "../hooks/useScreenRecorder";
import { useSocket } from "../hooks/useSocket";

export default function Recorder() {
    const { sendChunk } = useSocket("livedobruno");

    const { isRecording, startRecording, stopRecording, videoUrl } = useScreenRecorder(({ blob, mimeType }) => {
        sendChunk(blob, mimeType);
    });

    return (
        <div>
            <button onClick={startRecording} disabled={isRecording}>
                Iniciar Gravação
            </button>

            <button onClick={stopRecording} disabled={!isRecording}>
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
