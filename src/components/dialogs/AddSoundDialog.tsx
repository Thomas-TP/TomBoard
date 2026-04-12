import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  LinearProgress,
  Slider,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  Close,
  FiberManualRecord,
  Stop,
  PlayArrow,
  Delete,
  InsertDriveFile,
  Mic,
  RecordVoiceOver,
  Female,
  Male,
  Videocam,
  GraphicEq,
} from '@mui/icons-material';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import { useI18n } from '../../i18n/I18nProvider';

interface TtsVoice {
  name: string;
  culture: string;
  gender: string;
  age: string;
  engine: string;
}

interface AddSoundDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AddSoundDialog({ open: isOpen, onClose }: AddSoundDialogProps) {
  const [activeTab, setActiveTab] = useState(0);

  // ── File tab state ──
  const [name, setName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ── Record tab state ──
  const [recName, setRecName] = useState('');
  const [recCategory, setRecCategory] = useState('all');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(0);

  // ── TTS tab state ──
  const [ttsText, setTtsText] = useState('');
  const [ttsVoices, setTtsVoices] = useState<TtsVoice[]>([]);
  const [ttsVoice, setTtsVoice] = useState('');
  const [ttsRate, setTtsRate] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsDetectedLang, setTtsDetectedLang] = useState('');
  const [ttsLangFilter, setTtsLangFilter] = useState('');
  const [ttsGenderFilter, setTtsGenderFilter] = useState<'All' | 'Female' | 'Male'>('All');
  const [ttsEngine, setTtsEngine] = useState<'windows' | 'piper'>('windows');
  const [piperAvailable, setPiperAvailable] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const addSound = useAppStore(s => s.addSound);
  const loadData = useAppStore(s => s.loadData);
  const data = useAppStore(s => s.data);
  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);
  const categories = profile?.categories ?? [];
  const { t } = useI18n();

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
  }, [audioUrl]);

  useEffect(() => {
    if (!isOpen) {
      cleanupRecording();
      setActiveTab(0);
      setName('');
      setFilePath('');
      setCategory('all');
      setRecName('');
      setRecCategory('all');
      setRecording(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
      setPlaying(false);
      setLevel(0);
      setTtsText('');
      setTtsVoice('');
      setTtsRate(0);
      setTtsError(null);
      setTtsDetectedLang('');
      setTtsLangFilter('');
      setTtsGenderFilter('All');
    }
  }, [isOpen]);

  // Load TTS voices when dialog opens
  useEffect(() => {
    if (isOpen && ttsVoices.length === 0) {
      invoke<TtsVoice[]>('list_tts_voices').then(voices => {
        // Deduplicate by name (backend puts OneCore first, so first wins)
        const seen = new Set<string>();
        const deduped = voices.filter(v => seen.has(v.name) ? false : (seen.add(v.name), true));
        setTtsVoices(deduped);
        if (deduped.length > 0) setTtsVoice(deduped[0].name);
      }).catch(console.error);
    }
    // Check Piper availability
    if (isOpen && data?.settings.piperPath) {
      invoke<boolean>('check_piper', { piperPath: data.settings.piperPath }).then(ok => {
        setPiperAvailable(ok);
      }).catch(() => setPiperAvailable(false));
    }
  }, [isOpen]);

  // Derive language list + filtered voices
  const langCodeOf = (culture: string) => culture.replace('_', '-').split('-')[0].toLowerCase();
  const LANG_LABELS: Record<string, string> = {
    af:'Afrikaans', ar:'العربية', bg:'Български', bn:'বাংলা', ca:'Català',
    cs:'Čeština', cy:'Cymraeg', da:'Dansk', de:'Deutsch', el:'Ελληνικά',
    en:'English', es:'Español', et:'Eesti', fa:'فارسی', fi:'Suomi',
    fr:'Français', ga:'Gaeilge', gl:'Galego', gu:'ગુજરાતી', he:'עברית',
    hi:'हिन्दी', hr:'Hrvatski', hu:'Magyar', hy:'Հայերեն', id:'Indonesia',
    it:'Italiano', ja:'日本語', ka:'ქართული', kn:'ಕನ್ನಡ', ko:'한국어',
    lt:'Lietuvių', lv:'Latviešu', mk:'Македонски', ml:'മലയാളം', mr:'मराठी',
    ms:'Melayu', mt:'Malti', nb:'Norsk', nl:'Nederlands', pa:'ਪੰਜਾਬੀ',
    pl:'Polski', pt:'Português', ro:'Română', ru:'Русский', sk:'Slovenčina',
    sl:'Slovenščina', sq:'Shqip', sr:'Српски', sv:'Svenska', sw:'Kiswahili',
    ta:'தமிழ்', te:'తెలుగు', th:'ไทย', tr:'Türkçe', uk:'Українська',
    ur:'اردو', vi:'Tiếng Việt', zh:'中文', zu:'Zulu',
  };
  const availableLangs: { code: string; label: string }[] = [...new Set(ttsVoices.map(v => langCodeOf(v.culture)))]
    .sort()
    .map(code => ({ code, label: LANG_LABELS[code] ? `${code.toUpperCase()} – ${LANG_LABELS[code]}` : code.toUpperCase() }));

  const filteredVoices = ttsVoices.filter(v => {
    if (ttsLangFilter && langCodeOf(v.culture) !== ttsLangFilter) return false;
    if (ttsGenderFilter !== 'All' && v.gender !== ttsGenderFilter && v.gender !== 'Unknown') return false;
    return true;
  });

  // Keep selected voice valid when filters change
  useEffect(() => {
    if (filteredVoices.length > 0 && !filteredVoices.find(v => v.name === ttsVoice)) {
      setTtsVoice(filteredVoices[0].name);
    }
  }, [ttsLangFilter, ttsGenderFilter]);


  const VIDEO_EXTENSIONS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv', 'm4v'];
  const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'];

  // ── File tab handlers ──
  const handleBrowse = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: t('audioAndVideo'), extensions: [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS] },
        { name: 'Audio', extensions: AUDIO_EXTENSIONS },
        { name: t('video'), extensions: VIDEO_EXTENSIONS },
      ],
    });
    if (selected) {
      setFilePath(selected);
      if (!name) {
        const parts = selected.replace(/\\/g, '/').split('/');
        const filename = parts[parts.length - 1];
        setName(filename.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const isVideoFile = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    return VIDEO_EXTENSIONS.includes(ext);
  };

  const handleSubmitFile = async () => {
    if (!name.trim() || !filePath) return;
    setLoading(true);
    try {
      let finalPath = filePath;
      // If video, extract audio first
      if (isVideoFile(filePath)) {
        finalPath = await invoke<string>('extract_audio_from_video', { sourcePath: filePath });
      }
      await addSound(name.trim(), finalPath, category);
      setName('');
      setFilePath('');
      setCategory('all');
      onClose();
    } catch (e) {
      console.error('Failed to add sound:', e);
      setTtsError(`${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setFilePath(file.name);
      if (!name) {
        setName(file.name.replace(/\.[^.]+$/, ''));
      }
    }
  }, [name]);

  // ── Record tab handlers ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 100);

      const updateLevel = () => {
        if (analyserRef.current) {
          const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(freqData);
          const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
          setLevel(avg / 255);
        }
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      if (!recName) {
        setRecName(`${t('recording')} ${new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`);
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

  const handleSaveRecording = async () => {
    if (!audioBlob || !recName.trim()) return;
    setSaving(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const wavData = encodeWav(audioBuffer);
      const wavArray = Array.from(new Uint8Array(wavData));

      await invoke('save_recording', {
        audioData: wavArray,
        name: recName.trim(),
        category: recCategory,
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

  // ── TTS helpers ──
  const detectLanguage = (text: string): string => {
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) return 'ja';
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';

    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    const scores: Record<string, number> = { fr: 0, en: 0, es: 0, de: 0, it: 0, pt: 0 };

    // Character-based scoring
    for (const ch of lower) {
      if ('àâéèêëïîôùûç'.includes(ch)) scores.fr += 3;
      if ('ñ¿¡'.includes(ch)) scores.es += 3;
      if ('äöüß'.includes(ch)) scores.de += 3;
      if ('ãõ'.includes(ch)) scores.pt += 3;
    }

    // Word-based scoring
    const frWords = new Set(['je','tu','il','elle','nous','vous','ils','elles','le','la','les','un','une','des','de','du','au','aux','et','ou','mais','donc','car','ni','que','qui','ce','cette','ces','son','sa','ses','mon','ma','mes','ton','ta','tes','est','sont','suis','avons','avez','ont','ai','as','fait','dans','pour','sur','avec','par','pas','ne','plus','très','bien','aussi','tout','tous','toute','toutes','ici','où','quand','comment','pourquoi','parce','comme','quel','quelle','quoi','être','avoir','faire','dire','aller','voir','venir','pouvoir','vouloir','devoir','savoir','mettre','prendre','donner','falloir','bonjour','merci','oui','non','salut','voici','voilà','alors','encore','entre','après','avant','pendant','depuis','vers','chez','sans','sous','contre','moi','toi','lui','eux','notre','votre','leur','leurs','même','autre','chaque','peu','beaucoup','trop','assez','jamais','toujours','souvent','parfois','maintenant','peut','cela','ça','quoi']);
    const enWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','must','can','could','and','but','or','nor','for','yet','so','at','by','in','of','on','to','up','with','from','into','about','after','before','between','through','during','without','against','within','along','following','across','behind','beyond','i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their','this','that','these','those','what','which','who','whom','whose','when','where','why','how','not','no','yes','hello','please','thank','thanks']);
    const esWords = new Set(['el','la','los','las','un','una','unos','unas','es','son','está','están','soy','somos','y','o','pero','porque','para','por','con','sin','sobre','entre','como','más','muy','también','todo','todos','esta','este','ese','esa','aquí','ahí','allí','qué','quién','cuándo','dónde','cómo','hola','sí','no','gracias','tiene','hay','hacer','decir','ir','ver','dar','saber','poder','querer','poner','tener','venir']);
    const deWords = new Set(['der','die','das','ein','eine','ist','sind','war','waren','und','oder','aber','nicht','ich','du','er','sie','es','wir','ihr','mein','dein','sein','unser','euer','was','wer','wie','wo','wann','warum','haben','werden','können','müssen','sollen','dürfen','wollen','mögen','mit','von','zu','auf','in','an','für','über','nach','aus','bei','durch','um','gegen','ohne','hallo','ja','nein','danke','bitte']);
    const itWords = new Set(['il','lo','la','i','gli','le','un','uno','una','è','sono','e','o','ma','perché','per','con','su','tra','fra','come','più','molto','anche','tutto','tutti','questa','questo','quella','quello','qui','lì','chi','che','dove','quando','come','ciao','sì','no','grazie','avere','essere','fare','dire','andare','venire','potere','volere','dovere','sapere']);
    const ptWords = new Set(['o','a','os','as','um','uma','uns','umas','é','são','está','e','ou','mas','porque','para','por','com','sem','sobre','entre','como','mais','muito','também','todo','todos','esta','este','esse','essa','aqui','ali','quem','que','onde','quando','como','olá','sim','não','obrigado','ter','ser','estar','fazer','dizer','ir','ver','dar','saber','poder','querer']);

    const wordSets: [Set<string>, string][] = [[frWords,'fr'],[enWords,'en'],[esWords,'es'],[deWords,'de'],[itWords,'it'],[ptWords,'pt']];
    for (const w of words) {
      const clean = w.replace(/[^a-zàâéèêëïîôùûçñäöüßãõ]/g, '');
      if (clean.length < 2) continue;
      for (const [set, lang] of wordSets) {
        if (set.has(clean)) scores[lang] += 2;
      }
    }

    let best = 'fr'; // default to French
    let bestScore = -1;
    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) { bestScore = score; best = lang; }
    }
    // Only return detected lang if there was some signal, otherwise default French
    if (bestScore === 0) return 'fr';
    return best;
  };

  // Auto-detect language and select best matching voice
  useEffect(() => {
    if (!ttsText.trim()) { setTtsDetectedLang(''); return; }
    const lang = detectLanguage(ttsText);
    setTtsDetectedLang(lang);
    setTtsLangFilter(lang);
    // Auto-select a voice matching the detected language
    const matching = ttsVoices.find(v => langCodeOf(v.culture) === lang);
    if (matching && ttsVoice !== matching.name) {
      setTtsVoice(matching.name);
    }
  }, [ttsText, ttsVoices]);

  const handleTtsSynthesize = async () => {
    if (!ttsText.trim()) return;
    setTtsLoading(true);
    setTtsError(null);
    try {
      if (ttsEngine === 'piper') {
        if (!data?.settings.piperPath || !data?.settings.piperModel) {
          setTtsError(t('configurePiperHint'));
          return;
        }
        await invoke('synthesize_piper', {
          text: ttsText.trim(),
          piperPath: data.settings.piperPath,
          modelPath: data.settings.piperModel,
        });
      } else {
        if (!ttsVoice) return;
        const selectedVoice = ttsVoices.find(v => v.name === ttsVoice);
        await invoke('synthesize_speech', { text: ttsText.trim(), voiceName: ttsVoice, rate: ttsRate, engine: selectedVoice?.engine || 'SAPI' });
      }
      await loadData();
      onClose();
    } catch (e) {
      setTtsError(`${e}`);
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={recording ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          pt: 2,
          pb: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              bgcolor: 'rgba(124, 92, 252, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloudUpload sx={{ fontSize: 18, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              {t('addSound')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              {t('fileRecordingOrTts')}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={recording} sx={{ width: 28, height: 28 }}>
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Tab pills */}
      <Box sx={{ display: 'flex', gap: 0.5, px: 2.5, pb: 1.5 }}>
        {([
          { icon: <InsertDriveFile sx={{ fontSize: 14 }} />, label: t('file') },
          { icon: <Mic sx={{ fontSize: 14 }} />, label: t('record') },
          { icon: <RecordVoiceOver sx={{ fontSize: 14 }} />, label: t('textTts') },
        ]).map((t, idx) => (
          <Chip
            key={idx}
            icon={t.icon}
            label={t.label}
            size="small"
            variant={activeTab === idx ? 'filled' : 'outlined'}
            color={activeTab === idx ? 'primary' : 'default'}
            onClick={() => !loading && setActiveTab(idx)}
            sx={{
              fontSize: '0.72rem',
              height: 28,
              cursor: loading ? 'default' : 'pointer',
              borderRadius: '8px',
              fontWeight: activeTab === idx ? 600 : 400,
              transition: 'all 0.15s ease',
              ...(activeTab === idx && {
                boxShadow: '0 2px 8px rgba(124, 92, 252, 0.25)',
              }),
            }}
          />
        ))}
      </Box>

      <DialogContent sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={handleBrowse}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: '14px',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                bgcolor: dragOver
                  ? 'rgba(124, 92, 252, 0.08)'
                  : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(124, 92, 252, 0.06)',
                },
              }}
            >
              <Box sx={{
                width: 44, height: 44, borderRadius: '12px',
                bgcolor: 'rgba(124, 92, 252, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CloudUpload sx={{ fontSize: 22, color: 'primary.main' }} />
              </Box>
              {filePath ? (
                <>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    {filePath.replace(/\\/g, '/').split('/').pop()}
                  </Typography>
                  {isVideoFile(filePath) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <Videocam sx={{ fontSize: 13, color: 'warning.main' }} />
                      <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.65rem' }}>{t('videoAudioExtract')}</Typography>
                    </Box>
                  )}
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                    {t('dragDropOrBrowse')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', opacity: 0.6 }}>
                    MP3, WAV, OGG, FLAC, AAC, M4A — MP4, MKV, AVI, MOV
                  </Typography>
                </>
              )}
            </Box>

            <TextField label={t('soundName')} value={name} onChange={e => setName(e.target.value)} fullWidth size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>{t('category')}</InputLabel>
              <Select value={category} onChange={e => setCategory(e.target.value)} label={t('category')} sx={{ borderRadius: '10px' }}>
                {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
              </Select>
            </FormControl>

            {ttsError && <Alert severity="error" onClose={() => setTtsError(null)} sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '10px' }}>{ttsError}</Alert>}

            <Button
              onClick={handleSubmitFile}
              variant="contained"
              disabled={!name.trim() || !filePath || loading}
              fullWidth
              sx={{ borderRadius: '10px', py: 1, textTransform: 'none', fontWeight: 600 }}
            >
              {loading ? (isVideoFile(filePath) ? t('extractingAudio') : t('adding')) : t('addSound')}
            </Button>
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                py: 3,
                borderRadius: '14px',
                bgcolor: recording
                  ? 'rgba(211, 47, 47, 0.1)'
                  : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                border: '1px solid',
                borderColor: recording ? 'error.main' : 'divider',
                transition: 'all 0.3s ease',
              }}
            >
              {recording ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main',
                      animation: 'pulse 1s ease-in-out infinite',
                      '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                    }} />
                    <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {formatDuration(duration)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate" value={level * 100}
                    sx={{
                      width: '70%', height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)',
                      '& .MuiLinearProgress-bar': { bgcolor: level > 0.7 ? 'error.light' : 'success.main', transition: 'none', borderRadius: 3 },
                    }}
                  />
                  <IconButton onClick={stopRecording} sx={{
                    bgcolor: 'error.main', color: 'white', width: 48, height: 48, borderRadius: '14px',
                    '&:hover': { bgcolor: 'error.dark' },
                  }}>
                    <Stop sx={{ fontSize: 24 }} />
                  </IconButton>
                </>
              ) : audioBlob ? (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {t('recording')} — {formatDuration(duration)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={playPreview} sx={{
                      bgcolor: playing ? 'primary.dark' : 'primary.main', color: 'white', borderRadius: '10px',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}>
                      {playing ? <Stop sx={{ fontSize: 20 }} /> : <PlayArrow sx={{ fontSize: 20 }} />}
                    </IconButton>
                    <IconButton onClick={discardRecording} sx={{
                      bgcolor: 'error.main', color: 'white', borderRadius: '10px',
                      '&:hover': { bgcolor: 'error.dark' },
                    }}>
                      <Delete sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                    {t('clickToRecord')}
                  </Typography>
                  <IconButton onClick={startRecording} sx={{
                    bgcolor: 'error.main', color: 'white', width: 48, height: 48, borderRadius: '14px',
                    '&:hover': { bgcolor: 'error.dark' },
                  }}>
                    <FiberManualRecord sx={{ fontSize: 24 }} />
                  </IconButton>
                </>
              )}
            </Box>

            <TextField label={t('name')} value={recName} onChange={e => setRecName(e.target.value)} fullWidth size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>{t('category')}</InputLabel>
              <Select value={recCategory} onChange={e => setRecCategory(e.target.value)} label={t('category')} sx={{ borderRadius: '10px' }}>
                {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
              </Select>
            </FormControl>

            <Button
              onClick={handleSaveRecording}
              variant="contained"
              disabled={!audioBlob || !recName.trim() || saving || recording}
              fullWidth
              sx={{ borderRadius: '10px', py: 1, textTransform: 'none', fontWeight: 600 }}
            >
              {saving ? t('saving') : t('save')}
            </Button>
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Engine toggle */}
            <ToggleButtonGroup
              value={ttsEngine}
              exclusive
              onChange={(_, v) => { if (v) setTtsEngine(v); }}
              size="small"
              fullWidth
              sx={{
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'divider',
                p: '3px',
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '8px !important',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  py: 0.5,
                  '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                },
              }}
            >
              <ToggleButton value="windows">Windows TTS</ToggleButton>
              <ToggleButton value="piper" disabled={!piperAvailable}>
                Piper (Local){!piperAvailable && ` — ${t('piperNotConfigured')}`}
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label={t('textToSpeak')}
              value={ttsText}
              onChange={e => setTtsText(e.target.value)}
              multiline
              minRows={3}
              maxRows={5}
              fullWidth
              size="small"
              placeholder={t('typeTextHere')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />

            {ttsDetectedLang && ttsEngine === 'windows' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{t('detectedLang')}</Typography>
                <Chip label={LANG_LABELS[ttsDetectedLang] || ttsDetectedLang.toUpperCase()} size="small" color="info" sx={{ height: 22, fontSize: '0.65rem', borderRadius: '6px' }} />
              </Box>
            )}

            {/* Filters */}
            {ttsEngine === 'windows' && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Langue</InputLabel>
                <Select value={ttsLangFilter} onChange={e => setTtsLangFilter(e.target.value)} label="Langue" sx={{ borderRadius: '10px', fontSize: '0.82rem' }}>
                  <MenuItem value=""><em>{t('allLangs')} ({ttsVoices.length})</em></MenuItem>
                  {availableLangs.map(l => (
                    <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <ToggleButtonGroup
                value={ttsGenderFilter}
                exclusive
                onChange={(_, v) => { if (v) setTtsGenderFilter(v); }}
                size="small"
                sx={{
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  p: '2px',
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: '6px !important',
                    px: 1,
                    py: 0.3,
                    '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                  },
                }}
              >
                <ToggleButton value="All" sx={{ textTransform: 'none', fontSize: '0.7rem' }}>Tous</ToggleButton>
                <ToggleButton value="Female"><Female sx={{ fontSize: 14 }} /></ToggleButton>
                <ToggleButton value="Male"><Male sx={{ fontSize: 14 }} /></ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{filteredVoices.length} voix</Typography>
            </Box>
            )}

            {ttsEngine === 'windows' && (
            <>
            <FormControl size="small" fullWidth>
              <InputLabel>Voix</InputLabel>
              <Select value={filteredVoices.find(v => v.name === ttsVoice) ? ttsVoice : (filteredVoices[0]?.name ?? '')} onChange={e => setTtsVoice(e.target.value)} label="Voix" sx={{ borderRadius: '10px' }}>
                {filteredVoices.map(v => (
                  <MenuItem key={`${v.name}-${v.engine}`} value={v.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {v.gender === 'Female' ? <Female sx={{ fontSize: 14 }} /> : v.gender === 'Male' ? <Male sx={{ fontSize: 14 }} /> : null}
                      <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem' }}>{v.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontSize: '0.65rem' }}>{v.culture}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2" sx={{ fontSize: '0.78rem', mb: -0.5 }}>Vitesse : {ttsRate > 0 ? `+${ttsRate}` : ttsRate}</Typography>
              <Slider value={ttsRate} onChange={(_, v) => setTtsRate(v as number)} min={-5} max={5} step={1} marks size="small" />
            </Box>
            </>
            )}

            {ttsError && <Alert severity="error" onClose={() => setTtsError(null)} sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '10px' }}>{ttsError}</Alert>}

            {ttsEngine === 'windows' && ttsVoices.length === 0 && (
              <Alert severity="warning" sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '10px' }}>
                {t('noVoicesInstalledWindows')}
              </Alert>
            )}

            <Button
              onClick={handleTtsSynthesize}
              variant="contained"
              disabled={!ttsText.trim() || (ttsEngine === 'windows' && !ttsVoice) || (ttsEngine === 'piper' && !piperAvailable) || ttsLoading}
              fullWidth
              startIcon={ttsLoading ? <CircularProgress size={16} /> : <GraphicEq sx={{ fontSize: 18 }} />}
              sx={{ borderRadius: '10px', py: 1, textTransform: 'none', fontWeight: 600 }}
            >
              {ttsLoading ? t('generating') : t('generateSound')}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1;
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
