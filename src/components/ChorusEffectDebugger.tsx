import { Pause, Play, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function ChorusEffectDebugger() {
	const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [numSingers, setNumSingers] = useState(4);
	const [delayBetween, setDelayBetween] = useState(100);
	const [chorusVolume, setChorusVolume] = useState(35);
	const [pitchVariation, setPitchVariation] = useState(5);
	const [useFilter, setUseFilter] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
	const chorusGainRef = useRef<GainNode | null>(null);
	const delayNodesRef = useRef<DelayNode[]>([]);
	const prevNumSingersRef = useRef(3);

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			if (!audioContextRef.current) {
				audioContextRef.current = new AudioContext();
			}

			const arrayBuffer = await file.arrayBuffer();
			const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
			setAudioBuffer(buffer);
		} catch (_error) {
			alert("Error loading audio file");
		}
	};

	const stopAll = () => {
		sourceNodesRef.current.forEach((node) => {
			try {
				node.stop();
				node.disconnect();
			} catch (_e) {}
		});
		sourceNodesRef.current = [];
		delayNodesRef.current = [];
		chorusGainRef.current = null;
	};

	const updateChorusVolume = (value: number) => {
		setChorusVolume(value);
		if (chorusGainRef.current && audioContextRef.current) {
			chorusGainRef.current.gain.setValueAtTime(value / 100, audioContextRef.current.currentTime);
		}
	};

	const updateDelayBetween = (value: number) => {
		setDelayBetween(value);
		if (delayNodesRef.current.length > 0 && audioContextRef.current) {
			const audioContext = audioContextRef.current;
			delayNodesRef.current.forEach((delay, i) => {
				const delayTime = (value / 1000) * (i + 1);
				delay.delayTime.setValueAtTime(delayTime, audioContext.currentTime);
			});
		}
	};

	const handleNumSingersChange = (value: number) => {
		setNumSingers(value);
		prevNumSingersRef.current = value;
	};

	const handlePlay = () => {
		if (!audioContextRef.current || !audioBuffer) return;

		stopAll();

		const ctx = audioContextRef.current;
		const destination = ctx.destination;

		const originalSource = ctx.createBufferSource();
		originalSource.buffer = audioBuffer;
		const originalGain = ctx.createGain();
		originalGain.gain.value = 0.5;
		originalSource.connect(originalGain);
		originalGain.connect(destination);
		originalSource.start(0);
		sourceNodesRef.current.push(originalSource);

		const chorusGain = ctx.createGain();
		chorusGain.gain.value = chorusVolume / 100;
		chorusGain.connect(destination);
		chorusGainRef.current = chorusGain;

		const delays: DelayNode[] = [];

		for (let i = 0; i < numSingers; i++) {
			const source = ctx.createBufferSource();
			source.buffer = audioBuffer;

			const pitchVariationAmount = (pitchVariation / 100) * 0.1;
			const randomPitch = 1 + (Math.random() - 0.5) * pitchVariationAmount;
			source.playbackRate.value = randomPitch;

			const delay = ctx.createDelay();
			const delayTime = (delayBetween / 1000) * (i + 1);
			delay.delayTime.value = delayTime;
			delays.push(delay);

			const gain = ctx.createGain();
			gain.gain.value = 1 / numSingers;

			if (useFilter) {
				const filter = ctx.createBiquadFilter();
				filter.type = "bandpass";
				filter.frequency.value = 1000;
				filter.Q.value = 0.3;

				source.connect(delay);
				delay.connect(gain);
				gain.connect(filter);
				filter.connect(chorusGain);
			} else {
				source.connect(delay);
				delay.connect(gain);
				gain.connect(chorusGain);
			}

			source.start(0);
			sourceNodesRef.current.push(source);
		}

		delayNodesRef.current = delays;

		setIsPlaying(true);
	};

	const handlePause = () => {
		stopAll();
		setIsPlaying(false);
	};

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="max-w-2xl mx-auto space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Chorus Effect Debugger</CardTitle>
						<CardDescription>Debug page to test the crowd singing effect in isolation</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
							<Button onClick={() => fileInputRef.current?.click()} className="w-full">
								<Upload className="w-4 h-4" />
								Upload Test Audio
							</Button>
						</div>

						{audioBuffer && (
							<>
								<div className="space-y-4">
									<div className="flex gap-2">
										{!isPlaying ? (
											<Button onClick={handlePlay} className="flex-1">
												<Play className="w-4 h-4" />
												Play with Chorus
											</Button>
										) : (
											<Button onClick={handlePause} variant="secondary" className="flex-1">
												<Pause className="w-4 h-4" />
												Stop
											</Button>
										)}
									</div>

									<div className="space-y-2">
										<div className="flex justify-between">
											<Label>
												Number of Singers{" "}
												{isPlaying && numSingers !== prevNumSingersRef.current && (
													<span className="text-xs text-orange-500">(restart to apply)</span>
												)}
											</Label>
											<span className="text-sm font-bold text-primary">{numSingers}</span>
										</div>
										<Slider
											value={[numSingers]}
											onValueChange={(v) => handleNumSingersChange(v[0])}
											min={1}
											max={8}
											step={1}
										/>
										<p className="text-xs text-muted-foreground">
											How many people singing along (1-8) - requires restart
										</p>
									</div>

									<div className="space-y-2">
										<div className="flex justify-between">
											<Label>
												Delay Between Singers {isPlaying && <span className="text-xs text-green-500">LIVE</span>}
											</Label>
											<span className="text-sm font-bold text-primary">{delayBetween}ms</span>
										</div>
										<Slider
											value={[delayBetween]}
											onValueChange={(v) => updateDelayBetween(v[0])}
											min={10}
											max={500}
											step={10}
										/>
										<p className="text-xs text-muted-foreground">Time gap between each voice - updates in real-time!</p>
									</div>

									<div className="space-y-2">
										<div className="flex justify-between">
											<Label>Chorus Volume {isPlaying && <span className="text-xs text-green-500">LIVE</span>}</Label>
											<span className="text-sm text-muted-foreground">{chorusVolume}%</span>
										</div>
										<Slider
											value={[chorusVolume]}
											onValueChange={(v) => updateChorusVolume(v[0])}
											min={0}
											max={100}
											step={5}
										/>
										<p className="text-xs text-muted-foreground">How loud the crowd is - updates in real-time!</p>
									</div>

									<div className="space-y-2">
										<div className="flex justify-between">
											<Label>Pitch Variation</Label>
											<span className="text-sm text-muted-foreground">{pitchVariation}%</span>
										</div>
										<Slider
											value={[pitchVariation]}
											onValueChange={(v) => setPitchVariation(v[0])}
											min={0}
											max={10}
											step={1}
										/>
										<p className="text-xs text-muted-foreground">Random pitch difference per singer (0-10%)</p>
									</div>

									<div className="flex items-center justify-between p-3 bg-muted rounded">
										<div>
											<Label>Use Vocal Filter</Label>
											<p className="text-xs text-muted-foreground mt-1">
												Filter to isolate vocals (causes "yap yap" sound)
											</p>
										</div>
										<Button
											variant={useFilter ? "default" : "outline"}
											size="sm"
											onClick={() => setUseFilter(!useFilter)}
										>
											{useFilter ? "ON" : "OFF"}
										</Button>
									</div>
								</div>

								<div className="p-4 bg-muted rounded-lg space-y-2 text-xs font-mono">
									<div className="font-bold text-sm mb-2">Current Settings:</div>
									<div>Singers: {numSingers}</div>
									<div>Delay: {delayBetween}ms between each</div>
									<div>Total Delay Spread: {delayBetween * numSingers}ms</div>
									<div>Chorus Volume: {chorusVolume}%</div>
									<div>Pitch Variation: ±{pitchVariation}%</div>
									<div>Vocal Filter: {useFilter ? "ON (filtered)" : "OFF (full sound)"}</div>
									<div className="text-yellow-600 dark:text-yellow-400 mt-2">
										Check browser console (F12) for detailed logs
									</div>
								</div>

								<div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm space-y-2">
									<div className="font-bold">How to Use:</div>
									<div className="space-y-2 ml-2">
										<div className="p-2 bg-white/50 dark:bg-black/20 rounded">
											<div className="font-semibold">1. Upload a song</div>
										</div>
										<div className="p-2 bg-white/50 dark:bg-black/20 rounded">
											<div className="font-semibold">2. Click "Play with Chorus"</div>
										</div>
										<div className="p-2 bg-white/50 dark:bg-black/20 rounded">
											<div className="font-semibold">3. Adjust sliders in real-time!</div>
											<div className="text-xs mt-1">
												LIVE controls: Volume & Delay
												<br />
												Restart needed: Number of Singers
											</div>
										</div>
									</div>
									<div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
										Pro tip: Start with 3 singers, 80ms delay, 60% volume, Filter OFF. Then experiment with the LIVE
										controls while playing!
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
