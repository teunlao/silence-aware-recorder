import {useWhisper} from "./use-whisper/src/useWhisper";


function App() {
  const {
    recording,
    speaking,
    transcribing,
    transcript,
    pauseRecording,
    startRecording,
    stopRecording,
  } = useWhisper({
    autoTranscribe: true,
    mode: 'transcriptions',
    apiKey: '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', // YOUR_OPEN_AI_TOKEN
    whisperConfig: {
      language: 'ru'
    }
  })

  return (
    <div>
      <p>Recording: {recording}</p>
      <p>Speaking: {speaking}</p>
      <p>Transcribing: {transcribing}</p>
      <p>Transcribed Text: {transcript.text}</p>
      <button onClick={() => startRecording()}>Start</button>
      <button onClick={() => pauseRecording()}>Pause</button>
      <button onClick={() => stopRecording()}>Stop</button>
    </div>
  );
}

export default App;
