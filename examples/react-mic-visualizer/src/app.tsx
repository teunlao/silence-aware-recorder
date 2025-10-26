import type { Segment } from '@saraudio/core';
import { useSaraudioFallbackReason, useSaraudioMicrophone, useSaraudioPipeline } from '@saraudio/react';
import { createEnergyVadStage } from '@saraudio/vad-energy';
import { useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    void enumerateAudioInputs();
    // Try to prompt permissions so labels appear
    if (navigator.mediaDevices?.getUserMedia) {
      void navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
        void enumerateAudioInputs();
      });
    }
  }, []);

  const vadStage = useMemo(() => createEnergyVadStage({ thresholdDb: -55, smoothMs: 30 }), []);

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
  });

  const fallbackReason = useSaraudioFallbackReason();

  const isRunning = status === 'running' || status === 'acquiring';

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
        </div>
        <div className='controls__buttons'>
          <button type='button' onClick={() => (isRunning ? stop() : start())} disabled={status === 'stopping'}>
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
        {lastVad ? (
          <VADMeter score={lastVad.score} speech={lastVad.speech} />
        ) : (
          <p className='placeholder'>Meter will update once audio chunks arrive.</p>
        )}
        <p className='badge' data-state={isSpeech ? 'speech' : 'silence'}>
          {isSpeech ? 'Speech detected' : 'Silence'}
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
