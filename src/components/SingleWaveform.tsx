import React, { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

interface SingleWaveformProps {
	audioBuffer: AudioBuffer | null;
	currentTime: number;
	duration: number;
	color?: string;
}

export function SingleWaveform({
	audioBuffer,
	currentTime,
	duration,
	color = "rgb(59, 130, 246)",
}: SingleWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { theme } = useTheme();

	const safeCurrentTime = React.useMemo(() => {
		if (typeof currentTime === "number") return currentTime;
		if (currentTime && typeof currentTime === "object" && "value" in currentTime) {
			return Number((currentTime as { value: unknown }).value) || 0;
		}
		return Number(currentTime) || 0;
	}, [currentTime]);

	const safeDuration = React.useMemo(() => {
		if (typeof duration === "number") return duration;
		if (duration && typeof duration === "object" && "value" in duration) {
			return Number((duration as { value: unknown }).value) || 0;
		}
		return Number(duration) || 0;
	}, [duration]);

	useEffect(() => {
		if (!audioBuffer || !canvasRef.current) {
			return;
		}

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}

		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.scale(dpr, dpr);

		const width = rect.width;
		const height = rect.height;

		ctx.clearRect(0, 0, width, height);

		// Get audio data from the first channel (mono)
		const channelData = audioBuffer.getChannelData(0);
		const centerY = height / 2;

		// Draw waveform with visual distinction between played and unplayed parts
		if (safeDuration > 0) {
			const progress = (safeCurrentTime / safeDuration) * width;

			// Draw played portion (brighter, thicker)
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			for (let x = 0; x < progress; x++) {
				const sampleIndex = Math.floor((x / width) * channelData.length);
				const sample = channelData[sampleIndex] || 0;
				const y = centerY + sample * (height / 2) * 0.8;

				if (x === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.stroke();

			// Draw unplayed portion (dimmer, thinner) - theme-aware opacity
			const unplayedOpacity = theme === "light" ? "0.3" : "0.4";
			const unplayedColor = color.replace("rgb", "rgba").replace(")", `, ${unplayedOpacity})`);
			ctx.strokeStyle = unplayedColor;
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let x = progress; x < width; x++) {
				const sampleIndex = Math.floor((x / width) * channelData.length);
				const sample = channelData[sampleIndex] || 0;
				const y = centerY + sample * (height / 2) * 0.8;

				if (x === progress) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.stroke();
		} else {
			// If no duration, draw entire waveform as unplayed - theme-aware opacity
			const unplayedOpacity = theme === "light" ? "0.3" : "0.4";
			const unplayedColor = color.replace("rgb", "rgba").replace(")", `, ${unplayedOpacity})`);
			ctx.strokeStyle = unplayedColor;
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let x = 0; x < width; x++) {
				const sampleIndex = Math.floor((x / width) * channelData.length);
				const sample = channelData[sampleIndex] || 0;
				const y = centerY + sample * (height / 2) * 0.8;

				if (x === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.stroke();
		}

		// Draw center line - theme-aware color
		const centerLineColor = theme === "light" ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
		ctx.strokeStyle = centerLineColor;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, centerY);
		ctx.lineTo(width, centerY);
		ctx.stroke();

		// Draw progress indicator line
		if (safeDuration > 0) {
			const progress = (safeCurrentTime / safeDuration) * width;
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(progress, 0);
			ctx.lineTo(progress, height);
			ctx.stroke();
		}
	}, [audioBuffer, safeCurrentTime, safeDuration, color, theme]);

	if (!audioBuffer) {
		return (
			<div className="w-full h-32 bg-muted rounded-lg overflow-hidden border flex items-center justify-center text-muted-foreground">
				<div className="text-center">
					<div className="text-sm">No audio loaded</div>
					<div className="text-xs mt-1">Upload an audio file to see the waveform</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-32 bg-muted rounded-lg overflow-hidden border">
			<canvas
				ref={canvasRef}
				className="w-full h-full cursor-pointer"
				style={{ width: "100%", height: "100%", display: "block" }}
			/>
		</div>
	);
}
