use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

// ── Voice Effect Preset IDs ──

pub const PRESET_NONE: &str = "none";
pub const PRESET_DEEP: &str = "deep";
pub const PRESET_CHIPMUNK: &str = "chipmunk";
pub const PRESET_ROBOT: &str = "robot";
pub const PRESET_DEMON: &str = "demon";
pub const PRESET_HELIUM: &str = "helium";
pub const PRESET_CAVE: &str = "cave";
pub const PRESET_RADIO: &str = "radio";
pub const PRESET_MEGAPHONE: &str = "megaphone";
pub const PRESET_WHISPER: &str = "whisper";
pub const PRESET_ALIEN: &str = "alien";
pub const PRESET_GHOST: &str = "ghost";
pub const PRESET_DARTH_VADER: &str = "darth_vader";
pub const PRESET_ANIME: &str = "anime";
pub const PRESET_GIANT: &str = "giant";
pub const PRESET_BABY: &str = "baby";
pub const PRESET_OLD_MAN: &str = "old_man";
pub const PRESET_UNDERWATER: &str = "underwater";
pub const PRESET_FAN: &str = "fan";
pub const PRESET_CHORUS: &str = "chorus";
pub const PRESET_CUSTOM: &str = "custom";

/// Describes a voice preset for the frontend
#[derive(Clone, serde::Serialize)]
pub struct VoicePresetInfo {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub category: String,
}

pub fn list_presets() -> Vec<VoicePresetInfo> {
    vec![
        VoicePresetInfo { id: PRESET_NONE.into(), name: "Normal".into(), icon: "🎤".into(), category: "base".into() },
        VoicePresetInfo { id: PRESET_DEEP.into(), name: "Voix Grave".into(), icon: "🔊".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_CHIPMUNK.into(), name: "Chipmunk".into(), icon: "🐿️".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_HELIUM.into(), name: "Hélium".into(), icon: "🎈".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_BABY.into(), name: "Bébé".into(), icon: "👶".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_GIANT.into(), name: "Géant".into(), icon: "🗿".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_OLD_MAN.into(), name: "Vieux Sage".into(), icon: "👴".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_ANIME.into(), name: "Anime".into(), icon: "🌸".into(), category: "pitch".into() },
        VoicePresetInfo { id: PRESET_ROBOT.into(), name: "Robot".into(), icon: "🤖".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_DEMON.into(), name: "Démon".into(), icon: "😈".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_DARTH_VADER.into(), name: "Dark Vador".into(), icon: "⚔️".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_ALIEN.into(), name: "Alien".into(), icon: "👽".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_GHOST.into(), name: "Fantôme".into(), icon: "👻".into(), category: "character".into() },
        VoicePresetInfo { id: PRESET_RADIO.into(), name: "Radio Vintage".into(), icon: "📻".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_MEGAPHONE.into(), name: "Mégaphone".into(), icon: "📢".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_CAVE.into(), name: "Grotte".into(), icon: "🏔️".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_UNDERWATER.into(), name: "Sous l'eau".into(), icon: "🌊".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_WHISPER.into(), name: "Chuchotement".into(), icon: "🤫".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_FAN.into(), name: "Ventilateur".into(), icon: "💨".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_CHORUS.into(), name: "Chorale".into(), icon: "🎶".into(), category: "effect".into() },
        VoicePresetInfo { id: PRESET_CUSTOM.into(), name: "Personnalisé".into(), icon: "🎛️".into(), category: "custom".into() },
    ]
}

