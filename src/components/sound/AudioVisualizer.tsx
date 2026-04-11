import { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { useAppStore } from '../../stores/appStore';
import { invoke } from '@tauri-apps/api/core';

const BAR_COUNT = 20;

// In-memory waveform cache keyed by filePath
const waveformCache = new Map<string, Float32Array>();

export default function AudioVisualizer() {
  const playingIds = useAppStore(s => s.playingIds);
  const data = useAppStore(s => s.data);
  const isPlaying = playingIds.length > 0;
  const waveformRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const animFrameRef = useRef<number>(0);
  const prevSoundRef = useRef<string>('');
  const barsRef = useRef<HTMLDivElement>(null);

  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);

  const loadWaveform = useCallback(async (filePath: string) => {
    const cached = waveformCache.get(filePath);
    if (cached) {
      waveformRef.current = cached;
      return;
    }
    try {
      const wf = await invoke<number[]>('get_waveform', { filePath, bars: BAR_COUNT });
      const arr = new Float32Array(wf);
      waveformCache.set(filePath, arr);
      waveformRef.current = arr;
    } catch {
      waveformRef.current = new Float32Array(BAR_COUNT).fill(0.3);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      prevSoundRef.current = '';
      cancelAnimationFrame(animFrameRef.current);
      if (barsRef.current) {
        const children = barsRef.current.children;
        for (let i = 0; i < children.length; i++) {
          (children[i] as HTMLElement).style.height = '2px';
          (children[i] as HTMLElement).style.opacity = '0.15';
        }
      }
      return;
    }

    // Load waveform for first playing sound
    const soundId = playingIds[0];
    const sound = profile?.sounds.find(s => s.id === soundId);
    if (sound && sound.filePath !== prevSoundRef.current) {
      prevSoundRef.current = sound.filePath;
      loadWaveform(sound.filePath);
    }

    let phase = 0;
    const animate = () => {
      phase += 0.06;
      if (barsRef.current) {
        const wf = waveformRef.current;
        const children = barsRef.current.children;
        for (let i = 0; i < children.length; i++) {
          const base = wf[i] || 0;
          // Add subtle wave motion synced to position
          const wave = Math.sin(phase + i * 0.5) * 0.15 + 0.85;
          const h = Math.max(2, base * wave * 16);
          const el = children[i] as HTMLElement;
          el.style.height = `${h}px`;
          el.style.opacity = '0.8';
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, playingIds, profile, loadWaveform]);

  return (
    <Box
      ref={barsRef}
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '1.5px',
        height: 18,
        px: 0.3,
      }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 2,
            borderRadius: '1.5px',
            bgcolor: isPlaying ? 'primary.main' : 'text.secondary',
            opacity: isPlaying ? 0.8 : 0.15,
            height: 2,
            transition: 'background-color 0.3s',
            willChange: 'height, opacity',
          }}
        />
      ))}
    </Box>
  );
}
