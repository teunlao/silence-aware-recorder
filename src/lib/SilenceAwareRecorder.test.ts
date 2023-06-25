import SilenceAwareRecorder, {
  SilenceAwareRecorderOptions,
  OnVolumeChange,
  OnDataAvailable,
} from './SilenceAwareRecorder';

const mockOnVolumeChange: OnVolumeChange = jest.fn();
const mockOnDataAvailable: OnDataAvailable = jest.fn();
const deviceId = 'test-id';
const gitoptions: SilenceAwareRecorderOptions = {
  onVolumeChange: mockOnVolumeChange,
  onDataAvailable: mockOnDataAvailable,
  deviceId,
};

let recorder: SilenceAwareRecorder;

beforeEach(() => {
  recorder = new SilenceAwareRecorder(options);
});

describe('SilenceAwareRecorder', () => {
  test('initial state', () => {
    expect(recorder).toBeTruthy();
    expect(recorder.isRecording).toBe(false);
    expect(recorder.deviceId).toBe(deviceId);
  });

  // Example for testing startRecording
  test('startRecording - already recording', async () => {
    recorder.isRecording = true;
    await recorder.startRecording();
    expect(recorder.isRecording).toBe(true); // no change in state
  });

  test('setDevice - change device while not recording', () => {
    const newDeviceId = 'new-test-id';
    recorder.setDevice(newDeviceId);
    expect(recorder.deviceId).toBe(newDeviceId); // deviceId changed
  });

  test('stopRecording - when not recording', () => {
    recorder.isRecording = false;
    recorder.stopRecording();
    expect(recorder.isRecording).toBe(false); // no change in state
  });

  test('stopRecording - when recording', async () => {
    jest.useFakeTimers();
    recorder.isRecording = true;
    await recorder.stopRecording();
    jest.advanceTimersByTime(100);
    expect(recorder.isRecording).toBe(false); // it should have stopped
    jest.useRealTimers();
  });
});
