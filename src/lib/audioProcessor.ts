export interface ConcertEffectSettings {
	reverbAmount: number;
	bassBoost: number;
	presence: number;
	maleChorus: number;
	femaleChorus: number;
}

export class AudioProcessor {
	private audioContext: AudioContext | null = null;
	private sourceNode: AudioBufferSourceNode | null = null;
	private gainNode: GainNode | null = null;
	private audioBuffer: AudioBuffer | null = null;
	private vocalBuffer: AudioBuffer | null = null;
	private convolverNode: ConvolverNode | null = null;
	private dryGainNode: GainNode | null = null;
	private wetGainNode: GainNode | null = null;
	private bassFilter: BiquadFilterNode | null = null;
	private presenceFilter: BiquadFilterNode | null = null;
	private channelSplitter: ChannelSplitterNode | null = null;
	private channelMerger: ChannelMergerNode | null = null;
	private channelGainNodes: GainNode[] = [];
	private channelStates: boolean[] = [];

	private maleChorusNodes: Array<{
		source: AudioBufferSourceNode;
		delay: DelayNode;
		gain: GainNode;
	}> = [];
	private femaleChorusNodes: Array<{
		source: AudioBufferSourceNode;
		delay: DelayNode;
		gain: GainNode;
	}> = [];
	private maleChorusMixGain: GainNode | null = null;
	private femaleChorusMixGain: GainNode | null = null;

	private isPlaying = false;
	private startTime = 0;
	private pauseTime = 0;

	async initialize() {
		this.audioContext = new AudioContext();
		await this.createImpulseResponse();
	}

	async loadAudioFile(file: File): Promise<void> {
		if (!this.audioContext) {
			await this.initialize();
		}

		const arrayBuffer = await file.arrayBuffer();
		if (!this.audioContext) {
			throw new Error("Audio context not initialized");
		}
		this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
	}

	private async createImpulseResponse() {
		if (!this.audioContext) return;

		const sampleRate = this.audioContext.sampleRate;
		const length = sampleRate * 3;
		const impulse = this.audioContext.createBuffer(2, length, sampleRate);

		for (let channel = 0; channel < 2; channel++) {
			const channelData = impulse.getChannelData(channel);
			for (let i = 0; i < length; i++) {
				const decay = Math.exp(-i / (sampleRate * 0.8));
				channelData[i] = (Math.random() * 2 - 1) * decay;
			}
		}

		this.convolverNode = this.audioContext.createConvolver();
		this.convolverNode.buffer = impulse;
	}

	private createVocalIsolation() {
		if (!this.audioContext || !this.audioBuffer || this.vocalBuffer) return;

		this.vocalBuffer = this.applyVocalIsolation(this.audioBuffer);
	}

	private applyVocalIsolation(buffer: AudioBuffer): AudioBuffer {
		const sampleRate = buffer.sampleRate;
		const numChannels = buffer.numberOfChannels;
		const length = buffer.length;

		if (!this.audioContext) {
			throw new Error("Audio context not initialized");
		}
		const vocalBuffer = this.audioContext.createBuffer(numChannels, length, sampleRate);

		for (let channel = 0; channel < numChannels; channel++) {
			const inputData = buffer.getChannelData(channel);
			const outputData = vocalBuffer.getChannelData(channel);

			for (let i = 0; i < length; i++) {
				const highPassAlpha = 0.95;
				let highPassOutput = 0;

				if (i > 0) {
					highPassOutput = highPassAlpha * (outputData[i - 1] || 0) + (1 - highPassAlpha) * inputData[i];
				} else {
					highPassOutput = inputData[i];
				}

				const lowPassAlpha = 0.9;
				let lowPassOutput = 0;

				if (i > 0) {
					lowPassOutput = lowPassAlpha * (outputData[i - 1] || 0) + (1 - lowPassAlpha) * highPassOutput;
				} else {
					lowPassOutput = highPassOutput;
				}

				const enhancedValue = lowPassOutput * 1.3;
				const compressedValue = Math.sign(enhancedValue) * Math.sqrt(Math.abs(enhancedValue));

				outputData[i] = Math.max(-1, Math.min(1, compressedValue));
			}
		}

		return vocalBuffer;
	}

