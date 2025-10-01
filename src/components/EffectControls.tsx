import { Mic, MicVocal, Music2, Sparkles, Waves } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ConcertEffectSettings } from "../lib/audioProcessor";

interface EffectControlsProps {
	settings: ConcertEffectSettings;
	onSettingsChange: (settings: ConcertEffectSettings) => void;
}

export function EffectControls({ settings, onSettingsChange }: EffectControlsProps) {
	const reverbId = useId();
	const bassId = useId();
	const presenceId = useId();
	const maleChorusId = useId();
	const femaleChorusId = useId();

	const handleSliderChange = (key: keyof ConcertEffectSettings, value: number) => {
		onSettingsChange({
			...settings,
			[key]: value,
		});
	};

	return (
		<div className="w-full max-w-4xl mx-auto">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="flex items-center justify-center gap-2 text-2xl">
						<Music2 className="w-6 h-6" />
						Concert Effects
					</CardTitle>
					<CardDescription>Adjust the sliders to customize your concert sound</CardDescription>
				</CardHeader>
				<CardContent className="space-y-8">
					<div className="space-y-6">
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label htmlFor={reverbId} className="flex items-center gap-2 text-base">
									<Waves className="w-5 h-5" />
									Hall Reverb
								</Label>
								<span className="text-sm font-medium text-muted-foreground">
									{Math.round(settings.reverbAmount * 100)}%
								</span>
							</div>
							<Slider
								id={reverbId}
								min={0}
								max={100}
								step={1}
								value={[settings.reverbAmount * 100]}
								onValueChange={(value) => handleSliderChange("reverbAmount", value[0] / 100)}
								className="w-full"
							/>
							<p className="text-xs text-muted-foreground">Simulates the spacious echo of a large concert hall</p>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label htmlFor={bassId} className="flex items-center gap-2 text-base">
									<Sparkles className="w-5 h-5" />
									Bass Boost
								</Label>
								<span className="text-sm font-medium text-muted-foreground">
									{settings.bassBoost > 0 ? "+" : ""}
									{settings.bassBoost.toFixed(1)} dB
								</span>
							</div>
							<Slider
								id={bassId}
								min={-12}
								max={12}
								step={0.5}
								value={[settings.bassBoost]}
								onValueChange={(value) => handleSliderChange("bassBoost", value[0])}
								className="w-full"
							/>
							<p className="text-xs text-muted-foreground">Enhances low frequencies for that thumping concert feel</p>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label htmlFor={presenceId} className="flex items-center gap-2 text-base">
									<Music2 className="w-5 h-5" />
									Vocal Presence
								</Label>
								<span className="text-sm font-medium text-muted-foreground">
									{settings.presence > 0 ? "+" : ""}
									{settings.presence.toFixed(1)} dB
								</span>
							</div>
							<Slider
								id={presenceId}
								min={-12}
								max={12}
								step={0.5}
								value={[settings.presence]}
								onValueChange={(value) => handleSliderChange("presence", value[0])}
								className="w-full"
							/>
							<p className="text-xs text-muted-foreground">Boosts mid-high frequencies for clearer vocals</p>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label htmlFor={maleChorusId} className="flex items-center gap-2 text-base">
									<Mic className="w-5 h-5" />
									Male Chorus
								</Label>
								<span className="text-sm font-medium text-muted-foreground">
									{Math.round(settings.maleChorus * 100)}%
								</span>
							</div>
							<Slider
								id={maleChorusId}
								min={0}
								max={100}
								step={1}
								value={[settings.maleChorus * 100]}
								onValueChange={(value) => handleSliderChange("maleChorus", value[0] / 100)}
								className="w-full"
							/>
							<p className="text-xs text-muted-foreground">Adds lower-pitched harmony voices singing along</p>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label htmlFor={femaleChorusId} className="flex items-center gap-2 text-base">
									<MicVocal className="w-5 h-5" />
									Female Chorus
								</Label>
								<span className="text-sm font-medium text-muted-foreground">
									{Math.round(settings.femaleChorus * 100)}%
								</span>
							</div>
							<Slider
								id={femaleChorusId}
								min={0}
								max={100}
								step={1}
								value={[settings.femaleChorus * 100]}
								onValueChange={(value) => handleSliderChange("femaleChorus", value[0] / 100)}
								className="w-full"
							/>
							<p className="text-xs text-muted-foreground">Adds higher-pitched harmony voices singing along</p>
						</div>
					</div>

					<div className="pt-4 border-t">
						<p className="text-sm font-medium text-muted-foreground mb-3">Quick Presets:</p>
						<div className="flex flex-wrap gap-2">
							<Button
								onClick={() =>
									onSettingsChange({
										reverbAmount: 0.6,
										bassBoost: 4,
										presence: 3,
										maleChorus: 0.4,
										femaleChorus: 0.3,
									})
								}
								size="sm"
							>
								Arena Rock
							</Button>
							<Button
								onClick={() =>
									onSettingsChange({
										reverbAmount: 0.4,
										bassBoost: 6,
										presence: 2,
										maleChorus: 0.5,
										femaleChorus: 0.5,
									})
								}
								size="sm"
							>
								Festival Stage
							</Button>
							<Button
								onClick={() =>
									onSettingsChange({
										reverbAmount: 0.7,
										bassBoost: 2,
										presence: 4,
										maleChorus: 0.2,
										femaleChorus: 0.2,
									})
								}
								size="sm"
							>
								Acoustic Hall
							</Button>
							<Button
								onClick={() =>
									onSettingsChange({
										reverbAmount: 0.5,
										bassBoost: 3,
										presence: 2,
										maleChorus: 0.7,
										femaleChorus: 0.7,
									})
								}
								size="sm"
							>
								Sing-Along
							</Button>
							<Button
								onClick={() =>
									onSettingsChange({
										reverbAmount: 0,
										bassBoost: 0,
										presence: 0,
										maleChorus: 0,
										femaleChorus: 0,
									})
								}
								variant="secondary"
								size="sm"
							>
								Reset
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