// ── DSP Parameters ──

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct VoiceFxParams {
    pub preset: String,
    /// Pitch shift in semitones (-24 to +24)
    pub pitch_shift: f32,
    /// Reverb mix (0.0 = dry, 1.0 = full wet)
    pub reverb_mix: f32,
    /// Reverb decay (0.0 - 1.0), how long tail rings
    pub reverb_decay: f32,
    /// Ring modulator frequency in Hz (0 = off)
    pub ring_mod_freq: f32,
    /// Ring mod mix (0.0 - 1.0)
    pub ring_mod_mix: f32,
    /// Distortion amount (0.0 = clean, 1.0 = max)
    pub distortion: f32,
    /// Low-pass filter cutoff in Hz (20 - 20000)
    pub lowpass_cutoff: f32,
    /// High-pass filter cutoff in Hz (20 - 20000)
    pub highpass_cutoff: f32,
    /// Vibrato rate in Hz
    pub vibrato_rate: f32,
    /// Vibrato depth in semitones
    pub vibrato_depth: f32,
    /// Chorus mix (0.0 - 1.0)
    pub chorus_mix: f32,
    /// Noise gate threshold (0.0 - 1.0)
    pub gate_threshold: f32,
    /// Output gain multiplier
    pub gain: f32,
    /// Noise suppression (RNNoise) — works independently of voice preset
    #[serde(default)]
    pub noise_suppression: bool,
    /// 5-band parametric EQ gains in dB (-12 to +12). Bands: 80, 250, 1000, 3500, 12000 Hz.
    #[serde(default)]
    pub eq_low: f32,
    #[serde(default)]
    pub eq_low_mid: f32,
    #[serde(default)]
    pub eq_mid: f32,
    #[serde(default)]
    pub eq_high_mid: f32,
    #[serde(default)]
    pub eq_high: f32,
}

impl Default for VoiceFxParams {
    fn default() -> Self {
        Self {
            preset: PRESET_NONE.into(),
            pitch_shift: 0.0,
            reverb_mix: 0.0,
            reverb_decay: 0.5,
            ring_mod_freq: 0.0,
            ring_mod_mix: 0.0,
            distortion: 0.0,
            lowpass_cutoff: 20000.0,
            highpass_cutoff: 20.0,
            vibrato_rate: 0.0,
            vibrato_depth: 0.0,
            chorus_mix: 0.0,
            gate_threshold: 0.0,
            gain: 1.0,
            noise_suppression: false,
            eq_low: 0.0,
            eq_low_mid: 0.0,
            eq_mid: 0.0,
            eq_high_mid: 0.0,
            eq_high: 0.0,
        }
    }
}

impl VoiceFxParams {
    pub fn from_preset(preset: &str) -> Self {
        let mut p = Self::default();
        p.preset = preset.to_string();
        match preset {
            PRESET_NONE => {}
            PRESET_DEEP => {
                p.pitch_shift = -6.0;
                p.gain = 1.1;
            }
            PRESET_CHIPMUNK => {
                p.pitch_shift = 10.0;
                p.gain = 0.9;
            }
            PRESET_HELIUM => {
                p.pitch_shift = 14.0;
                p.gain = 0.85;
            }
            PRESET_BABY => {
                p.pitch_shift = 8.0;
                p.lowpass_cutoff = 5000.0;
                p.gain = 0.9;
            }
            PRESET_GIANT => {
                p.pitch_shift = -10.0;
                p.reverb_mix = 0.25;
                p.reverb_decay = 0.6;
                p.gain = 1.2;
            }
            PRESET_OLD_MAN => {
                p.pitch_shift = -4.0;
                p.vibrato_rate = 5.0;
                p.vibrato_depth = 0.3;
                p.lowpass_cutoff = 4000.0;
            }
            PRESET_ANIME => {
                p.pitch_shift = 6.0;
                p.lowpass_cutoff = 8000.0;
                p.gain = 1.1;
            }
            PRESET_ROBOT => {
                p.ring_mod_freq = 150.0;
                p.ring_mod_mix = 0.6;
                p.distortion = 0.15;
                p.reverb_mix = 0.1;
                p.reverb_decay = 0.3;
            }
            PRESET_DEMON => {
                p.pitch_shift = -12.0;
                p.ring_mod_freq = 50.0;
                p.ring_mod_mix = 0.35;
                p.distortion = 0.3;
                p.reverb_mix = 0.4;
                p.reverb_decay = 0.7;
                p.gain = 1.3;
            }
            PRESET_DARTH_VADER => {
                p.pitch_shift = -8.0;
                p.ring_mod_freq = 30.0;
                p.ring_mod_mix = 0.2;
                p.distortion = 0.05;
                p.reverb_mix = 0.15;
                p.reverb_decay = 0.4;
                p.lowpass_cutoff = 3500.0;
                p.gain = 1.2;
                // Breathing-like vibrato
                p.vibrato_rate = 0.8;
                p.vibrato_depth = 0.15;
            }
            PRESET_ALIEN => {
                p.pitch_shift = 4.0;
                p.ring_mod_freq = 300.0;
                p.ring_mod_mix = 0.45;
                p.reverb_mix = 0.3;
                p.reverb_decay = 0.5;
                p.vibrato_rate = 8.0;
                p.vibrato_depth = 0.5;
            }
            PRESET_GHOST => {
                p.pitch_shift = -2.0;
                p.reverb_mix = 0.7;
                p.reverb_decay = 0.85;
                p.chorus_mix = 0.5;
                p.lowpass_cutoff = 4000.0;
                p.gain = 0.8;
            }
            PRESET_RADIO => {
                p.highpass_cutoff = 400.0;
                p.lowpass_cutoff = 3000.0;
                p.distortion = 0.2;
                p.gain = 1.3;
            }
            PRESET_MEGAPHONE => {
                p.highpass_cutoff = 600.0;
                p.lowpass_cutoff = 4000.0;
                p.distortion = 0.35;
                p.gain = 1.5;
            }
            PRESET_CAVE => {
                p.reverb_mix = 0.7;
                p.reverb_decay = 0.9;
                p.lowpass_cutoff = 6000.0;
            }
            PRESET_UNDERWATER => {
                p.lowpass_cutoff = 800.0;
                p.reverb_mix = 0.4;
                p.reverb_decay = 0.6;
                p.vibrato_rate = 3.0;
                p.vibrato_depth = 0.4;
                p.gain = 0.8;
            }
            PRESET_WHISPER => {
                p.distortion = 0.5;
                p.highpass_cutoff = 1000.0;
                p.lowpass_cutoff = 6000.0;
                p.gain = 0.5;
            }
            PRESET_FAN => {
                p.ring_mod_freq = 80.0;
                p.ring_mod_mix = 0.15;
                p.vibrato_rate = 12.0;
                p.vibrato_depth = 0.2;
                p.lowpass_cutoff = 5000.0;
            }
            PRESET_CHORUS => {
                p.chorus_mix = 0.7;
                p.reverb_mix = 0.2;
                p.reverb_decay = 0.5;
            }
            _ => {}
        }
        p
    }
}