	setupAudioGraph(settings: ConcertEffectSettings) {
		if (!this.audioContext || !this.audioBuffer) return;

		this.cleanup();

		this.sourceNode = this.audioContext.createBufferSource();
		this.sourceNode.buffer = this.audioBuffer;

		this.gainNode = this.audioContext.createGain();
		this.dryGainNode = this.audioContext.createGain();
		this.wetGainNode = this.audioContext.createGain();

		// Setup channel gain nodes for muting
		this.setupChannelGainNodes();

		this.bassFilter = this.audioContext.createBiquadFilter();
		this.bassFilter.type = "lowshelf";
		this.bassFilter.frequency.value = 200;
		this.bassFilter.gain.value = settings.bassBoost;

		this.presenceFilter = this.audioContext.createBiquadFilter();
		this.presenceFilter.type = "peaking";
		this.presenceFilter.frequency.value = 3000;
		this.presenceFilter.Q.value = 1;
		this.presenceFilter.gain.value = settings.presence;

		this.dryGainNode.gain.value = 1 - settings.reverbAmount;
		this.wetGainNode.gain.value = settings.reverbAmount;

		// Connect through channel gain nodes if multi-channel
		if (this.channelSplitter && this.channelMerger) {
			this.sourceNode.connect(this.channelSplitter);
			this.channelMerger.connect(this.bassFilter);
		} else {
			this.sourceNode.connect(this.bassFilter);
		}

		this.bassFilter.connect(this.presenceFilter);
		this.presenceFilter.connect(this.dryGainNode);
		this.dryGainNode.connect(this.gainNode);

		if (this.convolverNode) {
			this.presenceFilter.connect(this.convolverNode);
			this.convolverNode.connect(this.wetGainNode);
		}
		this.wetGainNode.connect(this.gainNode);

		this.gainNode.connect(this.audioContext.destination);

		this.setupVocalChorus(settings);
	}

	private setupChannelGainNodes() {
		if (!this.audioContext || !this.audioBuffer) return;

		const numChannels = this.audioBuffer.numberOfChannels;
		this.channelGainNodes = [];
		this.channelStates = new Array(numChannels).fill(true); // All channels enabled by default

		// Create channel splitter and merger for multi-channel control
		if (numChannels > 1) {
			this.channelSplitter = this.audioContext.createChannelSplitter(numChannels);
			this.channelMerger = this.audioContext.createChannelMerger(numChannels);

			// Create gain nodes for each channel
			for (let i = 0; i < numChannels; i++) {
				const channelGain = this.audioContext.createGain();
				channelGain.gain.value = 1; // Enabled by default
				this.channelGainNodes.push(channelGain);

				// Connect splitter -> gain -> merger
				this.channelSplitter.connect(channelGain, i);
				channelGain.connect(this.channelMerger, 0, i);
			}
		}
	}

	setChannelState(channelIndex: number, enabled: boolean) {
		if (channelIndex < 0 || channelIndex >= this.channelStates.length) return;

		this.channelStates[channelIndex] = enabled;

		if (this.channelGainNodes[channelIndex] && this.audioContext) {
			const gainValue = enabled ? 1 : 0;
			this.channelGainNodes[channelIndex].gain.setValueAtTime(gainValue, this.audioContext.currentTime);
		}
	}

	getChannelStates(): boolean[] {
		return [...this.channelStates];
	}

	private setupVocalChorus(settings: ConcertEffectSettings) {
		if (!this.audioContext || !this.audioBuffer) return;
		if (settings.maleChorus === 0 && settings.femaleChorus === 0) return;

		if (!this.vocalBuffer) {
			this.createVocalIsolation();
		}

		if (settings.maleChorus > 0) {
			this.maleChorusMixGain = this.audioContext.createGain();
			this.maleChorusMixGain.gain.value = settings.maleChorus * 0.4;

			for (let i = 0; i < 6; i++) {
				const source = this.audioContext.createBufferSource();
				source.buffer = this.vocalBuffer || this.audioBuffer;

				const pitchShift = 0.88 + i * 0.023;
				source.playbackRate.value = pitchShift;

				const delay = this.audioContext.createDelay();
				delay.delayTime.value = 0.05 + i * 0.05;

				const gain = this.audioContext.createGain();
				gain.gain.value = 0.25;

				source.connect(delay);
				delay.connect(gain);
				gain.connect(this.maleChorusMixGain);
				if (this.gainNode) {
					this.maleChorusMixGain.connect(this.gainNode);
				}

				this.maleChorusNodes.push({ source, delay, gain });
			}
		}

		if (settings.femaleChorus > 0) {
			this.femaleChorusMixGain = this.audioContext.createGain();
			this.femaleChorusMixGain.gain.value = settings.femaleChorus * 0.4;

			for (let i = 0; i < 6; i++) {
				const source = this.audioContext.createBufferSource();
				source.buffer = this.vocalBuffer || this.audioBuffer;

				const pitchShift = 1.19 + i * 0.035;
				source.playbackRate.value = pitchShift;

				const delay = this.audioContext.createDelay();
				delay.delayTime.value = 0.06 + i * 0.05;

				const gain = this.audioContext.createGain();
				gain.gain.value = 0.25;

				source.connect(delay);
				delay.connect(gain);
				gain.connect(this.femaleChorusMixGain);
				if (this.gainNode) {
					this.femaleChorusMixGain.connect(this.gainNode);
				}

				this.femaleChorusNodes.push({ source, delay, gain });
			}
		}
	}

