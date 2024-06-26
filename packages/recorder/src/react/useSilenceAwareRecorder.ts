import { useState, useEffect, useCallback } from 'react';
import SilenceAwareRecorder, { SilenceAwareRecorderOptions } from '../lib/SilenceAwareRecorder';

const useSilenceAwareRecorder = (options: SilenceAwareRecorderOptions) => {
  const { silenceDuration, silentThreshold, minDecibels, deviceId: initialDeviceId = 'default' } = options;
  const [recorder, setRecorder] = useState<SilenceAwareRecorder | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>(initialDeviceId);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const silenceAwareRecorder = new SilenceAwareRecorder(options);
    silenceAwareRecorder.setDevice(deviceId);
    setRecorder(silenceAwareRecorder);

    return () => {
      silenceAwareRecorder.stopRecording();
    };
  }, [silenceDuration, silentThreshold, minDecibels, deviceId]);

  useEffect(() => {
    if (recorder) {
      recorder.getAvailableDevices().then((availableDevices) => {
        setDevices(availableDevices);
      });
    }
  }, [recorder]);

  const startRecording = useCallback(() => {
    recorder?.startRecording();
    setIsRecording(true);
  }, [recorder]);

  const stopRecording = useCallback(() => {
    recorder?.stopRecording();
    setIsRecording(false);
  }, [recorder]);

  const setDevice = useCallback((newDeviceId: string) => {
    setDeviceId(newDeviceId);
  }, []);

  return {
    availableDevices: devices,
    startRecording,
    stopRecording,
    setDevice,
    isRecording,
    deviceId,
  };
};

export default useSilenceAwareRecorder;
