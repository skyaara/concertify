import { Download, Pause, Play, StopCircle, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AudioProcessor, ConcertEffectSettings } from "../lib/audioProcessor";

interface AudioPlayerProps {
	audioProcessor: AudioProcessor;
	onFileLoaded: (duration: number) => void;
	onTimeUpdate?: (time: number) => void;
	settings: ConcertEffectSettings;
}

export function AudioPlayer({ audioProcessor, onFileLoaded, onTimeUpdate, settings }: AudioPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isTimerActive, setIsTimerActive] = useState(false);
	const [fileName, setFileName] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const animationFrameRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	const updateTime = useCallback(() => {
		console.log("updateTime called, isTimerActive:", isTimerActive);

		if (!isTimerActive) {
			console.log("Timer not active, returning");
			return;
		}

		const time = audioProcessor.getCurrentTime();
		const dur = audioProcessor.getDuration();

		console.log("Current time:", time, "Duration:", dur);

		if (typeof time !== "number" || typeof dur !== "number" || dur <= 0) {
			console.log("Invalid time/duration, continuing loop");
			if (isTimerActive) {
				animationFrameRef.current = requestAnimationFrame(updateTime);
			}
			return;
		}

		console.log("Setting current time to:", time);
		setCurrentTime(time);

		if (onTimeUpdate) {
			onTimeUpdate(time);
		}

		if (time >= dur && isPlaying) {
			console.log("Audio finished, stopping");
			setIsPlaying(false);
			setIsTimerActive(false);
			setCurrentTime(0);
			audioProcessor.stop();
			return;
		}

		if (isTimerActive) {
			animationFrameRef.current = requestAnimationFrame(updateTime);
		}
	}, [isTimerActive, isPlaying, audioProcessor, onTimeUpdate]);

	// Start animation loop when timer becomes active
	useEffect(() => {
		if (isTimerActive && isPlaying) {
			console.log("Starting animation frame from useEffect");
			animationFrameRef.current = requestAnimationFrame(updateTime);
		}
	}, [isTimerActive, isPlaying, updateTime]);

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			await audioProcessor.loadAudioFile(file);
			const dur = audioProcessor.getDuration();
			setDuration(dur);
			setFileName(file.name);
			setCurrentTime(0);
			setIsPlaying(false);
			onFileLoaded(dur);
		} catch {
			alert("Error loading audio file. Please try a different file.");
		}
	};

	const handlePlay = () => {
		console.log("Play button clicked");
		audioProcessor.play(settings);
		setIsPlaying(true);
		setIsTimerActive(true);
	};

	const handlePause = () => {
		audioProcessor.pause();
		setIsPlaying(false);
		setIsTimerActive(false);
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}
	};

	const handleStop = () => {
		audioProcessor.stop();
		setIsPlaying(false);
		setIsTimerActive(false);
		setCurrentTime(0);
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}
	};

	const handleExport = async () => {
		if (!duration) return;

		setIsExporting(true);
		try {
			const blob = await audioProcessor.exportProcessedAudio(settings);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `concert-${fileName || "audio"}.wav`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			alert("Error exporting audio. Please try again.");
		} finally {
			setIsExporting(false);
		}
	};

	const formatTime = (time: number) => {
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	return (
		<div className="w-full max-w-4xl mx-auto space-y-6">
			<div className="flex flex-col items-center space-y-4">
				<input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
				<Button onClick={() => fileInputRef.current?.click()} size="lg">
					<Upload className="w-5 h-5" />
					{fileName ? "Change Audio File" : "Upload Audio File"}
				</Button>
				{fileName && (
					<p className="text-sm text-muted-foreground">
						Loaded: <span className="font-medium text-foreground">{fileName}</span>
					</p>
				)}
			</div>

			{duration > 0 && (
				<Card className="p-8 space-y-6">
					<div className="flex justify-between items-center text-sm font-medium">
						<span className="text-foreground">{formatTime(currentTime)}</span>
						<span className="text-muted-foreground">{formatTime(duration)}</span>
					</div>

					{(() => {
						const progressValue = duration > 0 && currentTime >= 0 ? (currentTime / duration) * 100 : 0;
						return <Progress value={progressValue} className="h-2" />;
					})()}

					<div className="flex items-center justify-center gap-4">
						{!isPlaying ? (
							<Button onClick={handlePlay} size="icon" className="h-16 w-16" disabled={!duration}>
								<Play className="w-6 h-6 ml-1" fill="currentColor" />
							</Button>
						) : (
							<Button onClick={handlePause} size="icon" className="h-16 w-16">
								<Pause className="w-6 h-6" fill="currentColor" />
							</Button>
						)}

						<Button onClick={handleStop} size="icon" variant="secondary" disabled={!duration}>
							<StopCircle className="w-5 h-5" />
						</Button>

						<Button onClick={handleExport} variant="secondary" disabled={!duration || isExporting}>
							<Download className="w-4 h-4" />
							{isExporting ? "Exporting..." : "Export"}
						</Button>
					</div>
				</Card>
			)}
		</div>
	);
}
