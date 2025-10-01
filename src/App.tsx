import { Music } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AudioPlayer } from "./components/AudioPlayer";
import { EffectControls } from "./components/EffectControls";
import { ThemeToggle } from "./components/ThemeToggle";
import { Waveform } from "./components/Waveform";
import { AudioProcessor, type ConcertEffectSettings } from "./lib/audioProcessor";

function App() {
	const audioProcessorRef = useRef<AudioProcessor>(new AudioProcessor());
	const [settings, setSettings] = useState<ConcertEffectSettings>({
		reverbAmount: 0.5,
		bassBoost: 3,
		presence: 2,
		maleChorus: 0,
		femaleChorus: 0,
	});
	const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
	const [originalAudioBuffer, setOriginalAudioBuffer] = useState<AudioBuffer | null>(null);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);

	const handleTimeUpdate = (time: number) => {
		setCurrentTime(time);
	};

	const handleChannelToggle = (channelIndex: number, enabled: boolean) => {
		// Control audio playback channels
		audioProcessorRef.current.setChannelState(channelIndex, enabled);
		console.log(`Channel ${channelIndex} ${enabled ? "enabled" : "disabled"}`);
	};

	useEffect(() => {
		audioProcessorRef.current.initialize();

		return () => {
			audioProcessorRef.current.dispose();
		};
	}, []);

	useEffect(() => {
		audioProcessorRef.current.updateEffects(settings);
	}, [settings]);

	const handleFileLoaded = (dur: number) => {
		const buffer = audioProcessorRef.current.getAudioBuffer();
		setAudioBuffer(buffer);
		setOriginalAudioBuffer(buffer);
		setDuration(dur);
		setCurrentTime(0);
	};

	return (
		<div className="min-h-screen bg-background flex flex-col justify-center">
			<ThemeToggle />
			<div className="mx-auto px-4 py-16">
				<div className="text-center mb-12 space-y-4">
					<div className="flex items-center justify-center gap-3 mb-4">
						<Music className="w-12 h-12 text-primary" />
						<h1 className="text-5xl font-bold text-foreground">Concertify</h1>
					</div>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Transform any song into a live concert experience with realistic hall reverb, crowd ambience, and
						professional audio effects.
					</p>
				</div>

				<div className="space-y-8">
					<AudioPlayer
						audioProcessor={audioProcessorRef.current}
						onFileLoaded={handleFileLoaded}
						onTimeUpdate={handleTimeUpdate}
						settings={settings}
					/>

					{originalAudioBuffer && (
						<div className="w-full max-w-4xl mx-auto">
							<Waveform
								audioBuffer={originalAudioBuffer}
								currentTime={currentTime}
								duration={duration}
								onChannelToggle={handleChannelToggle}
							/>
						</div>
					)}

					{audioBuffer && <EffectControls settings={settings} onSettingsChange={setSettings} />}
				</div>

				<div className="mt-16 text-center text-sm text-muted-foreground">
					<p>Upload your favorite songs and experience them as if you're in a packed arena!</p>
					<p className="mt-2">All processing happens locally in your browser - your audio never leaves your device.</p>
				</div>
			</div>
		</div>
	);
}

export default App;