	play(settings: ConcertEffectSettings) {
		if (!this.audioContext || !this.audioBuffer) {
			return;
		}

		if (this.audioContext.state === "suspended") {
			this.audioContext.resume();
		}

		this.setupAudioGraph(settings);

		const offset = this.pauseTime;
		if (this.sourceNode) {
			this.sourceNode.start(0, offset);
		}

		for (const node of this.maleChorusNodes) {
			node.source.start(0, offset);
		}

		for (const node of this.femaleChorusNodes) {
			node.source.start(0, offset);
		}

		this.startTime = this.audioContext.currentTime - offset;
		this.isPlaying = true;
	}

	pause() {
		if (!this.isPlaying || !this.audioContext) return;

		this.pauseTime = this.audioContext.currentTime - this.startTime;
		this.cleanup();
		this.isPlaying = false;
	}

	stop() {
		this.cleanup();
		this.pauseTime = 0;
		this.startTime = 0;
		this.isPlaying = false;
	}

	updateEffects(settings: ConcertEffectSettings) {
		if (!this.isPlaying) return;

		if (this.dryGainNode && this.audioContext) {
			this.dryGainNode.gain.setValueAtTime(1 - settings.reverbAmount, this.audioContext.currentTime);
		}
		if (this.wetGainNode && this.audioContext) {
			this.wetGainNode.gain.setValueAtTime(settings.reverbAmount, this.audioContext.currentTime);
		}
		if (this.bassFilter && this.audioContext) {
			this.bassFilter.gain.setValueAtTime(settings.bassBoost, this.audioContext.currentTime);
		}
		if (this.presenceFilter && this.audioContext) {
			this.presenceFilter.gain.setValueAtTime(settings.presence, this.audioContext.currentTime);
		}
		if (this.maleChorusMixGain && this.audioContext) {
			this.maleChorusMixGain.gain.setValueAtTime(settings.maleChorus * 0.4, this.audioContext.currentTime);
		}
		if (this.femaleChorusMixGain && this.audioContext) {
			this.femaleChorusMixGain.gain.setValueAtTime(settings.femaleChorus * 0.4, this.audioContext.currentTime);
		}
	}

	getCurrentTime(): number {
		if (!this.audioContext) {
			return 0;
		}
		if (this.isPlaying) {
			const mainSourceTime = this.audioContext.currentTime - this.startTime;
			return mainSourceTime;
		}
		return this.pauseTime;
	}

	getDuration(): number {
		return this.audioBuffer?.duration || 0;
	}

	getIsPlaying(): boolean {
		return this.isPlaying;
	}

	getAudioBuffer(): AudioBuffer | null {
		return this.audioBuffer;
	}

