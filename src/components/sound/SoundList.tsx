import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Slider,
  Chip,
} from '@mui/material';
import {
  Stop,
  Star,
  StarBorder,
  Delete,
  MusicOff,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore, useFilteredSounds } from '../../stores/appStore';
import { Sound } from '../../types';
import { useLazyBatch } from '../../hooks/useLazyBatch';
import { useI18n } from '../../i18n/I18nProvider';

interface SoundListProps {
  onContextMenu: (sound: Sound, position: { top: number; left: number }) => void;
  onEdit: (sound: Sound) => void;
}

export default function SoundList({ onContextMenu, onEdit }: SoundListProps) {
  const sounds = useFilteredSounds();
  const { visible, sentinelRef, hasMore } = useLazyBatch(sounds);
  const playSound = useAppStore(s => s.playSound);
  const toggleFavorite = useAppStore(s => s.toggleFavorite);
  const deleteSound = useAppStore(s => s.deleteSound);
  const updateSound = useAppStore(s => s.updateSound);
  const setVolume = useAppStore(s => s.setVolume);
  const playingIds = useAppStore(s => s.playingIds);
  const { t } = useI18n();

  if (sounds.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 2,
          pt: 12,
        }}
      >
        <MusicOff sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.3 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', opacity: 0.5 }}>
          {t('noSounds')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', opacity: 0.3, fontSize: '0.8rem' }}>
          {t('noSoundsHint')}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 1.5, overflow: 'auto' }}>
      <AnimatePresence mode="popLayout">
      {visible.map((sound, index) => {
        const isPlaying = playingIds.includes(sound.id);
        return (
          <motion.div
            key={sound.id}
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2, delay: index * 0.015, ease: [0.4, 0, 0.2, 1] }}
          >
          <ListItemButton
            key={sound.id}
            aria-label={`${isPlaying ? t('stop') : t('play')} ${sound.name}`}
            onClick={() => playSound(sound)}
            onDoubleClick={() => onEdit(sound)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(sound, { top: e.clientY, left: e.clientX });
            }}
            sx={{
              borderRadius: '10px',
              mb: 0.25,
              py: 0.75,
              bgcolor: isPlaying
                ? (theme) => theme.palette.mode === 'dark' ? 'rgba(124, 92, 252, 0.12)' : 'rgba(124, 92, 252, 0.06)'
                : 'transparent',
              border: '1px solid',
              borderColor: isPlaying ? 'rgba(124, 92, 252, 0.3)' : 'transparent',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: isPlaying
                  ? (theme) => theme.palette.mode === 'dark' ? 'rgba(124, 92, 252, 0.18)' : 'rgba(124, 92, 252, 0.1)'
                  : 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  bgcolor: isPlaying
                    ? 'primary.main'
                    : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                {isPlaying ? (
                  <Stop sx={{ fontSize: 16, color: 'primary.contrastText' }} />
                ) : (
                  <Typography sx={{ fontSize: '0.9rem' }}>{sound.icon}</Typography>
                )}
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={sound.name}
              slotProps={{
                primary: {
                  sx: {
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    letterSpacing: '-0.01em',
                  },
                },
              }}
            />
            {sound.isLooping && (
              <Chip
                label="Loop"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  mr: 1,
                  bgcolor: 'action.hover',
                  color: 'text.secondary',
                }}
              />
            )}
            {sound.hotkey && (
              <Chip
                label={sound.hotkey}
                size="small"
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  mr: 1,
                  borderColor: 'divider',
                }}
              />
            )}
            <Slider
              value={sound.volume}
              onChange={(e, v) => {
                e.stopPropagation();
                const vol = v as number;
                setVolume(sound.id, vol);
                updateSound({ ...sound, volume: vol });
              }}
              onClick={e => e.stopPropagation()}
              min={0}
              max={1}
              step={0.01}
              size="small"
              aria-label={`Volume de ${sound.name}`}
              sx={{ width: 70, mx: 1 }}
            />
            <IconButton
              size="small"
              aria-label={sound.isFavorite ? `${t('removeFromFavorites')} ${sound.name}` : `${t('addToFavorites')} ${sound.name}`}
              onClick={e => {
                e.stopPropagation();
                toggleFavorite(sound.id);
              }}
              sx={{
                color: sound.isFavorite ? '#FBBF24' : 'text.secondary',
                width: 28,
                height: 28,
              }}
            >
              {sound.isFavorite ? <Star sx={{ fontSize: 14 }} /> : <StarBorder sx={{ fontSize: 14 }} />}
            </IconButton>
            <IconButton
              size="small"
              aria-label={`${t('delete')} ${sound.name}`}
              onClick={e => {
                e.stopPropagation();
                deleteSound(sound.id);
              }}
              sx={{
                color: 'text.secondary',
                width: 28,
                height: 28,
                '&:hover': { color: 'error.main' },
              }}
            >
              <Delete sx={{ fontSize: 14 }} />
            </IconButton>
          </ListItemButton>
          </motion.div>
        );
      })}
      </AnimatePresence>
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </List>
  );
}
