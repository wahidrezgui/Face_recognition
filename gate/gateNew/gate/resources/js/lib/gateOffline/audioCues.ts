/** Short Web Audio beeps — distinct tones per outcome, no bundled audio assets. */
function beep(frequency: number, durationMs: number): void {
    try {
        const AudioContextCtor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
        const ctx = new AudioContextCtor();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);

        oscillator.start();
        oscillator.stop(ctx.currentTime + durationMs / 1000);
        oscillator.onended = () => void ctx.close();
    } catch {
        // Audio unsupported/blocked (autoplay policy, etc.) — not critical to the workflow.
    }
}

export function playSuccessCue(): void {
    beep(880, 120);
}

export function playDuplicateCue(): void {
    beep(660, 200);
}

export function playErrorCue(): void {
    beep(220, 300);
}
