import React, { useState } from "react";
import {
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Stack,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";

function App() {
  const [transcriptions, setTranscriptions] = useState(["Hello, world!"]);

  const handleStart = () => {
    // TODO: Запуск процесса транскрибирования
  };

  const handleStop = () => {
    // TODO: Остановка процесса транскрибирования
  };

  return (
    <Box sx={{ maxWidth: '1024px', margin: '0 auto' }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: "center",
          width: "100%",
          bgcolor: "background.paper",
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          startIcon={<MicIcon />}
          onClick={handleStart}
        >
          Start
        </Button>
        <Button
          variant="contained"
          startIcon={<StopIcon />}
          onClick={handleStop}
        >
          Stop
        </Button>
      </Stack>
      <List>
        {transcriptions.map((transcription, index) => (
          <ListItem key={index}>
            <ListItemText primary={transcription} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default App;