// ── 5-Band Parametric EQ ──
// Peaking EQ biquad filters (Audio EQ Cookbook by Robert Bristow-Johnson)

const EQ_BAND_COUNT: usize = 5;
const EQ_FREQS: [f32; EQ_BAND_COUNT] = [80.0, 250.0, 1000.0, 3500.0, 12000.0];
const EQ_DEFAULT_Q: f32 = 1.0;

#[derive(Clone)]
struct EqBand {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    z1: f32,
    z2: f32,
}

impl EqBand {
    fn flat() -> Self {
        Self { b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0, z1: 0.0, z2: 0.0 }
    }

    /// Calculate peaking EQ biquad coefficients.
    fn calc_peaking(freq: f32, gain_db: f32, q: f32, sample_rate: f32) -> Self {
        if gain_db.abs() < 0.01 {
            return Self::flat();
        }
        let a = 10.0_f32.powf(gain_db / 40.0); // sqrt(10^(dB/20))
        let w0 = 2.0 * std::f32::consts::PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);

        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_w0;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha / a;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            z1: 0.0,
            z2: 0.0,
        }
    }

    /// Process a single sample through this biquad (Direct Form II Transposed).
    #[inline]
    fn process_sample(&mut self, input: f32) -> f32 {
        let out = self.b0 * input + self.z1;
        self.z1 = self.b1 * input - self.a1 * out + self.z2;
        self.z2 = self.b2 * input - self.a2 * out;
        out
    }
}

// ── DSP Processor ──

// ── TD-PSOLA Pitch Shifter with YIN Pitch Detection ──
// Time-Domain Pitch Synchronous Overlap-Add: preserves vocal formants
// for natural-sounding pitch shifting (unlike STFT which shifts formants).
// Uses the YIN algorithm for robust monophonic pitch detection with
// sub-sample accuracy via parabolic interpolation.

const PSOLA_RING_SIZE: usize = 8192;
const PSOLA_OLA_SIZE: usize = 8192;
const PSOLA_MIN_F0: f32 = 60.0;
const PSOLA_MAX_F0: f32 = 1000.0;
const YIN_THRESHOLD: f32 = 0.15;
const PSOLA_DETECT_INTERVAL: usize = 256;

