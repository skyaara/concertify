import React, { useEffect, useRef, useState } from "react";

interface WaveformProps {
	audioBuffer: AudioBuffer | null;
	currentTime: number;
	duration: number;
	onChannelToggle?: (channelIndex: number, enabled: boolean) => void;
}

export function Waveform({ audioBuffer, currentTime, duration, onChannelToggle }: WaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [channelStates, setChannelStates] = useState<boolean[]>([]);

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

	// Initialize channel states when audio buffer changes
	useEffect(() => {
		if (audioBuffer) {
			const numChannels = audioBuffer.numberOfChannels;
			setChannelStates(new Array(numChannels).fill(true)); // All channels enabled by default
		}
	}, [audioBuffer]);

	const handleChannelToggle = (channelIndex: number) => {
		setChannelStates((prev) => {
			const newStates = [...prev];
			newStates[channelIndex] = !newStates[channelIndex];
			return newStates;
		});

		if (onChannelToggle) {
			onChannelToggle(channelIndex, !channelStates[channelIndex]);
		}
	};

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

		// Get audio data for all channels
		const numChannels = audioBuffer.numberOfChannels;
		const channelData = [];
		for (let i = 0; i < numChannels; i++) {
			channelData.push(audioBuffer.getChannelData(i));
		}

		const centerY = height / 2;
		const channelHeight = numChannels > 1 ? height / 2 : height;

		// Draw each channel
		for (let channelIndex = 0; channelIndex < numChannels; channelIndex++) {
			const currentChannelData = channelData[channelIndex];
			const channelCenterY = numChannels > 1 ? channelIndex * channelHeight + channelHeight / 2 : centerY;
			const isChannelEnabled = channelStates[channelIndex] !== false;

			// Draw background waveform (played portion)
			if (safeDuration > 0) {
				const progress = (safeCurrentTime / safeDuration) * width;

				// Draw played portion with blue color (dimmed if channel is muted)
				const alpha = isChannelEnabled ? 0.15 : 0.05;
				ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
				ctx.strokeStyle = isChannelEnabled ? "rgb(59, 130, 246)" : "rgba(59, 130, 246, 0.3)";
				ctx.lineWidth = 1;

				ctx.beginPath();
				for (let x = 0; x < progress; x++) {
					const sampleIndex = Math.floor((x / width) * currentChannelData.length);
					const sample = currentChannelData[sampleIndex] || 0;
					const y = channelCenterY + sample * (channelHeight / 2) * 0.8;

					if (x === 0) {
						ctx.moveTo(x, y);
					} else {
						ctx.lineTo(x, y);
					}
				}
				ctx.stroke();

				// Fill the played portion
				ctx.beginPath();
				ctx.moveTo(0, channelCenterY);
				for (let x = 0; x < progress; x++) {
					const sampleIndex = Math.floor((x / width) * currentChannelData.length);
					const sample = currentChannelData[sampleIndex] || 0;
					const y = channelCenterY + sample * (channelHeight / 2) * 0.8;
					ctx.lineTo(x, y);
				}
				ctx.lineTo(progress, channelCenterY);
				ctx.closePath();
				ctx.fill();
			}

			// Draw remaining waveform (unplayed portion)
			const unplayedAlpha = isChannelEnabled ? 0.1 : 0.03;
			ctx.fillStyle = `rgba(147, 51, 234, ${unplayedAlpha})`;
			ctx.strokeStyle = isChannelEnabled ? "rgb(147, 51, 234)" : "rgba(147, 51, 234, 0.3)";
			ctx.lineWidth = 1;

			const startX = safeDuration > 0 ? (safeCurrentTime / safeDuration) * width : 0;

			ctx.beginPath();
			for (let x = startX; x < width; x++) {
				const sampleIndex = Math.floor((x / width) * currentChannelData.length);
				const sample = currentChannelData[sampleIndex] || 0;
				const y = channelCenterY + sample * (channelHeight / 2) * 0.8;

				if (x === startX) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.stroke();

			// Fill the unplayed portion
			ctx.beginPath();
			ctx.moveTo(startX, channelCenterY);
			for (let x = startX; x < width; x++) {
				const sampleIndex = Math.floor((x / width) * currentChannelData.length);
				const sample = currentChannelData[sampleIndex] || 0;
				const y = channelCenterY + sample * (channelHeight / 2) * 0.8;
				ctx.lineTo(x, y);
			}
			ctx.lineTo(width, channelCenterY);
			ctx.closePath();
			ctx.fill();

			// Draw center line for each channel
			ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, channelCenterY);
			ctx.lineTo(width, channelCenterY);
			ctx.stroke();
		}

		// Draw channel labels with checkboxes
		if (numChannels > 1) {
			ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
			ctx.font = "12px system-ui, -apple-system, sans-serif";
			ctx.textAlign = "left";
			ctx.textBaseline = "top";

			for (let channelIndex = 0; channelIndex < numChannels; channelIndex++) {
				const channelCenterY = channelIndex * channelHeight + channelHeight / 2;
				const labelY = channelCenterY - channelHeight / 2 + 8;
				const label = channelIndex === 0 ? "L" : channelIndex === 1 ? "R" : `Ch${channelIndex + 1}`;
				const isChannelEnabled = channelStates[channelIndex] !== false;

				// Draw checkbox
				const checkboxSize = 12;
				const checkboxX = 8;
				const checkboxY = labelY - 2;

				// Checkbox border
				ctx.strokeStyle = isChannelEnabled ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.3)";
				ctx.lineWidth = 1;
				ctx.strokeRect(checkboxX, checkboxY, checkboxSize, checkboxSize);

				// Checkbox fill
				if (isChannelEnabled) {
					ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
					ctx.fillRect(checkboxX + 1, checkboxY + 1, checkboxSize - 2, checkboxSize - 2);
				}

				// Label text
				ctx.fillStyle = isChannelEnabled ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.3)";
				ctx.fillText(label, checkboxX + checkboxSize + 6, labelY);
			}
		}

		// Draw progress indicator line across all channels
		if (safeDuration > 0) {
			const progress = (safeCurrentTime / safeDuration) * width;
			ctx.strokeStyle = "rgb(59, 130, 246)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(progress, 0);
			ctx.lineTo(progress, height);
			ctx.stroke();
		}
	}, [audioBuffer, safeCurrentTime, safeDuration, channelStates]);

	const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		if (!audioBuffer || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const numChannels = audioBuffer.numberOfChannels;
		if (numChannels <= 1) return;

		const channelHeight = rect.height / numChannels;
		const clickedChannel = Math.floor(y / channelHeight);

		// Check if click is within checkbox area
		const checkboxX = 8;
		const checkboxY = clickedChannel * channelHeight + 8;
		const checkboxSize = 12;

		if (x >= checkboxX && x <= checkboxX + checkboxSize && y >= checkboxY && y <= checkboxY + checkboxSize) {
			handleChannelToggle(clickedChannel);
		}
	};

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
				onClick={handleCanvasClick}
			/>
		</div>
	);
}
