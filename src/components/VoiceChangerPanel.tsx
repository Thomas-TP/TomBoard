import { useEffect, useState, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Grid,
  Slider,
  Divider,
  Chip,
  Alert,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Close,
  Mic as MicIcon,
  MicOff,
  Tune,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';

interface VoicePresetInfo {
  id: string;
  name: string;
  icon: string;
  category: string;
}

interface VoiceFxParams {
  preset: string;
  pitch_shift: number;
  reverb_mix: number;
  reverb_decay: number;
  ring_mod_freq: number;
  ring_mod_mix: number;
  distortion: number;
  lowpass_cutoff: number;
  highpass_cutoff: number;
  vibrato_rate: number;
  vibrato_depth: number;
  chorus_mix: number;
  gate_threshold: number;
  gain: number;
  noise_suppression: boolean;
}

const defaultParams: VoiceFxParams = {
  preset: 'none',
  pitch_shift: 0,
  reverb_mix: 0,
  reverb_decay: 0.5,
  ring_mod_freq: 0,
  ring_mod_mix: 0,
  distortion: 0,
  lowpass_cutoff: 20000,
  highpass_cutoff: 20,
  vibrato_rate: 0,
  vibrato_depth: 0,
  chorus_mix: 0,
  gate_threshold: 0,
  gain: 1,
  noise_suppression: false,
};

const CATEGORY_LABELS: Record<string, string> = {
  base: '🎤 Base',
  pitch: '🎵 Hauteur',
  character: '🎭 Personnages',
  effect: '🔊 Effets',
  custom: '🎛️ Personnalisé',
};

interface VoiceChangerPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function VoiceChangerPanel({ open, onClose }: VoiceChangerPanelProps) {
  const [presets, setPresets] = useState<VoicePresetInfo[]>([]);
  const [activePreset, setActivePreset] = useState('none');
  const [params, setParams] = useState<VoiceFxParams>(defaultParams);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [micActive, setMicActive] = useState(false);



  useEffect(() => {
    if (!open) return;
    invoke<VoicePresetInfo[]>('list_voice_presets').then(setPresets).catch(console.error);
    invoke<VoiceFxParams>('get_voice_params')
      .then(p => {
        setParams(p);
        setActivePreset(p.preset);
        setMicActive(true);
      })
      .catch(() => setMicActive(false));
  }, [open]);

  const selectPreset = useCallback(async (presetId: string) => {
    setError(null);
    try {
      await invoke('set_voice_preset', { preset: presetId });
      setActivePreset(presetId);
      const p = await invoke<VoiceFxParams>('get_voice_params');
      setParams(p);
      setMicActive(true);
    } catch (e) {
      setError(`${e}`);
    }
  }, []);

  const updateParam = useCallback(async (key: keyof VoiceFxParams, value: number) => {
    const newParams = { ...params, [key]: value, preset: 'custom' };
    setParams(newParams);
    setActivePreset('custom');
    try {
      await invoke('set_voice_custom_params', { params: newParams });
      setError(null);
      setMicActive(true);
    } catch (e) {
      setError(`${e}`);
    }
  }, [params]);

  // Group presets by category
  const grouped = presets.reduce<Record<string, VoicePresetInfo[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: 380,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            top: '46px',
            height: 'calc(100% - 46px)',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: micActive ? 'rgba(0, 212, 170, 0.12)' : 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {micActive ? (
                <MicIcon sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <MicOff sx={{ fontSize: 16, color: 'text.disabled' }} />
              )}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
              Changeur de Voix
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ width: 28, height: 28 }}
          >
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
          {error && (
            <Alert
              severity="warning"
              onClose={() => setError(null)}
              sx={{
                mb: 2,
                fontSize: '0.72rem',
                py: 0.5,
                borderRadius: '10px',
                '& .MuiAlert-icon': { fontSize: 18 },
              }}
            >
              {error}
            </Alert>
          )}

          {/* Preset grid by category */}
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            return (
              <Box key={cat} sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'text.secondary',
                    fontSize: '0.6rem',
                    mb: 0.75,
                    display: 'block',
                  }}
                >
                  {label}
                </Typography>
                <Grid container spacing={0.75}>
                  {items.map(preset => {
                    const isActive = activePreset === preset.id;
                    return (
                      <Grid size={{ xs: 4 }} key={preset.id}>
                        <Tooltip title={preset.name} placement="top" arrow>
                          <Box
                            onClick={() => selectPreset(preset.id)}
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: 1,
                              borderRadius: '10px',
                              cursor: 'pointer',
                              border: '1.5px solid',
                              borderColor: isActive ? 'primary.main' : 'divider',
                              bgcolor: isActive
                                ? 'rgba(124, 92, 252, 0.12)'
                                : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                bgcolor: isActive
                                  ? 'rgba(124, 92, 252, 0.18)'
                                  : 'action.hover',
                                transform: 'scale(1.02)',
                                borderColor: isActive ? 'primary.main' : 'rgba(124, 92, 252, 0.3)',
                              },
                              minHeight: 62,
                              ...(isActive && {
                                boxShadow: '0 0 12px rgba(124, 92, 252, 0.15)',
                              }),
                            }}
                          >
                            <Typography sx={{ fontSize: '1.3rem', lineHeight: 1 }}>
                              {preset.icon}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '0.62rem',
                                mt: 0.3,
                                textAlign: 'center',
                                lineHeight: 1.1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                                color: isActive ? 'primary.main' : 'text.primary',
                              }}
                            >
                              {preset.name}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            );
          })}

          <Divider sx={{ my: 1.5, opacity: 0.5 }} />

          {/* Advanced Parameters Toggle */}
          <Box
            onClick={() => setShowAdvanced(!showAdvanced)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              py: 0.75,
              px: 0.5,
              borderRadius: '8px',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tune sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem' }}>
                Réglages avancés
              </Typography>
            </Box>
            {showAdvanced ? <ExpandLess sx={{ fontSize: 16, color: 'text.secondary' }} /> : <ExpandMore sx={{ fontSize: 16, color: 'text.secondary' }} />}
          </Box>

          <Collapse in={showAdvanced}>
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <ParamSlider label="Hauteur (demi-tons)" value={params.pitch_shift} min={-24} max={24} step={0.5}
                onChange={v => updateParam('pitch_shift', v)} format={v => `${v > 0 ? '+' : ''}${v}`} />
              <ParamSlider label="Réverbération" value={params.reverb_mix} min={0} max={1} step={0.01}
                onChange={v => updateParam('reverb_mix', v)} format={v => `${Math.round(v * 100)}%`} />
              <ParamSlider label="Durée réverb" value={params.reverb_decay} min={0} max={0.99} step={0.01}
                onChange={v => updateParam('reverb_decay', v)} format={v => `${Math.round(v * 100)}%`} />
              <ParamSlider label="Ring Mod (Hz)" value={params.ring_mod_freq} min={0} max={1000} step={1}
                onChange={v => updateParam('ring_mod_freq', v)} format={v => v === 0 ? 'Off' : `${v} Hz`} />
              <ParamSlider label="Ring Mod Mix" value={params.ring_mod_mix} min={0} max={1} step={0.01}
                onChange={v => updateParam('ring_mod_mix', v)} format={v => `${Math.round(v * 100)}%`} />
              <ParamSlider label="Distortion" value={params.distortion} min={0} max={1} step={0.01}
                onChange={v => updateParam('distortion', v)} format={v => `${Math.round(v * 100)}%`} />
              <ParamSlider label="Filtre passe-bas" value={params.lowpass_cutoff} min={200} max={20000} step={100}
                onChange={v => updateParam('lowpass_cutoff', v)} format={v => v >= 19900 ? 'Off' : `${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v} Hz`} />
              <ParamSlider label="Filtre passe-haut" value={params.highpass_cutoff} min={20} max={2000} step={10}
                onChange={v => updateParam('highpass_cutoff', v)} format={v => v <= 25 ? 'Off' : `${v} Hz`} />
              <ParamSlider label="Vibrato vitesse" value={params.vibrato_rate} min={0} max={20} step={0.1}
                onChange={v => updateParam('vibrato_rate', v)} format={v => v === 0 ? 'Off' : `${v.toFixed(1)} Hz`} />
              <ParamSlider label="Vibrato profondeur" value={params.vibrato_depth} min={0} max={2} step={0.05}
                onChange={v => updateParam('vibrato_depth', v)} format={v => `${Math.round(v * 100)}%`} />
              <ParamSlider label="Chorus" value={params.chorus_mix} min={0} max={1} step={0.01}
                onChange={v => updateParam('chorus_mix', v)} format={v => `${Math.round(v * 100)}%`} />
              <ParamSlider label="Noise Gate" value={params.gate_threshold} min={0} max={0.1} step={0.001}
                onChange={v => updateParam('gate_threshold', v)} format={v => v === 0 ? 'Off' : `${(v * 1000).toFixed(0)}`} />
              <ParamSlider label="Volume sortie" value={params.gain} min={0.1} max={3} step={0.05}
                onChange={v => updateParam('gain', v)} format={v => `${Math.round(v * 100)}%`} />
            </Box>
          </Collapse>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            px: 2.5,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Chip
            icon={micActive ? <MicIcon sx={{ fontSize: 13 }} /> : <MicOff sx={{ fontSize: 13 }} />}
            label={micActive ? 'Micro actif' : 'Micro inactif'}
            size="small"
            color={micActive ? 'success' : 'default'}
            variant="outlined"
            sx={{ fontSize: '0.65rem', fontWeight: 600, height: 24, borderRadius: '8px' }}
          />
          {activePreset !== 'none' && (
            <Chip
              label="Désactiver"
              size="small"
              variant="outlined"
              color="error"
              onClick={() => selectPreset('none')}
              sx={{ fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', height: 24, borderRadius: '8px' }}
            />
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

// ── Reusable parameter slider ──

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: -0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.68rem', color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'primary.main', minWidth: 40, textAlign: 'right' }}>
          {format(value)}
        </Typography>
      </Box>
      <Slider
        value={value}
        onChange={(_, v) => onChange(v as number)}
        min={min}
        max={max}
        step={step}
        size="small"
        sx={{ py: 0.5 }}
      />
    </Box>
  );
}
