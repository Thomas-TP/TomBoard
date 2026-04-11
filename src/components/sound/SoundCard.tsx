import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  IconButton,
  Slider,
} from '@mui/material';
import {
  Stop,
  Star,
  StarBorder,
  Delete,
  Repeat,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Sound } from '../../types';
import { useAppStore } from '../../stores/appStore';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SoundCardProps {
  sound: Sound;
  onContextMenu: (sound: Sound, position: { top: number; left: number }) => void;
  onEdit: (sound: Sound) => void;
  isDragActive?: boolean;
  isOverlay?: boolean;
  compact?: boolean;
}

const MotionCard = motion.create(Card);

export default function SoundCard({ sound, onContextMenu, onEdit, isDragActive, isOverlay, compact }: SoundCardProps) {
  const playSound = useAppStore(s => s.playSound);
  const toggleFavorite = useAppStore(s => s.toggleFavorite);
  const deleteSound = useAppStore(s => s.deleteSound);
  const updateSound = useAppStore(s => s.updateSound);
  const setVolume = useAppStore(s => s.setVolume);
  const playingIds = useAppStore(s => s.playingIds);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: sortTransition,
    isDragging,
  } = useSortable({ id: sound.id, disabled: isOverlay });

  const sortStyle = {
    transform: CSS.Transform.toString(transform),
    transition: sortTransition,
    opacity: isDragActive ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const isPlaying = playingIds.includes(sound.id);

  const handleVolumeChange = (_: any, value: number | number[]) => {
    const vol = value as number;
    setVolume(sound.id, vol);
    updateSound({ ...sound, volume: vol });
  };

  return (
    <div ref={isOverlay ? undefined : setNodeRef} style={isOverlay ? undefined : sortStyle as any} {...(isOverlay ? {} : attributes)} {...(isOverlay ? {} : listeners)}>
    <MotionCard
      layout={!isDragActive && !isOverlay}
      initial={isOverlay ? false : { opacity: 0, scale: 0.92, y: 12 }}
      animate={isOverlay ? { scale: 1.05, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' } : { opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -12 }}
      whileHover={isDragActive || isOverlay ? undefined : { scale: 1.04, y: -4, transition: { duration: 0.15 } }}
      whileTap={isDragActive || isOverlay ? undefined : { scale: 0.94 }}
      onContextMenu={(e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu(sound, { top: e.clientY, left: e.clientX });
      }}
      onDoubleClick={() => onEdit(sound)}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      sx={{
        position: 'relative',
        overflow: 'visible',
        bgcolor: isPlaying
          ? (theme) => theme.palette.mode === 'dark' ? 'rgba(124, 92, 252, 0.15)' : 'rgba(124, 92, 252, 0.08)'
          : 'background.paper',
        borderColor: isPlaying ? 'primary.main' : 'divider',
        transition: 'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        ...(isPlaying && {
          boxShadow: '0 0 20px rgba(124, 92, 252, 0.15), inset 0 0 20px rgba(124, 92, 252, 0.05)',
        }),
      }}
    >
      {/* Favorite button */}
      <IconButton
        size="small"
        aria-label={sound.isFavorite ? `Retirer ${sound.name} des favoris` : `Ajouter ${sound.name} aux favoris`}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(sound.id);
        }}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          zIndex: 1,
          color: sound.isFavorite ? '#FBBF24' : 'text.secondary',
          opacity: sound.isFavorite ? 1 : 0,
          transition: 'all 0.15s ease',
          width: 24,
          height: 24,
          '.MuiCard-root:hover &': { opacity: 1 },
        }}
      >
        {sound.isFavorite ? <Star sx={{ fontSize: 14 }} /> : <StarBorder sx={{ fontSize: 14 }} />}
      </IconButton>

      {/* Delete button */}
      <IconButton
        size="small"
        aria-label={`Supprimer ${sound.name}`}
        onClick={(e) => {
          e.stopPropagation();
          deleteSound(sound.id);
        }}
        sx={{
          position: 'absolute',
          top: 4,
          left: 4,
          zIndex: 1,
          color: 'text.secondary',
          opacity: 0,
          transition: 'all 0.15s ease',
          width: 24,
          height: 24,
          '.MuiCard-root:hover &': { opacity: 0.5 },
          '&:hover': { opacity: '1 !important', color: 'error.main' },
        }}
      >
        <Delete sx={{ fontSize: 13 }} />
      </IconButton>

      <CardActionArea
        onClick={() => playSound(sound)}
        aria-label={`${isPlaying ? 'Arrêter' : 'Jouer'} ${sound.name}`}
        sx={{
          p: 0,
          '& .MuiCardActionArea-focusHighlight': {
            opacity: 0,
          },
          '&:focus-visible': {
            outline: '2px solid rgba(124, 92, 252, 0.7)',
            outlineOffset: -2,
            borderRadius: 'inherit',
          },
          '&:active::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            animation: 'play-ripple 0.5s ease-out',
            background: 'radial-gradient(circle, rgba(124, 92, 252, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
            '@keyframes play-ripple': {
              '0%': { opacity: 1, transform: 'scale(0)' },
              '100%': { opacity: 0, transform: 'scale(2.5)' },
            },
          },
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: compact ? 1 : 2,
            px: compact ? 0.75 : 1.5,
            gap: 0.5,
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              fontSize: compact ? '1.1rem' : '1.8rem',
              width: compact ? 28 : 46,
              height: compact ? 28 : 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: compact ? '8px' : '12px',
              bgcolor: isPlaying
                ? 'primary.main'
                : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
              mb: compact ? 0.25 : 0.5,
              transition: 'all 0.25s ease',
              ...(isPlaying && {
                animation: 'sound-pulse 1.5s ease-in-out infinite',
                '@keyframes sound-pulse': {
                  '0%, 100%': {
                    boxShadow: '0 0 0 0 rgba(124, 92, 252, 0.35)',
                    transform: 'scale(1)',
                  },
                  '50%': {
                    boxShadow: '0 0 20px 6px rgba(124, 92, 252, 0.25)',
                    transform: 'scale(1.05)',
                  },
                },
              }),
            }}
          >
            {isPlaying ? (
              <Stop sx={{ fontSize: compact ? 16 : 24, color: 'primary.contrastText' }} />
            ) : (
              <Typography sx={{ fontSize: compact ? '0.85rem' : '1.4rem', lineHeight: 1 }}>{sound.icon}</Typography>
            )}
          </Box>

          {/* Name */}
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: 600,
              maxWidth: '100%',
              textAlign: 'center',
              fontSize: compact ? '0.6rem' : '0.75rem',
              letterSpacing: '-0.01em',
            }}
          >
            {sound.name}
          </Typography>

          {/* Loop indicator */}
          {sound.isLooping && (
            <Repeat sx={{ fontSize: 11, color: 'text.secondary', opacity: 0.6 }} />
          )}
        </CardContent>
      </CardActionArea>

      {/* Volume slider - shown on hover, hidden in compact */}
      {!compact && (
      <Box
        sx={{
          px: 1.5,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          opacity: 0,
          height: 0,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '.MuiCard-root:hover &': {
            opacity: 1,
            height: 24,
          },
        }}
      >
        <Slider
          value={sound.volume}
          onChange={handleVolumeChange}
          min={0}
          max={1}
          step={0.01}
          size="small"
          aria-label={`Volume de ${sound.name}`}
          sx={{ flex: 1 }}
          onClick={e => e.stopPropagation()}
        />
        <Typography variant="caption" sx={{ minWidth: 24, fontSize: '0.6rem', color: 'text.secondary', fontWeight: 600 }}>
          {Math.round(sound.volume * 100)}
        </Typography>
      </Box>
      )}
    </MotionCard>
    </div>
  );
}
