import { useRef, useEffect, useCallback, useState } from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GraphicEq, BarChart } from '@mui/icons-material';

type Mode = 'spectrum' | 'spectrogram';

interface MicVisualizerProps {
  active: boolean;
}

export default function MicVisualizer({ active }: MicVisualizerProps) {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const spectrogramDataRef = useRef<Uint8Array[]>([]);
  const [mode, setMode] = useState<Mode>('spectrum');
  const [peakDb, setPeakDb] = useState(-Infinity);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    analyserRef.current = null;
    audioCtxRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    spectrogramDataRef.current = [];
  }, []);

  useEffect(() => {
    if (!active) {
      cleanup();
      setPeakDb(-Infinity);
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch {
        // Mic not available — silently ignore
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [active, cleanup]);

  // Animation loop (separate from init so mode changes don't restart mic)
  useEffect(() => {
    if (!active) return;

    const draw = () => {
      const analyser = analyserRef.current;
      const canvas = canvasRef.current;
      if (!analyser || !canvas) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const bufLen = analyser.frequencyBinCount;

      // Compute VU level
      const timeData = new Uint8Array(bufLen);
      analyser.getByteTimeDomainData(timeData);
      let peak = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = (timeData[i] - 128) / 128;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      const db = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
      setPeakDb(db);

      const freqData = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(freqData);

      if (mode === 'spectrum') {
        // Real-time frequency spectrum bars
        ctx.clearRect(0, 0, w, h);

        const barCount = 64;
        const barW = w / barCount;
        const gap = 1;

        for (let i = 0; i < barCount; i++) {
          // Map to log frequency scale
          const frac = i / barCount;
          const idx = Math.floor(Math.pow(frac, 1.5) * bufLen);
          const val = freqData[Math.min(idx, bufLen - 1)] / 255;

          const barH = val * h;
          const x = i * barW;

          // Gradient from primary to hot
          const hue = 260 - val * 40; // purple -> blue-violet
          const light = 50 + val * 15;
          ctx.fillStyle = val > 0.7
            ? `hsl(${hue - 30}, 90%, ${light}%)`
            : `hsl(${hue}, 70%, ${light}%)`;
          ctx.fillRect(x + gap / 2, h - barH, barW - gap, barH);
        }
      } else {
        // Scrolling spectrogram (waterfall)
        const column = new Uint8Array(bufLen);
        for (let i = 0; i < bufLen; i++) column[i] = freqData[i];
        spectrogramDataRef.current.push(column);
        // Keep only as many columns as canvas width
        if (spectrogramDataRef.current.length > w) {
          spectrogramDataRef.current.shift();
        }

        ctx.clearRect(0, 0, w, h);
        const data = spectrogramDataRef.current;
        const colW = 1;
        for (let x = 0; x < data.length; x++) {
          const col = data[x];
          const rows = Math.min(col.length, h);
          for (let y = 0; y < rows; y++) {
            const val = col[y] / 255;
            if (val < 0.02) continue;
            // Map low freq at bottom
            const pY = h - 1 - Math.floor((y / rows) * h);
            const hue = 260 - val * 80;
            const light = val * 60;
            ctx.fillStyle = `hsl(${hue}, 80%, ${light}%)`;
            ctx.fillRect(x * colW, pY, colW, 1);
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, mode]);

  // VU meter bar color
  const vuPct = active && isFinite(peakDb) ? Math.max(0, Math.min(1, (peakDb + 60) / 60)) : 0;
  const vuColor = vuPct > 0.85 ? '#f44336' : vuPct > 0.6 ? '#ff9800' : '#4caf50';
  const vuLabel = isFinite(peakDb) ? `${peakDb.toFixed(1)} dB` : '—';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {/* Canvas + mode toggle */}
      <Box sx={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={320}
          height={80}
          style={{
            width: '100%',
            height: 80,
            borderRadius: 10,
            background: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(0, 0, 0, 0.04)',
            border: `1px solid ${theme.palette.divider}`,
          }}
        />
        <Tooltip title={mode === 'spectrum' ? 'Spectrogramme' : 'Spectre'} placement="left">
          <IconButton
            size="small"
            onClick={() => {
              spectrogramDataRef.current = [];
              setMode(m => m === 'spectrum' ? 'spectrogram' : 'spectrum');
            }}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 22,
              height: 22,
              bgcolor: 'rgba(0,0,0,0.35)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' },
            }}
          >
            {mode === 'spectrum'
              ? <GraphicEq sx={{ fontSize: 13 }} />
              : <BarChart sx={{ fontSize: 13 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* VU meter */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, color: 'text.secondary', minWidth: 20 }}>
          VU
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: `${vuPct * 100}%`,
              height: '100%',
              borderRadius: 3,
              bgcolor: vuColor,
              transition: 'width 0.05s linear',
            }}
          />
          {/* Peak markers */}
          {[0.6, 0.85].map(t => (
            <Box
              key={t}
              sx={{
                position: 'absolute',
                left: `${t * 100}%`,
                top: 0,
                width: 1,
                height: '100%',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
              }}
            />
          ))}
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.58rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            color: active ? vuColor : 'text.disabled',
            minWidth: 42,
            textAlign: 'right',
          }}
        >
          {active ? vuLabel : '—'}
        </Typography>
      </Box>
    </Box>
  );
}