struct PsolaPitchShifter {
    _sample_rate: f32,
    min_period: usize,
    max_period: usize,

    // Circular input buffer
    input: Vec<f32>,
    in_pos: usize,

    // OLA output ring buffer
    ola: Vec<f32>,
    ola_read: usize,
    ola_write: usize,

    // State
    current_period: f32,
    grain_timer: f32,
    detect_timer: usize,

    // Warmup / latency
    latency: usize,
    warmup: usize,
}

impl PsolaPitchShifter {
    fn new(sample_rate: f32) -> Self {
        let min_period = (sample_rate / PSOLA_MAX_F0).ceil() as usize;
        let max_period = (sample_rate / PSOLA_MIN_F0).ceil() as usize;
        let latency = max_period * 2;

        Self {
            _sample_rate: sample_rate,
            min_period,
            max_period,
            input: vec![0.0; PSOLA_RING_SIZE],
            in_pos: 0,
            ola: vec![0.0; PSOLA_OLA_SIZE],
            ola_read: 0,
            ola_write: latency,
            current_period: sample_rate / 150.0,
            grain_timer: 0.0,
            detect_timer: 0,
            latency,
            warmup: latency,
        }
    }

    /// YIN pitch detection algorithm.
    /// Returns detected period in samples, or None for unvoiced segments.
    fn yin_detect(&self, center: usize) -> Option<f32> {
        let w = self.max_period;

        // Step 1: Difference function
        let mut d = vec![0.0f32; self.max_period + 1];
        for tau in 1..=self.max_period {
            let mut sum = 0.0f32;
            for j in 0..w {
                let idx_a = (center + PSOLA_RING_SIZE - w + j) % PSOLA_RING_SIZE;
                let idx_b = (center + PSOLA_RING_SIZE - w + j + tau) % PSOLA_RING_SIZE;
                let diff = self.input[idx_a] - self.input[idx_b];
                sum += diff * diff;
            }
            d[tau] = sum;
        }

        // Step 2: Cumulative mean normalized difference
        let mut d_prime = vec![1.0f32; self.max_period + 1];
        let mut running = 0.0f32;
        for tau in 1..=self.max_period {
            running += d[tau];
            d_prime[tau] = if running > 1e-10 {
                d[tau] * tau as f32 / running
            } else {
                1.0
            };
        }

        // Step 3: Absolute threshold search with local minimum
        let mut tau = self.min_period;
        while tau <= self.max_period {
            if d_prime[tau] < YIN_THRESHOLD {
                // Walk to local minimum
                while tau + 1 <= self.max_period && d_prime[tau + 1] < d_prime[tau] {
                    tau += 1;
                }
                // Step 4: Parabolic interpolation for sub-sample accuracy
                if tau > 1 && tau < self.max_period {
                    let s0 = d_prime[tau - 1];
                    let s1 = d_prime[tau];
                    let s2 = d_prime[tau + 1];
                    let denom = 2.0 * (s0 - 2.0 * s1 + s2);
                    if denom.abs() > 1e-10 {
                        return Some(tau as f32 + (s0 - s2) / denom);
                    }
                }
                return Some(tau as f32);
            }
            tau += 1;
        }

        None // Unvoiced segment
    }

    /// Place a Hanning-windowed grain into the OLA buffer.
    fn place_grain(&mut self, input_center: usize, period: usize) {
        let grain_len = period * 2;
        if grain_len == 0 || grain_len >= PSOLA_OLA_SIZE / 2 {
            return;
        }

        for j in 0..grain_len {
            let offset = j as isize - period as isize;

            let in_idx = ((input_center as isize + offset)
                .rem_euclid(PSOLA_RING_SIZE as isize)) as usize;

            let ola_idx = ((self.ola_write as isize + offset)
                .rem_euclid(PSOLA_OLA_SIZE as isize)) as usize;

            // Hanning window
            let w = 0.5
                * (1.0
                    - (2.0 * std::f32::consts::PI * j as f32 / grain_len as f32)
                        .cos());

            self.ola[ola_idx] += self.input[in_idx] * w;
        }
    }

