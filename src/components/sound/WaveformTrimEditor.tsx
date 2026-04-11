import { useRef, useEffect, useCallback, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ContentCut } from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';

interface WaveformTrimEditorProps {
  filePath: string;
  duration?: number; // total duration in seconds (0 if unknown)
  trimStart: number;
  trimEnd: number | null;
  onChange: (trimStart: number, trimEnd: number | null) => void;
}

export default function WaveformTrimEditor({
  filePath,
  trimStart,
  trimEnd,
  onChange,
}: WaveformTrimEditorProps) {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const dragRef = useRef<'start' | 'end' | null>(null);

  const BARS = 120;

  // Load waveform
  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    invoke<number[]>('get_waveform', { filePath, bars: BARS })
      .then(data => {
        setWaveform(data);
        // Approximate duration from bars (rough heuristic — server doesn't return duration here)
        // We'll compute from an audio element
        const audio = new Audio();
        audio.src = `asset://localhost/${filePath.replace(/\\/g, '/')}`;
        audio.onloadedmetadata = () => setTotalDuration(audio.duration || 0);
        audio.load();
      })
      .catch(() => setWaveform(new Array(BARS).fill(0.3)))
      .finally(() => setLoading(false));
  }, [filePath]);

  // Draw waveform + trim region
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveform.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const barW = w / BARS;

    ctx.clearRect(0, 0, w, h);

    const effectiveEnd = trimEnd ?? totalDuration;
    const startFrac = totalDuration > 0 ? trimStart / totalDuration : 0;
    const endFrac = totalDuration > 0 && effectiveEnd > 0 ? effectiveEnd / totalDuration : 1;
    const startPx = startFrac * w;
    const endPx = endFrac * w;

    // Draw muted regions
    ctx.fillStyle = theme.palette.mode === 'dark'
      ? 'rgba(0,0,0,0.5)'
      : 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, 0, startPx, h);
    ctx.fillRect(endPx, 0, w - endPx, h);

    // Draw bars
    for (let i = 0; i < BARS; i++) {
      const x = i * barW;
      const val = waveform[i] || 0;
      const barH = Math.max(2, val * (h - 4));
      const inRegion = x >= startPx && x + barW <= endPx;

      ctx.fillStyle = inRegion
        ? theme.palette.primary.main
        : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)');
      ctx.fillRect(x + 1, (h - barH) / 2, barW - 2, barH);
    }

    // Draw trim handles
    const handleW = 4;
    const handleColor = '#fff';

    // Start handle
    ctx.fillStyle = theme.palette.primary.main;
    ctx.fillRect(startPx - 1, 0, handleW, h);
    ctx.fillStyle = handleColor;
    ctx.beginPath();
    ctx.arc(startPx + handleW / 2, h / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // End handle
    ctx.fillStyle = theme.palette.secondary?.main ?? theme.palette.primary.dark;
    ctx.fillRect(endPx - handleW + 1, 0, handleW, h);
    ctx.fillStyle = handleColor;
    ctx.beginPath();
    ctx.arc(endPx - handleW / 2, h / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    if (totalDuration > 0) {
      ctx.fillStyle = theme.palette.text.primary;
      ctx.font = '10px monospace';
      ctx.fillText(formatTime(trimStart), startPx + 6, 14);
      const endLabel = formatTime(effectiveEnd);
      const labelX = Math.max(0, endPx - ctx.measureText(endLabel).width - 6);
      ctx.fillText(endLabel, labelX, 14);
    }
  }, [waveform, trimStart, trimEnd, totalDuration, theme]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse interaction
  const getTimeAt = (clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas || totalDuration === 0) return 0;
    const rect = canvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return frac * totalDuration;
  };

  const hitTest = (clientX: number): 'start' | 'end' | null => {
    const canvas = canvasRef.current;
    if (!canvas || totalDuration === 0) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left);
    const w = rect.width;
    const startPx = (trimStart / totalDuration) * w;
    const endPx = ((trimEnd ?? totalDuration) / totalDuration) * w;
    if (Math.abs(x - startPx) < 12) return 'start';
    if (Math.abs(x - endPx) < 12) return 'end';
    return null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const hit = hitTest(e.clientX);
    if (hit) {
      dragRef.current = hit;
      e.preventDefault();
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || totalDuration === 0) return;
    const t = getTimeAt(e.clientX);
    if (dragRef.current === 'start') {
      const newStart = Math.max(0, Math.min(t, (trimEnd ?? totalDuration) - 0.1));
      onChange(newStart, trimEnd);
    } else {
      const newEnd = Math.min(totalDuration, Math.max(t, trimStart + 0.1));
      onChange(trimStart, newEnd >= totalDuration - 0.01 ? null : newEnd);
    }
  };

  const onMouseUp = () => { dragRef.current = null; };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ContentCut sx={{ fontSize: 15, color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem' }}>
            Éditeur de trim
          </Typography>
        </Box>
        <Button
          size="small"
          variant="text"
          onClick={() => onChange(0, null)}
          sx={{ fontSize: '0.65rem', textTransform: 'none', py: 0, minHeight: 0 }}
        >
          Réinitialiser
        </Button>
      </Box>

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          cursor: totalDuration > 0 ? 'col-resize' : 'default',
        }}
      >
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={20} />
          </Box>
        )}
        <canvas
          ref={canvasRef}
          width={560}
          height={60}
          style={{ width: '100%', height: 60, display: 'block' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </Box>

      {totalDuration > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontFamily: 'monospace' }}>
            Début : {formatTime(trimStart)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'primary.main', fontFamily: 'monospace', fontWeight: 700 }}>
            Durée : {formatTime((trimEnd ?? totalDuration) - trimStart)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontFamily: 'monospace' }}>
            Fin : {formatTime(trimEnd ?? totalDuration)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(2).padStart(5, '0')}`;
}
