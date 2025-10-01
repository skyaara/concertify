import { Link } from "@tanstack/react-router";
import { Music, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AudioPlayer } from "../components/AudioPlayer";
import { EffectControls } from "../components/EffectControls";
import { ThemeToggle } from "../components/ThemeToggle";
import { Waveform } from "../components/Waveform";
import { AudioProcessor, type ConcertEffectSettings } from "../lib/audioProcessor";

export function HomePage() {
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
		<div className="min-h-screen bg-background">
			<ThemeToggle />
			<div className="mx-auto px-4 py-8 md:py-16">
				<div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4">
					<div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
						<Music className="w-8 h-8 md:w-12 md:h-12 text-primary" />
						<h1 className="text-4xl md:text-5xl font-bold text-foreground">Concertify</h1>
					</div>
					<p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
						Transform any song into a live concert experience with realistic hall reverb, crowd ambience, and
						professional audio effects.
					</p>
					<div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mt-4 md:mt-6">
						<Link
							to="/"
							className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
						>
							<Music className="w-4 h-4" />
							Audio Effects
						</Link>
						<Link
							to="/stereo-player"
							className="flex items-center gap-2 px-4 py-2 border border-input bg-background text-foreground rounded-md hover:bg-accent transition-colors"
						>
							<Upload className="w-4 h-4" />
							Stereo Player
						</Link>
					</div>
				</div>

				<div className="space-y-6 md:space-y-8">
					<AudioPlayer
						audioProcessor={audioProcessorRef.current}
						onFileLoaded={handleFileLoaded}
						onTimeUpdate={handleTimeUpdate}
						settings={settings}
					/>

					{originalAudioBuffer && (
						<div className="w-full max-w-4xl mx-auto px-4">
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

				<div className="mt-8 md:mt-16 text-center text-sm text-muted-foreground px-4">
					<p>Upload your favorite songs and experience them as if you're in a packed arena!</p>
					<p className="mt-2">All processing happens locally in your browser - your audio never leaves your device.</p>
				</div>
			</div>
		</div>
	);
}
