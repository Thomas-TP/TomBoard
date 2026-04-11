import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import {
  Close,
  FiberManualRecord,
  Stop,
  PlayArrow,
  Delete,
  Mic,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';

interface RecordDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function RecordDialog({ open, onClose }: RecordDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('all');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const data = useAppStore(s => s.data);
  const loadData = useAppStore(s => s.loadData);
  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);
  const categories = profile?.categories ?? [];

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
  }, [audioUrl]);

  useEffect(() => {
    if (!open) {
      cleanup();
      setRecording(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
      setName('');
      setCategory('all');
      setPlaying(false);
      setLevel(0);
    }
  }, [open]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up analyser for level meter
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();
      };

      mediaRecorder.start(100);
      setRecording(true);
      setDuration(0);

      // Timer
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 100);

      // Level meter animation
      const updateLevel = () => {
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(avg / 255);
        }
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      if (!name) {
        setName(`Enregistrement ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
      }
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setRecording(false);
    setLevel(0);
  };

  const playPreview = () => {
    if (!audioUrl) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.play();
    setPlaying(true);
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  };

  const handleSave = async () => {
    if (!audioBlob || !name.trim()) return;
    setSaving(true);
    try {
      // Convert webm to WAV using AudioContext
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Encode as WAV
      const wavData = encodeWav(audioBuffer);
      const wavArray = Array.from(new Uint8Array(wavData));

      await invoke('save_recording', {
        audioData: wavArray,
        name: name.trim(),
        category,
      });
      await loadData();
      onClose();
    } catch (e) {
      console.error('Failed to save recording:', e);
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      open={open}
      onClose={recording ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 4, bgcolor: 'background.paper' } },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Mic sx={{ fontSize: 22 }} /> Enregistrer un son
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={recording}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {/* Recording controls */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              py: 3,
              borderRadius: 3,
              bgcolor: recording ? 'error.dark' : 'action.hover',
              transition: 'all 0.3s',
            }}
          >
            {recording ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      animation: 'pulse 1s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.3 },
                      },
                    }}
                  />
                  <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {formatDuration(duration)}
                  </Typography>
                </Box>

                {/* Level meter */}
                <LinearProgress
                  variant="determinate"
                  value={level * 100}
                  sx={{
                    width: '80%',
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: level > 0.7 ? 'error.light' : 'success.main',
                      transition: 'none',
                    },
                  }}
                />

                <IconButton
                  onClick={stopRecording}
                  sx={{
                    bgcolor: 'error.main',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { bgcolor: 'error.dark' },
                  }}
                >
                  <Stop sx={{ fontSize: 32 }} />
                </IconButton>
              </>
            ) : audioBlob ? (
              <>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Enregistrement terminé — {formatDuration(duration)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    onClick={playPreview}
                    sx={{
                      bgcolor: playing ? 'primary.dark' : 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    {playing ? <Stop /> : <PlayArrow />}
                  </IconButton>
                  <IconButton
                    onClick={discardRecording}
                    sx={{
                      bgcolor: 'error.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'error.dark' },
                    }}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Cliquez pour commencer l'enregistrement
                </Typography>
                <IconButton
                  onClick={startRecording}
                  sx={{
                    bgcolor: 'error.main',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { bgcolor: 'error.dark' },
                  }}
                >
                  <FiberManualRecord sx={{ fontSize: 32 }} />
                </IconButton>
              </>
            )}
          </Box>

          {/* Name */}
          <TextField
            label="Nom de l'enregistrement"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            size="small"
          />

          {/* Category */}
          <FormControl size="small" fullWidth>
            <InputLabel>Catégorie</InputLabel>
            <Select
              value={category}
              onChange={e => setCategory(e.target.value)}
              label="Catégorie"
            >
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={recording}>
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!audioBlob || !name.trim() || saving || recording}
          sx={{ borderRadius: 3, px: 3 }}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// WAV encoder
function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  const numSamples = audioBuffer.length;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
