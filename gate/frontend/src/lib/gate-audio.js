let audioContext = null;
const fileCache = new Map();

function getContext() {
    if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            return null;
        }
        audioContext = new AudioCtx();
    }
    return audioContext;
}

export function unlockGateAudio() {
    const ctx = getContext();
    if (ctx?.state === 'suspended') {
        ctx.resume().catch(() => { });
    }
}

function playTone(frequency, duration = 0.14, type = 'sine', volume = 0.08) {
    const ctx = getContext();
    if (!ctx) {
        return;
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
}

async function playFile(path) {
    if (!fileCache.has(path)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        fileCache.set(path, audio);
    }

    const audio = fileCache.get(path);
    if (audio.error) {
        return false;
    }

    try {
        audio.currentTime = 0;
        await audio.play();
        return true;
    } catch {
        return false;
    }
}

async function playNamed(name, path, fallback) {
    unlockGateAudio();
    const played = await playFile(path);
    if (!played) {
        fallback();
    }
}

export function playSuccessSound() {
    playNamed('success', '/sounds/success.wav', () => playTone(880, 0.12));
}

export function playErrorSound() {
    playNamed('error', '/sounds/error.wav', () => playTone(220, 0.2, 'square', 0.06));
}

export function playAlertSound() {
    playNamed('alert', '/sounds/alert.wav', () => {
        playTone(440, 0.1);
        setTimeout(() => playTone(440, 0.1), 140);
    });
}

export function playDakhoolSound() {
    playNamed('dakhool', '/sounds/dakhool.wav', () => playTone(660, 0.16));
}

export function playKharoojSound() {
    playNamed('kharooj', '/sounds/kharooj.wav', () => playTone(520, 0.16));
}