    /// Process a buffer of samples in-place with the given pitch shift factor.
    /// pitch_factor = 2^(semitones/12). E.g. 1.0 = no shift, 2.0 = octave up.
    fn process(&mut self, data: &mut [f32], pitch_factor: f32) {
        for i in 0..data.len() {
            // Store input into ring buffer
            self.input[self.in_pos] = data[i];
            self.in_pos = (self.in_pos + 1) % PSOLA_RING_SIZE;

            // Warmup: accumulate input, output silence
            if self.warmup > 0 {
                self.warmup -= 1;
                data[i] = 0.0;
                continue;
            }

            // Periodic pitch detection (YIN)
            self.detect_timer += 1;
            if self.detect_timer >= PSOLA_DETECT_INTERVAL {
                self.detect_timer = 0;
                let center =
                    (self.in_pos + PSOLA_RING_SIZE - self.latency / 2) % PSOLA_RING_SIZE;
                if let Some(p) = self.yin_detect(center) {
                    // Smooth transition to avoid discontinuities
                    self.current_period = self.current_period * 0.7 + p * 0.3;
                }
            }

            // Grain synthesis: place a new grain every synth_period samples
            self.grain_timer += 1.0;
            let synth_period = (self.current_period / pitch_factor)
                .max(self.min_period as f32)
                .min(self.max_period as f32);

            if self.grain_timer >= synth_period {
                self.grain_timer -= synth_period;

                let period = (self.current_period.round() as usize)
                    .max(self.min_period)
                    .min(self.max_period);
                let center =
                    (self.in_pos + PSOLA_RING_SIZE - self.latency) % PSOLA_RING_SIZE;

                self.place_grain(center, period);

                // Advance OLA write position by synthesis period
                let advance = synth_period.round().max(1.0) as usize;
                self.ola_write = (self.ola_write + advance) % PSOLA_OLA_SIZE;
            }

            // Read output from OLA buffer
            data[i] = self.ola[self.ola_read];
            self.ola[self.ola_read] = 0.0; // Clear after read
            self.ola_read = (self.ola_read + 1) % PSOLA_OLA_SIZE;
        }
    }
}

// ── RNNoise Denoiser Wrapper ──

const DENOISE_FRAME: usize = nnnoiseless::DenoiseState::FRAME_SIZE; // 480

struct NoiseProcessor {
    denoise: Box<nnnoiseless::DenoiseState<'static>>,
    in_buf: Vec<f32>,
    in_pos: usize,
    out_buf: VecDeque<f32>,
    first_frame: bool,
}

impl NoiseProcessor {
    fn new() -> Self {
        Self {
            denoise: nnnoiseless::DenoiseState::new(),
            in_buf: vec![0.0; DENOISE_FRAME],
            in_pos: 0,
            out_buf: VecDeque::with_capacity(DENOISE_FRAME * 2),
            first_frame: true,
        }
    }

    /// Process audio buffer in-place with RNNoise denoising.
    /// Expects f32 samples in [-1.0, 1.0] range.
    /// Operates at any sample rate but is optimized for 48 kHz.
    fn process(&mut self, data: &mut [f32]) {
        for i in 0..data.len() {
            // Accumulate input in i16 range (nnnoiseless expects [-32768, 32767])
            self.in_buf[self.in_pos] = data[i] * 32767.0;
            self.in_pos += 1;

            if self.in_pos >= DENOISE_FRAME {
                self.in_pos = 0;

                // Process frame
                let mut out_frame = vec![0.0f32; DENOISE_FRAME];
                self.denoise
                    .process_frame(&mut out_frame, &self.in_buf);

                if self.first_frame {
                    // Discard first output frame (contains fade-in artifacts)
                    self.first_frame = false;
                    // Push zeros to maintain timing
                    for _ in 0..DENOISE_FRAME {
                        self.out_buf.push_back(0.0);
                    }
                } else {
                    // Convert back to [-1.0, 1.0] and push to output
                    for &s in &out_frame {
                        self.out_buf.push_back(s / 32767.0);
                    }
                }
            }

            // Pop denoised sample (or 0 if not yet available)
            data[i] = self.out_buf.pop_front().unwrap_or(0.0);
        }
    }
}

