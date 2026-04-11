import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  Chip,
  Skeleton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Close,
  Search,
  PlayArrow,
  Stop,
  Add,
  CheckCircle,
  AccessTime,
  LibraryMusic,
  MusicNote,
  Whatshot,
  Notifications,
  Bolt,
  SentimentVerySatisfied,
  WavingHand,
  SportsEsports,
  RecordVoiceOver,
  GraphicEq,
  Movie,
  SportsSoccer,
  Pets,
  Smartphone,
  Star,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';

interface LibrarySound {
  id: string;
  name: string;
  preview_url: string;
  download_url: string;
  duration: number;
  source: string;
  tags: string[];
  description: string;
  username: string;
  image_url: string;
  num_downloads: number;
  avg_rating: number;
}

interface SoundLibraryDialogProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { label: 'Drôle', query: 'funny', icon: SentimentVerySatisfied },
  { label: 'Musique', query: 'music', icon: MusicNote },
  { label: 'Anime', query: 'anime', icon: Movie },
  { label: 'Gaming', query: 'gaming', icon: SportsEsports },
  { label: 'Meme', query: 'meme', icon: RecordVoiceOver },
  { label: 'MLG', query: 'mlg', icon: GraphicEq },
  { label: 'TikTok', query: 'tiktok', icon: Smartphone },
  { label: 'Film', query: 'movie', icon: Movie },
  { label: 'Sport', query: 'sport goal', icon: SportsSoccer },
  { label: 'Animaux', query: 'animal cat dog', icon: Pets },
  { label: 'Notification', query: 'notification', icon: Notifications },
  { label: 'Applaudissement', query: 'applause', icon: WavingHand },
  { label: 'Explosion', query: 'explosion', icon: Bolt },
];

type LibrarySource = 'myinstants' | 'freesound';