	async exportProcessedAudio(settings: ConcertEffectSettings): Promise<Blob> {
		if (!this.audioContext || !this.audioBuffer) {
			throw new Error("No audio loaded");
		}

		const offlineContext = new OfflineAudioContext(
			this.audioBuffer.numberOfChannels,
			this.audioBuffer.length,
			this.audioBuffer.sampleRate,
		);

		const sourceNode = offlineContext.createBufferSource();
		sourceNode.buffer = this.audioBuffer;

		const gainNode = offlineContext.createGain();
		const dryGainNode = offlineContext.createGain();
		const wetGainNode = offlineContext.createGain();

		const sampleRate = offlineContext.sampleRate;
		const length = sampleRate * 3;
		const impulse = offlineContext.createBuffer(2, length, sampleRate);

		for (let channel = 0; channel < 2; channel++) {
			const channelData = impulse.getChannelData(channel);
			for (let i = 0; i < length; i++) {
				const decay = Math.exp(-i / (sampleRate * 0.8));
				channelData[i] = (Math.random() * 2 - 1) * decay;
			}
		}

		const convolverNode = offlineContext.createConvolver();
		convolverNode.buffer = impulse;

		const bassFilter = offlineContext.createBiquadFilter();
		bassFilter.type = "lowshelf";
		bassFilter.frequency.value = 200;
		bassFilter.gain.value = settings.bassBoost;

		const presenceFilter = offlineContext.createBiquadFilter();
		presenceFilter.type = "peaking";
		presenceFilter.frequency.value = 3000;
		presenceFilter.Q.value = 1;
		presenceFilter.gain.value = settings.presence;

		dryGainNode.gain.value = 1 - settings.reverbAmount;
		wetGainNode.gain.value = settings.reverbAmount;

		sourceNode.connect(bassFilter);
		bassFilter.connect(presenceFilter);
		presenceFilter.connect(dryGainNode);
		presenceFilter.connect(convolverNode);
		dryGainNode.connect(gainNode);
		convolverNode.connect(wetGainNode);
		wetGainNode.connect(gainNode);
		gainNode.connect(offlineContext.destination);

		sourceNode.start(0);

		const renderedBuffer = await offlineContext.startRendering();

		return this.audioBufferToWav(renderedBuffer);
	}

	private audioBufferToWav(buffer: AudioBuffer): Blob {
		const length = buffer.length * buffer.numberOfChannels * 2;
		const arrayBuffer = new ArrayBuffer(44 + length);
		const view = new DataView(arrayBuffer);

		const writeString = (offset: number, string: string) => {
			for (let i = 0; i < string.length; i++) {
				view.setUint8(offset + i, string.charCodeAt(i));
			}
		};

		writeString(0, "RIFF");
		view.setUint32(4, 36 + length, true);
		writeString(8, "WAVE");
		writeString(12, "fmt ");
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, buffer.numberOfChannels, true);
		view.setUint32(24, buffer.sampleRate, true);
		view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
		view.setUint16(32, buffer.numberOfChannels * 2, true);
		view.setUint16(34, 16, true);
		writeString(36, "data");
		view.setUint32(40, length, true);

		const offset = 44;
		const channels = [];
		for (let i = 0; i < buffer.numberOfChannels; i++) {
			channels.push(buffer.getChannelData(i));
		}

		let index = 0;
		for (let i = 0; i < buffer.length; i++) {
			for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
				const sample = Math.max(-1, Math.min(1, channels[channel][i]));
				view.setInt16(offset + index * 2, sample * 0x7fff, true);
				index++;
			}
		}

		return new Blob([arrayBuffer], { type: "audio/wav" });
	}

	private cleanup() {
		if (this.sourceNode) {
			try {
				this.sourceNode.stop();
			} catch {
				// Source node may already be stopped
			}
			this.sourceNode.disconnect();
			this.sourceNode = null;
		}

		// Cleanup channel gain nodes
		for (const gainNode of this.channelGainNodes) {
			gainNode.disconnect();
		}
		this.channelGainNodes = [];

		if (this.channelSplitter) {
			this.channelSplitter.disconnect();
			this.channelSplitter = null;
		}

		if (this.channelMerger) {
			this.channelMerger.disconnect();
			this.channelMerger = null;
		}

		for (const node of this.maleChorusNodes) {
			try {
				node.source.stop();
			} catch {
				// Source node may already be stopped
			}
			node.source.disconnect();
			node.delay.disconnect();
			node.gain.disconnect();
		}
		this.maleChorusNodes = [];

		if (this.maleChorusMixGain) {
			this.maleChorusMixGain.disconnect();
			this.maleChorusMixGain = null;
		}

		for (const node of this.femaleChorusNodes) {
			try {
				node.source.stop();
			} catch {
				// Source node may already be stopped
			}
			node.source.disconnect();
			node.delay.disconnect();
			node.gain.disconnect();
		}
		this.femaleChorusNodes = [];

		if (this.femaleChorusMixGain) {
			this.femaleChorusMixGain.disconnect();
			this.femaleChorusMixGain = null;
		}

		this.vocalBuffer = null;
	}

	dispose() {
		this.cleanup();
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
	}
}