/// Real-time voice effects processor.
/// Designed for buffer processing within cpal callbacks.
pub struct VoiceFxProcessor {
    sample_rate: f32,
    pub params: VoiceFxParams,

    // TD-PSOLA pitch shifter (formant-preserving)
    pitch_shifter: PsolaPitchShifter,

    // RNNoise denoiser
    denoiser: NoiseProcessor,

    // Reverb (Schroeder design: 4 comb + 2 allpass)
    comb_bufs: [Vec<f32>; 4],
    comb_pos: [usize; 4],
    allpass_bufs: [Vec<f32>; 2],
    allpass_pos: [usize; 2],

    // Ring modulator
    ring_phase: f64,

    // Filters (biquad)
    lp_z1: f32,
    lp_z2: f32,
    lp_a1: f32,
    lp_a2: f32,
    lp_b0: f32,
    lp_b1: f32,
    lp_b2: f32,
    hp_z1: f32,
    hp_z2: f32,
    hp_a1: f32,
    hp_a2: f32,
    hp_b0: f32,
    hp_b1: f32,
    hp_b2: f32,

    // Vibrato LFO
    vibrato_phase: f64,

    // Chorus (3-voice)
    chorus_buf: Vec<f32>,
    chorus_write_pos: usize,
    chorus_phases: [f64; 3],

    // Noise gate
    gate_env: f32,

    // 5-band parametric EQ
    eq_bands: [EqBand; EQ_BAND_COUNT],
}

impl VoiceFxProcessor {
    pub fn new(sample_rate: f32) -> Self {
        let sr = sample_rate as usize;

        // Schroeder reverb comb filter delays (in samples, tuned for room)
        let comb_lens = [
            (sr as f32 * 0.0297) as usize, // 29.7ms
            (sr as f32 * 0.0371) as usize, // 37.1ms
            (sr as f32 * 0.0411) as usize, // 41.1ms
            (sr as f32 * 0.0437) as usize, // 43.7ms
        ];
        let comb_bufs = [
            vec![0.0f32; comb_lens[0].max(1)],
            vec![0.0f32; comb_lens[1].max(1)],
            vec![0.0f32; comb_lens[2].max(1)],
            vec![0.0f32; comb_lens[3].max(1)],
        ];

        // Allpass delays
        let allpass_lens = [
            (sr as f32 * 0.005) as usize,  // 5ms
            (sr as f32 * 0.0017) as usize, // 1.7ms
        ];
        let allpass_bufs = [
            vec![0.0f32; allpass_lens[0].max(1)],
            vec![0.0f32; allpass_lens[1].max(1)],
        ];

        // Chorus buffer: ~50ms
        let chorus_len = (sr as f32 * 0.05) as usize;

        let mut proc = Self {
            sample_rate,
            params: VoiceFxParams::default(),

            pitch_shifter: PsolaPitchShifter::new(sample_rate),
            denoiser: NoiseProcessor::new(),

            comb_bufs,
            comb_pos: [0; 4],
            allpass_bufs,
            allpass_pos: [0; 2],

            ring_phase: 0.0,

            lp_z1: 0.0,
            lp_z2: 0.0,
            lp_a1: 0.0,
            lp_a2: 0.0,
            lp_b0: 1.0,
            lp_b1: 0.0,
            lp_b2: 0.0,
            hp_z1: 0.0,
            hp_z2: 0.0,
            hp_a1: 0.0,
            hp_a2: 0.0,
            hp_b0: 1.0,
            hp_b1: 0.0,
            hp_b2: 0.0,

            vibrato_phase: 0.0,

            chorus_buf: vec![0.0; chorus_len.max(1)],
            chorus_write_pos: 0,
            chorus_phases: [0.0, 0.33, 0.66],

            gate_env: 0.0,

            eq_bands: std::array::from_fn(|_| EqBand::flat()),
        };

        proc.recalc_filters();
        proc
    }

    pub fn set_params(&mut self, params: VoiceFxParams) {
        self.params = params;
        self.recalc_filters();
    }

