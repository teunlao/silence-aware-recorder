import { useEffect, useState } from 'react';
import './index.css';
import { createClient, type LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import useSilenceAwareRecorder from 'silence-aware-recorder/react';

const App = () => {
	const [volume, setVolume] = useState(0);
	const [selectedDevice, setSelectedDevice] = useState('');
	const [deepgramClient] = useState(createClient(import.meta.env.VITE_DEEPGRAM_API_KEY));
	const [deepgramConnection, setDeepgramConnection] = useState<LiveClient | null>(null);

	const { startRecording, stopRecording, isRecording, deviceId, setDevice, availableDevices } = useSilenceAwareRecorder(
		{
			silenceDetectionEnabled: true,
			silenceDuration: 1000,
			silentThreshold: -30,
			timeSlice: 0,
			minDecibels: -100,
			onDataAvailable: (data) => {
				console.log('data', data);
				deepgramConnection?.send(data);
			},
			onVolumeChange: (data) => {
				setVolume(data);
			},
		},
	);

	useEffect(() => {
		setDevice(selectedDevice);
	}, [selectedDevice, setDevice]);

	useEffect(() => {
		const connection = deepgramClient.listen.live({
			model: 'nova-2',
			language: 'ru',
			smart_format: true,
			punctuate: true,
			keywords: [
				'react',
				'vue',
				'angular',
				'vue.js',
				'react.js',
				'javascript',
				'вьюджс',
				'реактджс',
				'ангуляр',
				'эвентлуп',
				'эвент луп',
				'фреймворки',
				'фронтенд',
				'бэкенд',
				'бэкендер',
				'фронтендер',
				'svelte',
				'useState',
			],
		});

		setDeepgramConnection(connection);

		// STEP 3: Listen for events from the live transcription connection
		connection.on(LiveTranscriptionEvents.Open, () => {
			connection.on(LiveTranscriptionEvents.Close, () => {
				console.log('Connection closed.');
			});

			connection.on(LiveTranscriptionEvents.Transcript, (data) => {
				console.log(data.channel.alternatives[0].transcript);
			});

			connection.on(LiveTranscriptionEvents.Metadata, (data) => {
				console.log(data);
			});

			connection.on(LiveTranscriptionEvents.Error, (err) => {
				console.error(err);
			});
		});
	}, [deepgramClient.listen.live]);

	const _start = () => {
		navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
			console.log({ stream });
			const mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event) => {
				console.log('data available');
				if (event.data.size > 0) {
					deepgramConnection?.send(event.data);
				}
			};

			mediaRecorder.start(500);
		});
	};

	return (
		<div>
			<h3>Is Recording: {isRecording.toString()} </h3>
			<div>
				<label> Microphone</label>
				<select
					value={selectedDevice}
					onChange={(event) => {
						setSelectedDevice(event.target.value);
					}}
				>
					{availableDevices?.map((device, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<option key={device.deviceId + index} value={device.deviceId}>
							{device.label || `Microphone ${device.label}`}
						</option>
					))}
				</select>
			</div>
			<h3>Device ID: {deviceId.toString()} </h3>
			<h3 id='volume'>Volume: {volume.toFixed(2)}</h3>
			<button id='startButton' onClick={startRecording}>
				Начать
			</button>
			<button id='stopButton' onClick={stopRecording}>
				Остановить
			</button>
			<div id='audio-list' style={{ display: 'flex', flexDirection: 'column' }} />
		</div>
	);
};

export default App;
