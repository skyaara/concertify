import { Link } from "@tanstack/react-router";
import { Music, Pause, Play, Square, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { SingleWaveform } from "../components/SingleWaveform";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";

interface StereoState {
	leftFile: File | null;
	rightFile: File | null;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	leftAudioLoaded: boolean;
	rightAudioLoaded: boolean;
	leftLoading: boolean;
	rightLoading: boolean;
	leftAudioBuffer: AudioBuffer | null;
	rightAudioBuffer: AudioBuffer | null;
	leftPlaying: boolean;
	rightPlaying: boolean;
	leftCurrentTime: number;
	rightCurrentTime: number;
	leftDuration: number;
	rightDuration: number;
}

export function StereoPlayer() {
	const [state, setState] = useState<StereoState>({
		leftFile: null,
		rightFile: null,
		isPlaying: false,
		currentTime: 0,
		duration: 0,
		leftAudioLoaded: false,
		rightAudioLoaded: false,
		leftLoading: false,
		rightLoading: false,
		leftAudioBuffer: null,
		rightAudioBuffer: null,
		leftPlaying: false,
		rightPlaying: false,
		leftCurrentTime: 0,
		rightCurrentTime: 0,
		leftDuration: 0,
		rightDuration: 0,
	});

	const leftAudioRef = useRef<HTMLAudioElement>(null);
	const rightAudioRef = useRef<HTMLAudioElement>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const leftGainNodeRef = useRef<GainNode | null>(null);
	const rightGainNodeRef = useRef<GainNode | null>(null);

	const leftFileId = useId();
	const rightFileId = useId();

	// Initialize audio context and gain nodes
	useEffect(() => {
		const initAudioContext = async () => {
			if (!audioContextRef.current) {
				audioContextRef.current = new AudioContext();

				// Create gain nodes for left and right channels
				leftGainNodeRef.current = audioContextRef.current.createGain();
				rightGainNodeRef.current = audioContextRef.current.createGain();

				// Connect gain nodes to destination
				leftGainNodeRef.current.connect(audioContextRef.current.destination);
				rightGainNodeRef.current.connect(audioContextRef.current.destination);
			}
		};

		initAudioContext();

		return () => {
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, []);

	const handleFileUpload = async (file: File, channel: "left" | "right") => {
		const audioElement = channel === "left" ? leftAudioRef.current : rightAudioRef.current;

		if (audioElement && file) {
			// Set loading state
			setState((prev) => ({
				...prev,
				[`${channel}Loading`]: true,
			}));

			try {
				// Create object URL for the file
				const audioUrl = URL.createObjectURL(file);
				audioElement.src = audioUrl;
				audioElement.crossOrigin = "anonymous";

				// Wait for metadata to load
				await new Promise<void>((resolve, reject) => {
					const handleLoadedMetadata = () => {
						audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
						audioElement.removeEventListener("error", handleError);
						resolve();
					};

					const handleError = () => {
						audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
						audioElement.removeEventListener("error", handleError);
						reject(new Error("Failed to load audio metadata"));
					};

					audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
					audioElement.addEventListener("error", handleError);
					audioElement.load();
				});

				// Decode audio buffer for waveform visualization
				const arrayBuffer = await file.arrayBuffer();
				if (audioContextRef.current) {
					const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

					// Update loaded state with audio buffer and duration
					setState((prev) => ({
						...prev,
						[`${channel}AudioLoaded`]: true,
						[`${channel}Loading`]: false,
						[`${channel}File`]: file,
						[`${channel}AudioBuffer`]: audioBuffer,
						[`${channel}Duration`]: audioElement.duration || 0,
						[`${channel}CurrentTime`]: 0,
					}));
				} else {
					// Fallback if audio context not ready
					setState((prev) => ({
						...prev,
						[`${channel}AudioLoaded`]: true,
						[`${channel}Loading`]: false,
						[`${channel}File`]: file,
						[`${channel}Duration`]: audioElement.duration || 0,
						[`${channel}CurrentTime`]: 0,
					}));
				}
			} catch (error) {
				console.error(`Error loading ${channel} audio:`, error);
				setState((prev) => ({
					...prev,
					[`${channel}Loading`]: false,
					[`${channel}AudioLoaded`]: false,
				}));
			}
		}
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, channel: "left" | "right") => {
		const file = event.target.files?.[0];
		if (file) {
			// Check if file is audio or video
			if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
				handleFileUpload(file, channel);
			} else {
				console.error("Please select an audio or video file");
			}
		}
	};

	const handlePlay = async () => {
		try {
			// Resume audio context if suspended
			if (audioContextRef.current && audioContextRef.current.state === "suspended") {
				await audioContextRef.current.resume();
			}

			// Play both channels if audio is loaded
			const playPromises = [];
			if (leftAudioRef.current && state.leftAudioLoaded) {
				playPromises.push(leftAudioRef.current.play());
			}
			if (rightAudioRef.current && state.rightAudioLoaded) {
				playPromises.push(rightAudioRef.current.play());
			}

			if (playPromises.length > 0) {
				await Promise.all(playPromises);
				setState((prev) => ({
					...prev,
					isPlaying: true,
					leftPlaying: state.leftAudioLoaded,
					rightPlaying: state.rightAudioLoaded,
				}));
			}
		} catch (error) {
			console.error("Error playing audio:", error);
		}
	};

	const handlePause = () => {
		if (leftAudioRef.current && state.leftAudioLoaded) {
			leftAudioRef.current.pause();
		}
		if (rightAudioRef.current && state.rightAudioLoaded) {
			rightAudioRef.current.pause();
		}
		setState((prev) => ({
			...prev,
			isPlaying: false,
			leftPlaying: false,
			rightPlaying: false,
		}));
	};

	const handleStop = () => {
		if (leftAudioRef.current && state.leftAudioLoaded) {
			leftAudioRef.current.pause();
			leftAudioRef.current.currentTime = 0;
		}
		if (rightAudioRef.current && state.rightAudioLoaded) {
			rightAudioRef.current.pause();
			rightAudioRef.current.currentTime = 0;
		}
		setState((prev) => ({
			...prev,
			isPlaying: false,
			currentTime: 0,
			leftPlaying: false,
			rightPlaying: false,
			leftCurrentTime: 0,
			rightCurrentTime: 0,
		}));
	};

	const handleChannelPlayPause = async (channel: "left" | "right") => {
		const audioElement = channel === "left" ? leftAudioRef.current : rightAudioRef.current;
		const isLoaded = channel === "left" ? state.leftAudioLoaded : state.rightAudioLoaded;
		const isPlaying = channel === "left" ? state.leftPlaying : state.rightPlaying;

		if (audioElement && isLoaded) {
			try {
				if (audioContextRef.current && audioContextRef.current.state === "suspended") {
					await audioContextRef.current.resume();
				}

				if (isPlaying) {
					audioElement.pause();
					setState((prev) => ({
						...prev,
						[`${channel}Playing`]: false,
					}));
				} else {
					await audioElement.play();
					setState((prev) => ({
						...prev,
						[`${channel}Playing`]: true,
					}));
				}

				// Update main playing state
				const leftPlaying = channel === "left" ? !isPlaying : state.leftPlaying;
				const rightPlaying = channel === "right" ? !isPlaying : state.rightPlaying;
				setState((prev) => ({
					...prev,
					isPlaying: leftPlaying || rightPlaying,
				}));
			} catch (error) {
				console.error(`Error playing/pausing ${channel} audio:`, error);
			}
		}
	};

	const formatTime = (seconds: number): string => {
		if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const handleSeek = (channel: "left" | "right", time: number) => {
		const audioElement = channel === "left" ? leftAudioRef.current : rightAudioRef.current;
		const isLoaded = channel === "left" ? state.leftAudioLoaded : state.rightAudioLoaded;

		if (audioElement && isLoaded) {
			audioElement.currentTime = time;

			// Update the state immediately for responsive UI
			setState((prev) => ({
				...prev,
				[`${channel}CurrentTime`]: time,
			}));
		}
	};

	const handleTimeUpdate = () => {
		// Update left channel time
		if (leftAudioRef.current && state.leftAudioLoaded) {
			setState((prev) => ({
				...prev,
				leftCurrentTime: leftAudioRef.current?.currentTime || 0,
				leftDuration: leftAudioRef.current?.duration || 0,
			}));
		}

		// Update right channel time
		if (rightAudioRef.current && state.rightAudioLoaded) {
			setState((prev) => ({
				...prev,
				rightCurrentTime: rightAudioRef.current?.currentTime || 0,
				rightDuration: rightAudioRef.current?.duration || 0,
			}));
		}

		// Update main time (use left channel as reference)
		if (leftAudioRef.current) {
			setState((prev) => ({
				...prev,
				currentTime: leftAudioRef.current?.currentTime || 0,
				duration: leftAudioRef.current?.duration || 0,
			}));
		}
	};

	return (
		<div className="min-h-screen bg-background p-4 md:p-8">
			<ThemeToggle />
			<div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
				<div className="text-center space-y-3 md:space-y-4">
					<div className="flex items-center justify-center gap-2 md:gap-3">
						<Upload className="w-6 h-6 md:w-8 md:h-8 text-primary" />
						<h1 className="text-3xl md:text-4xl font-bold text-foreground">Stereo Player</h1>
					</div>
					<p className="text-base md:text-lg text-muted-foreground px-4">
						Upload two different audio/video files and play them simultaneously - one on each channel
					</p>
					<div className="flex justify-center gap-3 md:gap-4 mt-4 md:mt-6">
						<Link
							to="/"
							className="flex items-center gap-2 px-4 py-2 border border-input bg-background text-foreground rounded-md hover:bg-accent transition-colors"
						>
							<Music className="w-4 h-4" />
							Audio Effects
						</Link>
						<Link
							to="/stereo-player"
							className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
						>
							<Upload className="w-4 h-4" />
							Stereo Player
						</Link>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
					{/* Left Channel */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
								Left Channel
							</CardTitle>
							<CardDescription>Upload an audio or video file for the left channel</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={leftFileId}>Audio/Video File</Label>
								<input
									id={leftFileId}
									type="file"
									accept="audio/*,video/*"
									onChange={(e) => handleFileChange(e, "left")}
									className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
								/>
								{state.leftFile && (
									<div className="min-h-[2.5rem] flex items-start">
										<p className="text-sm text-muted-foreground break-words">Selected: {state.leftFile.name}</p>
									</div>
								)}
							</div>

							{/* Left Channel Waveform */}
							{state.leftAudioBuffer && (
								<div className="mt-4">
									<h3 className="text-sm font-medium text-foreground mb-2">Waveform</h3>
									<div className="w-full">
										<SingleWaveform
											audioBuffer={state.leftAudioBuffer}
											currentTime={state.leftCurrentTime}
											duration={state.leftDuration}
											color="rgb(59, 130, 246)" // Blue color for left channel
										/>
									</div>
									<div className="mt-2 space-y-2">
										<div className="flex items-center justify-between">
											<div className="text-xs text-muted-foreground">
												{formatTime(state.leftCurrentTime)} / {formatTime(state.leftDuration)}
											</div>
											<Button
												onClick={() => handleChannelPlayPause("left")}
												variant="outline"
												size="sm"
												className="flex items-center gap-2"
												disabled={!state.leftAudioLoaded}
											>
												{state.leftPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
												{state.leftPlaying ? "Pause" : "Play"} Left
											</Button>
										</div>
										{state.leftDuration > 0 && (
											<div className="px-1">
												<Slider
													value={[state.leftCurrentTime]}
													onValueChange={(values) => handleSeek("left", values[0])}
													min={0}
													max={state.leftDuration}
													step={0.1}
													className="w-full"
												/>
											</div>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Right Channel */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="w-3 h-3 bg-purple-500 rounded-full"></div>
								Right Channel
							</CardTitle>
							<CardDescription>Upload an audio or video file for the right channel</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={rightFileId}>Audio/Video File</Label>
								<input
									id={rightFileId}
									type="file"
									accept="audio/*,video/*"
									onChange={(e) => handleFileChange(e, "right")}
									className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
								/>
								{state.rightFile && (
									<div className="min-h-[2.5rem] flex items-start">
										<p className="text-sm text-muted-foreground break-words">Selected: {state.rightFile.name}</p>
									</div>
								)}
							</div>

							{/* Right Channel Waveform */}
							{state.rightAudioBuffer && (
								<div className="mt-4">
									<h3 className="text-sm font-medium text-foreground mb-2">Waveform</h3>
									<div className="w-full">
										<SingleWaveform
											audioBuffer={state.rightAudioBuffer}
											currentTime={state.rightCurrentTime}
											duration={state.rightDuration}
											color="rgb(147, 51, 234)" // Purple color for right channel
										/>
									</div>
									<div className="mt-2 space-y-2">
										<div className="flex items-center justify-between">
											<div className="text-xs text-muted-foreground">
												{formatTime(state.rightCurrentTime)} / {formatTime(state.rightDuration)}
											</div>
											<Button
												onClick={() => handleChannelPlayPause("right")}
												variant="outline"
												size="sm"
												className="flex items-center gap-2"
												disabled={!state.rightAudioLoaded}
											>
												{state.rightPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
												{state.rightPlaying ? "Pause" : "Play"} Right
											</Button>
										</div>
										{state.rightDuration > 0 && (
											<div className="px-1">
												<Slider
													value={[state.rightCurrentTime]}
													onValueChange={(values) => handleSeek("right", values[0])}
													min={0}
													max={state.rightDuration}
													step={0.1}
													className="w-full"
												/>
											</div>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Audio Controls */}
				<Card>
					<CardHeader>
						<CardTitle>Playback Controls</CardTitle>
						<CardDescription>Control both audio channels simultaneously</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
							<Button
								onClick={handlePlay}
								disabled={state.isPlaying || (!state.leftAudioLoaded && !state.rightAudioLoaded)}
								className="flex items-center gap-2"
							>
								<Play className="w-4 h-4" />
								Play
							</Button>

							<Button
								onClick={handlePause}
								disabled={!state.isPlaying}
								variant="outline"
								className="flex items-center gap-2"
							>
								<Pause className="w-4 h-4" />
								Pause
							</Button>

							<Button onClick={handleStop} variant="outline" className="flex items-center gap-2">
								<Square className="w-4 h-4" />
								Stop
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Hidden audio elements */}
				<audio
					ref={leftAudioRef}
					aria-label="Left channel audio"
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleTimeUpdate}
					crossOrigin="anonymous"
				>
					<track kind="captions" />
				</audio>
				<audio
					ref={rightAudioRef}
					aria-label="Right channel audio"
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleTimeUpdate}
					crossOrigin="anonymous"
				>
					<track kind="captions" />
				</audio>

				<div className="text-center text-sm text-muted-foreground">
					<p>
						<strong>File Upload:</strong> Upload MP3, MP4, or other audio/video files for stereo playback.
					</p>
					<p className="mt-2">
						Supports most common audio and video formats. Audio will be extracted from video files automatically.
					</p>
					<p className="mt-2 text-xs">
						Note: All processing happens locally in your browser - your files never leave your device.
					</p>
				</div>
			</div>
		</div>
	);
}
