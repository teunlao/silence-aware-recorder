import type { Segment } from '@saraudio/core';
import { useSaraudioFallbackReason, useSaraudioMicrophone, useSaraudioPipeline } from '@saraudio/react';
import { createEnergyVadStage } from '@saraudio/vad-energy';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(2)} s`;

const formatTimestamp = (ms: number): string => `${(ms / 1000).toFixed(2)} s`;

const VADMeter = ({ score, speech }: { score: number; speech: boolean }) => {
  const percentage = Math.min(100, Math.max(0, Math.round(score * 100)));
  return (
    <div className='vad-meter'>
      <div className='vad-meter__bar' style={{ width: `${percentage}%` }} data-state={speech ? 'speech' : 'silence'} />
      <span className='vad-meter__label'>
        {speech ? 'Speech' : 'Silence'} · score {percentage.toString().padStart(2, '0')}%
      </span>
      <p className='sr-only' aria-live='polite'>
        Speech score {percentage}%
      </p>
    </div>
  );
};

const SegmentList = ({ segments }: { segments: readonly Segment[] }) => {
  if (segments.length === 0) {
    return <p className='placeholder'>Talk into the microphone to capture segments.</p>;
  }

  return (
    <ol className='segment-list'>
      {segments.map((segment) => (
        <li key={segment.id} className='segment-list__item'>
          <span className='segment-list__title'>#{segment.id.slice(0, 6).toUpperCase()}</span>
          <span>start {formatTimestamp(segment.startMs)}</span>
          <span>end {formatTimestamp(segment.endMs)}</span>
          <span>duration {formatDuration(segment.durationMs)}</span>
        </li>
      ))}
    </ol>
  );
};

export const App = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [enumerating, setEnumerating] = useState(false);
  const [enumerationError, setEnumerationError] = useState<string | null>(null);

  const [thresholdDb, setThresholdDb] = useState(-55);
  const [smoothMs, setSmoothMs] = useState(30);
  const [meterLevel, setMeterLevel] = useState(0);
  const [hasVadEvent, setHasVadEvent] = useState(false);

  const analyserStateRef = useRef<{
    context: AudioContext | null;
    analyser: AnalyserNode | null;
    raf: number | null;
  }>({
    context: null,
    analyser: null,
    raf: null,
  });

  const enumerateAudioInputs = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setEnumerationError('Browser does not support device enumeration.');
      setDevices([]);
      return;
    }
    setEnumerating(true);
    setEnumerationError(null);
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((device) => device.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0) {
        setSelectedDeviceId((current) => {
          if (current) return current;
          const firstId = audioInputs[0]?.deviceId ?? '';
          return firstId;
        });
      } else {
        setSelectedDeviceId('');
      }
    } catch (error) {
      setEnumerationError(error instanceof Error ? error.message : 'Failed to enumerate audio devices.');
      setDevices([]);
      setSelectedDeviceId('');
    } finally {
      setEnumerating(false);
    }
  };

  const teardownMeter = useCallback(() => {
    const state = analyserStateRef.current;
    if (state.raf !== null) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }
    if (state.analyser) {
      state.analyser.disconnect();
    }
    state.analyser = null;
    if (state.context) {
      state.context.close().catch(() => undefined);
    }
    state.context = null;
    setMeterLevel(0);
  }, []);

  const handleStream = useCallback(
    (stream: MediaStream | null) => {
      teardownMeter();
      if (!stream) {
        return;
      }
      try {
        const ctx = new AudioContext();
        const sourceNode = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.5;
        sourceNode.connect(analyser);
        analyserStateRef.current = {
          context: ctx,
          analyser,
          raf: null,
        };

        const buffer = new Float32Array(analyser.fftSize);

        const tick = () => {
          const state = analyserStateRef.current;
          if (!state.analyser) {
            return;
          }
          state.analyser.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i += 1) {
            const sample = buffer[i] ?? 0;
            sum += sample * sample;
          }
          const rms = Math.sqrt(sum / buffer.length);
          setMeterLevel(rms);
          state.raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Failed to setup meter, ignore
      }
    },
    [teardownMeter],
  );

  useEffect(() => {
    void enumerateAudioInputs();
    // Try to prompt permissions so labels appear
    if (navigator.mediaDevices?.getUserMedia) {
      void navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
        void enumerateAudioInputs();
      });
    }
  }, []);

  useEffect(
    () => () => {
      teardownMeter();
    },
    [teardownMeter],
  );

  const vadStage = useMemo(() => createEnergyVadStage({ thresholdDb, smoothMs }), [thresholdDb, smoothMs]);

  const { pipeline, isSpeech, lastVad, segments, clearSegments } = useSaraudioPipeline({
    stages: [vadStage],
    retainSegments: 10,
  });

  const audioConstraints = useMemo<MediaTrackConstraints>(() => {
    const constraints: MediaTrackConstraints = {
      channelCount: 1,
      sampleRate: 16000,
    };
    if (selectedDeviceId) {
      constraints.deviceId = { exact: selectedDeviceId };
    }
    return constraints;
  }, [selectedDeviceId]);

  const { status, error, start, stop } = useSaraudioMicrophone({
    pipeline,
    constraints: audioConstraints,
    onStream: handleStream,
  });

  const fallbackReason = useSaraudioFallbackReason();

  useEffect(() => {
    const unsubscribeVad = pipeline.events.on('vad', () => {
      setHasVadEvent(true);
    });
    return () => {
      unsubscribeVad();
    };
  }, [pipeline]);

  const isRunning = status === 'running' || status === 'acquiring';
  const meterPercent = Math.min(100, Math.round(meterLevel * 100));
  const levelDb = meterLevel > 0 ? (20 * Math.log10(meterLevel)).toFixed(1) : '-∞';
  const vadLabel = useMemo(() => {
    if (hasVadEvent) {
      return lastVad?.speech ? 'Speech detected' : 'Silence';
    }
    if (status === 'running') {
      return 'Listening… waiting for speech';
    }
    return 'Silence';
  }, [hasVadEvent, lastVad?.speech, status]);

  const previousStatusRef = useRef(status);
  useEffect(() => {
    if (status === 'running' && previousStatusRef.current !== 'running') {
      setHasVadEvent(false);
    }
    if (status === 'idle' && previousStatusRef.current === 'running') {
      teardownMeter();
    }
    previousStatusRef.current = status;
  }, [status, teardownMeter]);

  const handleStartStop = useCallback(() => {
    if (isRunning) {
      void stop();
      return;
    }
    void start();
  }, [isRunning, start, stop]);

  return (
    <div className='app'>
      <header>
        <h1>SARAUDIO · React Microphone Demo</h1>
        <p>
          This demo uses <code>@saraudio/react</code> hooks on top of the browser runtime. Press&nbsp;
          <strong>Start</strong> to capture the microphone and visualise voice activity.
        </p>
      </header>

      <section className='controls'>
        <div className='controls__device-row'>
          <label className='controls__device'>
            <span>Input device</span>
            <div className='device-select'>
              <select
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
                disabled={enumerating || status === 'running' || status === 'acquiring'}
              >
                {devices.map((device) => (
                  <option key={device.deviceId || `device-${device.label}`} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
              <button
                type='button'
                onClick={() => void enumerateAudioInputs()}
                disabled={enumerating || status === 'running' || status === 'acquiring'}
                className='refresh-button'
                title='Refresh devices'
              >
                Refresh
              </button>
            </div>
          </label>
          <div className='threshold-controls'>
            <label>
              <span>Energy threshold (dB)</span>
              <input
                type='range'
                min='-90'
                max='-5'
                step='1'
                value={thresholdDb}
                onChange={(event) => setThresholdDb(Number(event.target.value))}
              />
              <span className='threshold-value'>{thresholdDb} dB</span>
            </label>
            <label>
              <span>Smoothing (ms)</span>
              <input
                type='range'
                min='5'
                max='200'
                step='5'
                value={smoothMs}
                onChange={(event) => setSmoothMs(Number(event.target.value))}
              />
              <span className='threshold-value'>{smoothMs} ms</span>
            </label>
          </div>
        </div>
        <div className='controls__buttons'>
          <button type='button' onClick={handleStartStop} disabled={status === 'stopping'}>
            {isRunning ? 'Stop' : 'Start'} microphone
          </button>
          <button type='button' onClick={() => clearSegments()} disabled={segments.length === 0}>
            Clear segments
          </button>
        </div>
        <div className='controls__status'>
          {enumerating ? <span className='status status--info'>Scanning devices…</span> : null}
          {devices.length === 0 && !enumerating ? (
            <span className='status status--warning'>No audio inputs found</span>
          ) : null}
          <span className={`status status--${status}`}>Status: {status}</span>
          {fallbackReason ? (
            <span className='status status--warning'>
              Runtime fallback: {fallbackReason === 'worklet-unsupported' ? 'MediaRecorder mode' : fallbackReason}
            </span>
          ) : (
            <span className='status status--ok'>Runtime: worklet preferred</span>
          )}
        </div>
        {enumerationError ? <p className='status status--error'>Device error: {enumerationError}</p> : null}
        {error ? <p className='status status--error'>Error: {error.message}</p> : null}
      </section>

      <section className='vad'>
        <h2>Voice Activity</h2>
        <div className='volume-meter' aria-hidden='true'>
          <div className='volume-meter__bar' style={{ width: `${meterPercent}%` }} />
        </div>
        <p className='volume-meter__label'>
          Input level {meterPercent}% ({levelDb} dBFS)
        </p>
        {lastVad ? (
          <VADMeter score={lastVad.score} speech={lastVad.speech} />
        ) : (
          <p className='placeholder'>Meter will update once audio chunks arrive. Adjust threshold if needed.</p>
        )}
        <p className='badge' data-state={hasVadEvent && isSpeech ? 'speech' : 'silence'}>
          {vadLabel}
        </p>
      </section>

      <section className='segments'>
        <h2>Captured Segments (last {segments.length})</h2>
        <SegmentList segments={segments} />
      </section>

      <footer>
        <p>
          Microphone capture requires HTTPS (or localhost) and user permission. Adjust thresholds inside the demo to
          tune sensitivity for noisy environments.
        </p>
      </footer>
    </div>
  );
};
