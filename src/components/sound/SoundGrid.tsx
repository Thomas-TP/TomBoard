import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import SoundCard from './SoundCard';
import { useFilteredSounds } from '../../stores/appStore';
import { MusicOff } from '@mui/icons-material';
import { Sound } from '../../types';
import { useLazyBatch } from '../../hooks/useLazyBatch';
import { useI18n } from '../../i18n/I18nProvider';

interface SoundGridProps {
  onContextMenu: (sound: Sound, position: { top: number; left: number }) => void;
  onEdit: (sound: Sound) => void;
  dragActiveId?: string | null;
  compact?: boolean;
}

export default function SoundGrid({ onContextMenu, onEdit, dragActiveId, compact }: SoundGridProps) {
  const sounds = useFilteredSounds();
  const { visible, sentinelRef, hasMore } = useLazyBatch(sounds);
  const { t } = useI18n();

  if (sounds.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
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
          <motion.div
            animate={{ rotate: [0, -8, 8, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
          >
            <MusicOff sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.3 }} />
          </motion.div>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', opacity: 0.5 }}>
            {t('noSounds')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', opacity: 0.3, fontSize: '0.8rem' }}>
            {t('noSoundsHint')}
          </Typography>
        </Box>
      </motion.div>
    );
  }

  return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: compact
            ? 'repeat(auto-fill, minmax(76px, 1fr))'
            : 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: compact ? 0.75 : 1.5,
          px: 2,
          pt: 0.5,
          pb: 4,
          alignContent: 'start',
        }}
      >
        <AnimatePresence mode="popLayout">
          {visible.map(sound => (
            <SoundCard
              key={sound.id}
              sound={sound}
              onContextMenu={onContextMenu}
              onEdit={onEdit}
              isDragActive={dragActiveId === sound.id}
              compact={compact}
            />
          ))}
        </AnimatePresence>
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      </Box>
  );
}
