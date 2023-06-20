import { useState, useEffect, useCallback } from 'react';
import SilenceAwareRecorder, {
  SilenceAwareRecorderOptions,
} from '../lib/SilenceAwareRecorder';

const useSilenceAwareRecorder = (options: SilenceAwareRecorderOptions) => {
  const { silenceDuration, silentThreshold, minDecibels } = options;
  const [recorder, setRecorder] = useState<SilenceAwareRecorder | null>(null);

  useEffect(() => {
    const silenceAwareRecorder = new SilenceAwareRecorder(options);

    setRecorder(silenceAwareRecorder);

    return () => {
      silenceAwareRecorder.stopRecording();
    };
  }, [silenceDuration, silentThreshold, minDecibels]);

  const startRecording = useCallback(() => {
    recorder?.startRecording();
  }, [recorder]);

  const stopRecording = useCallback(() => {
    recorder?.stopRecording();
  }, [recorder]);

  return { startRecording, stopRecording };
};

export default useSilenceAwareRecorder;
