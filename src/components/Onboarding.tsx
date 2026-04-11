import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Mic,
  VolumeUp,
  Cable,
  ArrowForward,
  ArrowBack,
  Close,
  CheckCircle,
  RocketLaunch,
  PlayArrow,
  Stop,
  Settings,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import TomBoardLogo from './TomBoardLogo';

interface OnboardingProps {
  onComplete: () => void;
}

const STEP_COUNT = 5;

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // Device state
  const [outputDevices, setOutputDevices] = useState<string[]>([]);
  const [inputDevices, setInputDevices] = useState<string[]>([]);
  const [virtualCables, setVirtualCables] = useState<string[]>([]);
  const [selectedOutput, setSelectedOutput] = useState('default');
  const [selectedMic, setSelectedMic] = useState('default');
  const [selectedCable, setSelectedCable] = useState('none');

  // Test state
  const [testingOutput, setTestingOutput] = useState(false);
  const [testingMic, setTestingMic] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load devices on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [outputs, inputs, cables] = await Promise.all([
          invoke<string[]>('list_audio_devices').catch(() => ['default']),
          invoke<string[]>('list_audio_input_devices').catch(() => ['default']),
          invoke<string[]>('check_virtual_cable').catch(() => []),
        ]);
        setOutputDevices(outputs);
        setInputDevices(inputs);
        setVirtualCables(cables);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const goTo = useCallback((idx: number) => {
    setVisible(false);
    setTestStatus(null);
    setTimeout(() => {
      setStep(idx);
      setVisible(true);
    }, 200);
  }, []);

  const next = useCallback(() => {
    if (step >= STEP_COUNT - 1) {
      const finish = async () => {
        try {
          await invoke('set_output_device', { deviceName: selectedOutput }).catch(() => {});
          if (selectedCable !== 'none') {
            await invoke('set_secondary_device', { deviceName: selectedCable }).catch(() => {});
            await invoke('set_dual_output', { enabled: true }).catch(() => {});
          }
        } finally {
          onComplete();
        }
      };
      finish();
    } else {
      goTo(step + 1);
    }
  }, [step, onComplete, goTo, selectedOutput, selectedCable]);

  const prev = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onComplete]);

  const testOutputDevice = async () => {
    setTestingOutput(true);
    setTestStatus(null);
    try {
      await invoke('set_output_device', { deviceName: selectedOutput });
      await invoke('test_secondary_output');
      setTestStatus('success');
    } catch (e) {
      setTestStatus(`Erreur: ${e}`);
    } finally {
      setTestingOutput(false);
    }
  };

  const testMicPassthrough = async () => {
    if (testingMic) {
      try { await invoke('stop_mic_passthrough'); } catch { /* ignore */ }
      setTestingMic(false);
      setTestStatus(null);
      return;
    }
    setTestingMic(true);
    setTestStatus(null);
    try {
      await invoke('start_mic_passthrough', { device: selectedMic === 'default' ? null : selectedMic });
      setTestStatus('Parlez dans votre micro — vous devez vous entendre…');
    } catch (e) {
      setTestStatus(`Erreur: ${e}`);
      setTestingMic(false);
    }
  };

  useEffect(() => {
    return () => {
      invoke('stop_mic_passthrough').catch(() => {});
    };
  }, [step]);

  const isLast = step >= STEP_COUNT - 1;

  const stepConfigs = [
    { title: 'Bienvenue sur TomBoard !', icon: <RocketLaunch />, color: '#7C5CFC', gradient: 'linear-gradient(135deg, #7C5CFC 0%, #B347EA 100%)' },
    { title: 'Sortie audio', icon: <VolumeUp />, color: '#00D4AA', gradient: 'linear-gradient(135deg, #00D4AA 0%, #00B4D8 100%)' },
    { title: 'Microphone', icon: <Mic />, color: '#E040FB', gradient: 'linear-gradient(135deg, #E040FB 0%, #7C5CFC 100%)' },
    { title: 'Câble virtuel', icon: <Cable />, color: '#FFB800', gradient: 'linear-gradient(135deg, #FFB800 0%, #FF6B00 100%)' },
    { title: "C'est prêt !", icon: <CheckCircle />, color: '#00D4AA', gradient: 'linear-gradient(135deg, #00D4AA 0%, #4CAF50 100%)' },
  ];

  const cfg = stepConfigs[step];

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <TomBoardLogo size={64} />
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Ce wizard va configurer votre audio en <strong style={{ color: '#fff' }}>3 étapes</strong> :
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2, textAlign: 'left' }}>
              {[
                { icon: <VolumeUp sx={{ fontSize: 16 }} />, text: 'Sélection de la sortie audio (casque, haut-parleurs…)' },
                { icon: <Mic sx={{ fontSize: 16 }} />, text: 'Sélection du microphone' },
                { icon: <Cable sx={{ fontSize: 16 }} />, text: 'Configuration du câble virtuel (optionnel, pour Discord)' },
              ].map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.04)' }}>
                  <Box sx={{ color: cfg.color, display: 'flex' }}>{item.icon}</Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>{item.text}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 1 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', mb: 2, lineHeight: 1.5 }}>
              Choisissez où TomBoard jouera les sons. Sélectionnez votre casque ou vos haut-parleurs.
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
            ) : (
              <>
                <FormControl fullWidth size="small" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.05)' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiSelect-select': { color: '#fff' } }}>
                  <InputLabel>Périphérique de sortie</InputLabel>
                  <Select value={selectedOutput} onChange={e => setSelectedOutput(e.target.value)} label="Périphérique de sortie">
                    {outputDevices.filter(d => !virtualCables.includes(d)).map(dev => (
                      <MenuItem key={dev} value={dev}>{dev === 'default' ? '🔊 Par défaut du système' : dev}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={testingOutput ? <CircularProgress size={14} /> : <PlayArrow sx={{ fontSize: 16 }} />}
                  onClick={testOutputDevice}
                  disabled={testingOutput}
                  fullWidth
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderColor: 'rgba(255,255,255,0.15)', color: '#fff', '&:hover': { borderColor: cfg.color } }}
                >
                  {testingOutput ? 'Test en cours…' : 'Tester la sortie (bip 440Hz)'}
                </Button>
              </>
            )}
            {testStatus === 'success' && (
              <Alert severity="success" sx={{ mt: 1.5, borderRadius: '10px', fontSize: '0.75rem' }}>
                Son joué ! Si vous l'avez entendu, c'est bon.
              </Alert>
            )}
            {testStatus && testStatus !== 'success' && !testStatus.startsWith('Parlez') && (
              <Alert severity="error" sx={{ mt: 1.5, borderRadius: '10px', fontSize: '0.75rem' }}>
                {testStatus}
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 1 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', mb: 2, lineHeight: 1.5 }}>
              Sélectionnez votre microphone pour le changeur de voix et l'enregistrement.
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
            ) : (
              <>
                <FormControl fullWidth size="small" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.05)' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiSelect-select': { color: '#fff' } }}>
                  <InputLabel>Microphone</InputLabel>
                  <Select value={selectedMic} onChange={e => setSelectedMic(e.target.value)} label="Microphone">
                    {inputDevices.map(dev => (
                      <MenuItem key={dev} value={dev}>{dev === 'default' ? '🎤 Par défaut du système' : dev}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={testingMic ? <Stop sx={{ fontSize: 16 }} /> : <Mic sx={{ fontSize: 16 }} />}
                  onClick={testMicPassthrough}
                  fullWidth
                  color={testingMic ? 'error' : 'inherit'}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderColor: testingMic ? undefined : 'rgba(255,255,255,0.15)', color: testingMic ? undefined : '#fff', '&:hover': { borderColor: testingMic ? undefined : cfg.color } }}
                >
                  {testingMic ? 'Arrêter le test' : 'Tester le micro (écoute directe)'}
                </Button>
              </>
            )}
            {testStatus && testStatus.startsWith('Parlez') && (
              <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px', fontSize: '0.75rem' }}>
                {testStatus}
              </Alert>
            )}
            {testStatus && testStatus.startsWith('Erreur') && (
              <Alert severity="error" sx={{ mt: 1.5, borderRadius: '10px', fontSize: '0.75rem' }}>
                {testStatus}
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ py: 1 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', mb: 1.5, lineHeight: 1.5 }}>
              Pour envoyer les sons et votre voix modifiée dans Discord/Teams, vous avez besoin d'un <strong style={{ color: '#fff' }}>câble audio virtuel</strong>.
            </Typography>
            {virtualCables.length > 0 ? (
              <>
                <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2, borderRadius: '10px', fontSize: '0.75rem' }}>
                  {virtualCables.length} câble(s) virtuel(s) détecté(s) !
                </Alert>
                <FormControl fullWidth size="small" sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.05)' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiSelect-select': { color: '#fff' } }}>
                  <InputLabel>Câble virtuel</InputLabel>
                  <Select value={selectedCable} onChange={e => setSelectedCable(e.target.value)} label="Câble virtuel">
                    <MenuItem value="none">Pas de câble (désactivé)</MenuItem>
                    {virtualCables.map(dev => (
                      <MenuItem key={dev} value={dev}>{dev}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', lineHeight: 1.5 }}>
                  💡 Dans Discord → Paramètres → Voix → Entrée : sélectionnez ce câble virtuel comme microphone.
                </Typography>
              </>
            ) : (
              <>
                <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px', fontSize: '0.75rem' }}>
                  Aucun câble virtuel détecté.
                </Alert>
                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', fontWeight: 600, mb: 1 }}>
                    Installer VB-Audio Virtual Cable :
                  </Typography>
                  <Typography component="div" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', lineHeight: 1.6 }}>
                    1. Téléchargez <Chip label="vb-audio.com/Cable" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, borderColor: cfg.color, color: cfg.color }} /><br />
                    2. Installez et redémarrez votre PC<br />
                    3. Relancez le setup dans les paramètres
                  </Typography>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', mt: 1.5, fontStyle: 'italic' }}>
                  Vous pouvez sauter cette étape et configurer plus tard dans ⚙️ Paramètres.
                </Typography>
              </>
            )}
          </Box>
        );

      case 4:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, boxShadow: `0 8px 32px ${cfg.color}40` }}>
              <CheckCircle sx={{ fontSize: 32, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem', mb: 1 }}>
              Configuration terminée !
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 2, textAlign: 'left' }}>
              <SummaryRow icon={<VolumeUp sx={{ fontSize: 14 }} />} label="Sortie" value={selectedOutput === 'default' ? 'Par défaut' : selectedOutput} color="#00D4AA" />
              <SummaryRow icon={<Mic sx={{ fontSize: 14 }} />} label="Micro" value={selectedMic === 'default' ? 'Par défaut' : selectedMic} color="#E040FB" />
              <SummaryRow icon={<Cable sx={{ fontSize: 14 }} />} label="Câble virtuel" value={selectedCable === 'none' ? 'Non configuré' : selectedCable} color="#FFB800" />
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', mt: 2 }}>
              <Settings sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
              Vous pouvez modifier ces paramètres à tout moment dans les Paramètres.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}>
      <IconButton
        onClick={onComplete}
        sx={{ position: 'fixed', top: 56, right: 16, zIndex: 10001, color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'rgba(255,255,255,0.85)' } }}
      >
        <Close />
      </IconButton>

      <Fade in={visible} timeout={250}>
        <Box sx={{
          maxWidth: 440,
          width: '90%',
          bgcolor: '#1A1D24',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          <Box sx={{ height: 4, background: cfg.gradient }} />

          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: `0 4px 16px ${cfg.color}30` }}>
                {step === 0 ? <TomBoardLogo size={28} /> : cfg.icon}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2 }}>
                  {cfg.title}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 500 }}>
                  Étape {step + 1} / {STEP_COUNT}
                </Typography>
              </Box>
            </Box>

            {renderStepContent()}

            <Box sx={{ display: 'flex', gap: 0.5, mt: 2.5, mb: 2 }}>
              {Array.from({ length: STEP_COUNT }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: i === step ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: i === step ? cfg.color : i < step ? `${cfg.color}60` : 'rgba(255,255,255,0.12)',
                    transition: 'all 0.3s ease',
                    cursor: i < step ? 'pointer' : 'default',
                  }}
                  onClick={() => i < step && goTo(i)}
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {step > 0 && (
                <Button
                  onClick={prev}
                  size="small"
                  startIcon={<ArrowBack sx={{ fontSize: 14 }} />}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', px: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  Retour
                </Button>
              )}
              <Button
                onClick={next}
                size="small"
                variant="contained"
                endIcon={isLast ? <CheckCircle sx={{ fontSize: 16 }} /> : <ArrowForward sx={{ fontSize: 14 }} />}
                sx={{ flex: 1, borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', background: cfg.gradient, boxShadow: `0 4px 12px ${cfg.color}30`, '&:hover': { boxShadow: `0 6px 20px ${cfg.color}50` } }}
              >
                {isLast ? "C'est parti !" : step === 3 && virtualCables.length === 0 ? 'Passer' : 'Suivant'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
}

function SummaryRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.04)' }}>
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', minWidth: 80 }}>{label}</Typography>
      <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</Typography>
    </Box>
  );
}