export default function SoundLibraryDialog({ open, onClose }: SoundLibraryDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibrarySound[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [previewLoadingKey, setPreviewLoadingKey] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [source, setSource] = useState<LibrarySource>('myinstants');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadData = useAppStore(s => s.loadData);
  const data = useAppStore(s => s.data);

  const soundKey = (s: LibrarySound) => `${s.source}-${s.id}`;

  useEffect(() => {
    if (!open) {
      stopPreview();
      setQuery('');
      setResults([]);
      setError(null);
      setAddedKeys(new Set());
      setActiveCategory(null);
    }
  }, [open]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Load default content when opening
  useEffect(() => {
    if (open && results.length === 0 && !loading) {
      doSearch('', true);
    }
  }, [open]);

  const doSearch = useCallback(async (searchQuery: string, isDefault = false, src?: LibrarySource) => {
    const activeSource = src ?? source;
    setLoading(true);
    setError(null);
    setResults([]);
    stopPreview();
    try {
      let res: LibrarySound[];
      if (activeSource === 'freesound') {
        const apiKey = data?.settings.freesoundApiKey ?? '';
        res = await invoke<LibrarySound[]>('search_freesound', {
          query: searchQuery,
          apiKey,
        });
      } else {
        res = await invoke<LibrarySound[]>('search_myinstants', {
          query: searchQuery,
        });
      }
      setResults(res);
      if (res.length === 0 && !isDefault) setError('Aucun résultat trouvé.');
    } catch (e) {
      setError(`${e}`);
    } finally {
      setLoading(false);
    }
  }, [source, data?.settings.freesoundApiKey]);

  const search = () => {
    if (!query.trim()) return;
    setActiveCategory(null);
    doSearch(query.trim());
  };

  const searchCategory = (cat: { label: string; query: string; icon: React.ComponentType<any> }) => {
    setActiveCategory(cat.label);
    setQuery(cat.query);
    doSearch(cat.query);
  };

  const stopPreview = async () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    try { await invoke('stop_preview_library'); } catch { /* ignore */ }
    setPlayingKey(null);
    setPreviewLoadingKey(null);
  };

  const togglePreview = async (sound: LibrarySound) => {
    const key = soundKey(sound);
    if (playingKey === key) {
      await stopPreview();
      return;
    }
    await stopPreview();
    setPreviewLoadingKey(key);
    try {
      await invoke('preview_library_sound', { url: sound.preview_url });
      setPlayingKey(key);
      setPreviewLoadingKey(null);
      // Poll audio engine to detect when playback finishes
      pollRef.current = setInterval(async () => {
        try {
          const playing = await invoke<string[]>('get_playing');
          if (!playing.includes('__library_preview__')) {
            setPlayingKey(prev => prev === key ? null : prev);
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          }
        } catch { /* ignore */ }
      }, 500);
    } catch (e) {
      setPreviewLoadingKey(null);
      setError(`Preview impossible: ${e}`);
    }
  };

  const addToBoard = async (sound: LibrarySound) => {
    const key = soundKey(sound);
    setAddingKey(key);
    try {
      await invoke('download_library_sound', {
        url: sound.download_url,
        name: sound.name,
        category: 'all',
      });
      await loadData();
      setAddedKeys(prev => new Set(prev).add(key));
      // Auto-clear the "Ajouté" status after 3s so user can re-add
      setTimeout(() => {
        setAddedKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 3000);
    } catch (e) {
      setError(`Échec du téléchargement : ${e}`);
    } finally {
      setAddingKey(null);
    }
  };

  const formatDuration = (d: number) => {
    if (d <= 0) return '';
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
            height: '80vh',
            maxHeight: 700,
            display: 'flex',
            flexDirection: 'column',
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
          pb: 1.5,
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
            <LibraryMusic sx={{ fontSize: 18, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              Bibliothèque
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              {source === 'freesound' ? 'Freesound — Sons Creative Commons' : 'Myinstants — Sons et memes populaires'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToggleButtonGroup
            value={source}
            exclusive
            onChange={(_, v) => {
              if (v) {
                setSource(v);
                setResults([]);
                setActiveCategory(null);
                doSearch('', true, v);
              }
            }}
            size="small"
            sx={{
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              p: '2px',
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '6px !important',
                px: 1.25,
                py: 0.3,
                fontSize: '0.68rem',
                fontWeight: 600,
                textTransform: 'none',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              },
            }}
          >
            <ToggleButton value="myinstants">MyInstants</ToggleButton>
            <ToggleButton value="freesound">Freesound</ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={onClose} size="small" sx={{ width: 28, height: 28 }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 2.5, pt: 0, pb: 2, overflow: 'hidden', flex: 1 }}>
        {/* Search bar */}
        <TextField
          placeholder="Rechercher des sons..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(); }}
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: query.trim() ? (
                <InputAdornment position="end">
                  <Button
                    onClick={search}
                    disabled={loading}
                    size="small"
                    variant="contained"
                    sx={{ borderRadius: '8px', minWidth: 'auto', px: 2, textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    {loading ? <CircularProgress size={14} /> : 'Rechercher'}
                  </Button>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        {/* Category chips */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            overflow: 'auto',
            flexShrink: 0,
            pb: 0.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {CATEGORIES.map(cat => {
            const CatIcon = cat.icon;
            const isActive = activeCategory === cat.label;
            return (
              <Chip
                key={cat.label}
                icon={<CatIcon sx={{ fontSize: 14 }} />}
                label={cat.label}
                size="small"
                variant={isActive ? 'filled' : 'outlined'}
                color={isActive ? 'primary' : 'default'}
                onClick={() => searchCategory(cat)}
                sx={{
                  fontSize: '0.72rem',
                  height: 28,
                  cursor: 'pointer',
                  flexShrink: 0,
                  borderRadius: '8px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s ease',
                  ...(isActive && {
                    boxShadow: '0 2px 8px rgba(124, 92, 252, 0.25)',
                  }),
                  '&:hover': {
                    transform: 'translateY(-1px)',
                  },
                }}
              />
            );
          })}
        </Box>

        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '10px' }}>{error}</Alert>}

        {/* Loading skeletons */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, overflow: 'auto', flex: 1 }}>
            {[...Array(5)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                }}
              >
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" height={18} />
                  <Skeleton width="35%" height={14} />
                </Box>
                <Skeleton variant="rounded" width={70} height={28} sx={{ borderRadius: '8px' }} />
              </Box>
            ))}
          </Box>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              overflow: 'auto',
              flex: 1,
              scrollbarWidth: 'thin',
            }}
          >
            {results.map(sound => {
              const key = soundKey(sound);
              const isPlaying = playingKey === key;
              const isAdded = addedKeys.has(key);
              const isAdding = addingKey === key;
              const isLoadingPreview = previewLoadingKey === key;

              return (
                <Box
                  key={key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: '1px solid',
                    borderColor: isPlaying ? 'primary.main' : 'transparent',
                    bgcolor: isPlaying
                      ? 'rgba(124, 92, 252, 0.08)'
                      : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                    '&:hover': {
                      bgcolor: isPlaying
                        ? 'rgba(124, 92, 252, 0.12)'
                        : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  {/* Play button */}
                  <IconButton
                    size="small"
                    onClick={() => togglePreview(sound)}
                    disabled={isLoadingPreview}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      bgcolor: isPlaying ? 'primary.main' : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                      color: isPlaying ? 'primary.contrastText' : 'text.primary',
                      flexShrink: 0,
                      '&:hover': { bgcolor: isPlaying ? 'primary.dark' : 'action.focus' },
                    }}
                  >
                    {isLoadingPreview ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : isPlaying ? (
                      <Stop sx={{ fontSize: 16 }} />
                    ) : (
                      <PlayArrow sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>

                  {/* Info */}
                  <Box
                    sx={{ flex: 1, minWidth: 0 }}
                    onClick={() => togglePreview(sound)}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.3 }}
                      noWrap
                    >
                      {sound.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                      {sound.duration > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                          <AccessTime sx={{ fontSize: 11, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {formatDuration(sound.duration)}
                          </Typography>
                        </Box>
                      )}
                      {sound.num_downloads > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                          <Star sx={{ fontSize: 11, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {sound.num_downloads > 1000 ? `${(sound.num_downloads / 1000).toFixed(1)}k` : sound.num_downloads}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Tags */}
                  {sound.tags && sound.tags.length > 0 && (
                    <Box sx={{ display: 'none', '@media (min-width: 500px)': { display: 'flex' }, gap: 0.3, flexShrink: 0 }}>
                      {sound.tags.slice(0, 2).map(tag => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.58rem', height: 18, borderRadius: '6px' }}
                          onClick={() => { setQuery(tag); setActiveCategory(null); doSearch(tag); }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Add button */}
                  {isAdded ? (
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: 13 }} />}
                      label="Ajouté"
                      size="small"
                      color="success"
                      sx={{ fontSize: '0.68rem', height: 28, borderRadius: '8px', fontWeight: 600 }}
                    />
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => addToBoard(sound)}
                      disabled={isAdding}
                      startIcon={isAdding ? <CircularProgress size={12} /> : <Add sx={{ fontSize: 14 }} />}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        minWidth: 80,
                        height: 28,
                        px: 1.5,
                        flexShrink: 0,
                      }}
                    >
                      Ajouter
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && !error && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 1.5,
              py: 6,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                bgcolor: 'rgba(124, 92, 252, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Whatshot sx={{ fontSize: 28, color: 'primary.main', opacity: 0.6 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 500 }}>
              Recherchez parmi des milliers de sons
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', opacity: 0.6 }}>
              Utilisez la barre de recherche ou cliquez sur une catégorie
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
