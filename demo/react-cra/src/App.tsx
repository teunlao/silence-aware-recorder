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