    fn recalc_filters(&mut self) {
        let lp_freq = self
            .params
            .lowpass_cutoff
            .max(20.0)
            .min(self.sample_rate * 0.49);
        self.calc_lowpass(lp_freq);

        let hp_freq = self
            .params
            .highpass_cutoff
            .max(20.0)
            .min(self.sample_rate * 0.49);
        self.calc_highpass(hp_freq);

        // Recalculate 5-band parametric EQ
        let eq_gains = [
            self.params.eq_low,
            self.params.eq_low_mid,
            self.params.eq_mid,
            self.params.eq_high_mid,
            self.params.eq_high,
        ];
        for i in 0..EQ_BAND_COUNT {
            let freq = EQ_FREQS[i].min(self.sample_rate * 0.49);
            self.eq_bands[i] = EqBand::calc_peaking(freq, eq_gains[i], EQ_DEFAULT_Q, self.sample_rate);
        }
    }

    fn calc_lowpass(&mut self, freq: f32) {
        let w0 = 2.0 * std::f32::consts::PI * freq / self.sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * 0.707);
        let a0 = 1.0 + alpha;
        self.lp_b0 = ((1.0 - cos_w0) / 2.0) / a0;
        self.lp_b1 = (1.0 - cos_w0) / a0;
        self.lp_b2 = self.lp_b0;
        self.lp_a1 = (-2.0 * cos_w0) / a0;
        self.lp_a2 = (1.0 - alpha) / a0;
    }

    fn calc_highpass(&mut self, freq: f32) {
        let w0 = 2.0 * std::f32::consts::PI * freq / self.sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * 0.707);
        let a0 = 1.0 + alpha;
        self.hp_b0 = ((1.0 + cos_w0) / 2.0) / a0;
        self.hp_b1 = (-(1.0 + cos_w0)) / a0;
        self.hp_b2 = self.hp_b0;
        self.hp_a1 = (-2.0 * cos_w0) / a0;
        self.hp_a2 = (1.0 - alpha) / a0;
    }

    /// Process a buffer of mono f32 samples in-place.
    pub fn process(&mut self, data: &mut [f32]) {
        // ── Step 1: Noise suppression (RNNoise) ──
        // Runs independently of voice preset — always active when enabled
        if self.params.noise_suppression {
            self.denoiser.process(data);
        }

        if self.params.preset == PRESET_NONE {
            return;
        }

        // ── Step 2: Noise gate (simple, before pitch shift) ──
        if self.params.gate_threshold > 0.0 {
            for s in data.iter_mut() {
                let abs = s.abs();
                if abs > self.gate_env {
                    self.gate_env = abs;
                } else {
                    self.gate_env *= 0.9995;
                }
                if self.gate_env < self.params.gate_threshold {
                    *s = 0.0;
                }
            }
        }

        // ── Step 3: Pitch shift (STFT phase vocoder) ──
        if self.params.pitch_shift.abs() > 0.01 {
            let ratio = 2.0_f32.powf(self.params.pitch_shift / 12.0);
            self.pitch_shifter.process(data, ratio);
        }

        // ── Step 4: Per-sample effects ──
        for i in 0..data.len() {
            let mut s = data[i];

            // Ring modulator
            if self.params.ring_mod_freq > 0.0 && self.params.ring_mod_mix > 0.0 {
                let modulator =
                    (2.0 * std::f64::consts::PI * self.ring_phase).sin() as f32;
                self.ring_phase +=
                    self.params.ring_mod_freq as f64 / self.sample_rate as f64;
                if self.ring_phase >= 1.0 {
                    self.ring_phase -= 1.0;
                }
                let ring = s * modulator;
                s = s * (1.0 - self.params.ring_mod_mix)
                    + ring * self.params.ring_mod_mix;
            }

            // Vibrato (amplitude modulation)
            if self.params.vibrato_rate > 0.0 && self.params.vibrato_depth > 0.0 {
                let lfo =
                    (2.0 * std::f64::consts::PI * self.vibrato_phase).sin() as f32;
                self.vibrato_phase +=
                    self.params.vibrato_rate as f64 / self.sample_rate as f64;
                if self.vibrato_phase >= 1.0 {
                    self.vibrato_phase -= 1.0;
                }
                let depth = self.params.vibrato_depth * 0.3;
                s *= 1.0 + lfo * depth;
            }

            // Distortion (soft clip)
            if self.params.distortion > 0.0 {
                let drive = 1.0 + self.params.distortion * 20.0;
                s = (s * drive).tanh();
            }

            // Low-pass filter (biquad)
            if self.params.lowpass_cutoff < 19900.0 {
                let out = self.lp_b0 * s + self.lp_b1 * self.lp_z1
                    + self.lp_b2 * self.lp_z2
                    - self.lp_a1 * self.lp_z1
                    - self.lp_a2 * self.lp_z2;
                self.lp_z2 = self.lp_z1;
                self.lp_z1 = out;
                s = out;
            }

            // High-pass filter (biquad)
            if self.params.highpass_cutoff > 25.0 {
                let out = self.hp_b0 * s + self.hp_b1 * self.hp_z1
                    + self.hp_b2 * self.hp_z2
                    - self.hp_a1 * self.hp_z1
                    - self.hp_a2 * self.hp_z2;
                self.hp_z2 = self.hp_z1;
                self.hp_z1 = out;
                s = out;
            }

            // 5-band parametric EQ
            for band in self.eq_bands.iter_mut() {
                s = band.process_sample(s);
            }

            // Chorus
            if self.params.chorus_mix > 0.0 {
                s = self.process_chorus(s);
            }

            // Reverb (Schroeder)
            if self.params.reverb_mix > 0.0 {
                s = self.process_reverb(s);
            }

            // Output gain
            s *= self.params.gain;

            // Soft limiter
            s = s.max(-1.0).min(1.0);

            data[i] = s;
        }
    }

    fn process_reverb(&mut self, input: f32) -> f32 {
        let decay = self.params.reverb_decay.max(0.0).min(0.99);
        let fb_gains = [
            decay * 0.805,
            decay * 0.827,
            decay * 0.783,
            decay * 0.764,
        ];

        // Comb filters (parallel)
        let mut comb_out = 0.0f32;
        for i in 0..4 {
            let buf = &mut self.comb_bufs[i];
            let pos = self.comb_pos[i];
            let delayed = buf[pos];
            let new_val = input + delayed * fb_gains[i];
            buf[pos] = new_val;
            self.comb_pos[i] = (pos + 1) % buf.len();
            comb_out += delayed;
        }
        comb_out *= 0.25;

        // Allpass filters (series)
        let mut ap_out = comb_out;
        let ap_gain = 0.5;
        for i in 0..2 {
            let buf = &mut self.allpass_bufs[i];
            let pos = self.allpass_pos[i];
            let delayed = buf[pos];
            let new_val = ap_out + delayed * ap_gain;
            buf[pos] = new_val;
            self.allpass_pos[i] = (pos + 1) % buf.len();
            ap_out = delayed - ap_out * ap_gain;
        }

        // Mix dry/wet
        input * (1.0 - self.params.reverb_mix) + ap_out * self.params.reverb_mix
    }

    fn process_chorus(&mut self, input: f32) -> f32 {
        let buf_len = self.chorus_buf.len();
        self.chorus_buf[self.chorus_write_pos] = input;
        self.chorus_write_pos = (self.chorus_write_pos + 1) % buf_len;

        let rates = [1.1_f64, 1.5, 0.9]; // Different LFO rates for each voice
        let depths = [0.003_f64, 0.004, 0.0035]; // Delay modulation depth in seconds

        let mut chorus_sum = 0.0f32;
        for v in 0..3 {
            self.chorus_phases[v] += rates[v] / self.sample_rate as f64;
            if self.chorus_phases[v] >= 1.0 {
                self.chorus_phases[v] -= 1.0;
            }
            let lfo = (2.0 * std::f64::consts::PI * self.chorus_phases[v]).sin();
            let delay_samples = (depths[v] * self.sample_rate as f64 * (0.5 + 0.5 * lfo)) as usize;
            let read_idx = (self.chorus_write_pos + buf_len - delay_samples.min(buf_len - 1)) % buf_len;
            chorus_sum += self.chorus_buf[read_idx];
        }
        chorus_sum /= 3.0;

        input * (1.0 - self.params.chorus_mix) + chorus_sum * self.params.chorus_mix
    }
}

// ── Thread-safe shared state ──

pub type SharedVoiceFx = Arc<Mutex<VoiceFxProcessor>>;

pub fn create_shared_processor(sample_rate: f32) -> SharedVoiceFx {
    Arc::new(Mutex::new(VoiceFxProcessor::new(sample_rate)))
}
