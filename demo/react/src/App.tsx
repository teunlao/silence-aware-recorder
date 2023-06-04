import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Box,
  Stack,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { log } from "console";

function App() {
  const [transcriptions, setTranscriptions] = useState(["Hello, world!"]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const streamRef = useRef(null);

  const handleSilence = () => {
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, {
        type: "audio/ogg; codecs=opus",
      });
      const url = URL.createObjectURL(blob);
      console.log(`Закончил говорить, запись длится: ${blob.size} байт`);
      setAudioUrl(url);
      chunksRef.current = [];
    }

    setTimeout(() => {
      // Stop the previous recorder and stream
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
        mediaRecorderRef.current = null;
      }

      // Start a new recording
      handleStart();
    }, 100);
  };

  const startRecording = () => {
    console.log("startRecording");
    setIsRecording(true);
    const mediaRecorder = new MediaRecorder(streamRef.current);
    console.log(mediaRecorder);
    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = handleSilence;
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
  };

  const handleStart = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        startRecording();

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.fftSize = 1024;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudioLevel = () => {
          // console.log("checkAudioLevel");
          // console.log('silenceTimerRef.current', silenceTimerRef.current)
          analyser.getByteTimeDomainData(dataArray);
          // const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

          const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = function(event) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          const sum = inputBuffer.reduce((a, b) => a + b, 0);
          const avg = sum / inputBuffer.length;
          console.log(avg);
        };

        // scriptProcessor.connect(audioContext.destination);

          // console.log("avg", avg);

          // if (avg < 128 + 10) {
          //   console.log("silence");
          //   if (!silenceTimerRef.current) {
          //     silenceTimerRef.current = setTimeout(() => {
          //       console.log("silenceTimerRef.current");
          //       // mediaRecorderRef.current.stop();
          //       // setIsRecording(false);
          //     }, 3000);
          //   }
          // } else {
          //   console.log("not silence");
          //   clearTimeout(silenceTimerRef.current);
          //   silenceTimerRef.current = null;
          // }

          requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      })
      .catch((err) => console.error(err));
  };

  const handleStop = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  };

  // useEffect(() => {
  //   console.log("chunks", chunks);
  //   if (chunks.length > 0 && !isRecording) {
  //     const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
  //     const url = URL.createObjectURL(blob);
  //     setAudioUrl(url);
  //     setChunks([]);
  //   }
  // }, [chunks, isRecording]);

  return (
    <Box sx={{ maxWidth: "1024px", margin: "0 auto" }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: "center",
          width: "100%",
          bgcolor: "background.paper",
          gap: 1,
        }}
      >
        {!isRecording ? (
          <Button
            variant="contained"
            startIcon={<MicIcon />}
            onClick={handleStart}
          >
            Start
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<StopIcon />}
            onClick={handleStop}
          >
            Stop
          </Button>
        )}
      </Stack>
      <List>
        {transcriptions.map((transcription, index) => (
          <ListItem key={index}>
            <ListItemText primary={transcription} />
          </ListItem>
        ))}
      </List>
      <audio src={audioUrl} controls></audio>
    </Box>
  );
}

export default App;
