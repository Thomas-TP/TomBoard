import { Box, Typography, IconButton, Tooltip, Slider } from '@mui/material';
import {
  StopCircle,
  PlayArrow,
  VolumeUp,
  VolumeDown,
  VolumeMute,
  DarkMode,
  LightMode,
  FiberManualRecord,
} from '@mui/icons-material';
import { useAppStore } from '../../stores/appStore';
import AudioVisualizer from '../sound/AudioVisualizer';

export default function StatusBar() {
  const playingIds = useAppStore(s => s.playingIds);
  const stopAll = useAppStore(s => s.stopAll);
  const data = useAppStore(s => s.data);
  const setMasterVolume = useAppStore(s => s.setMasterVolume);
  const toggleTheme = useAppStore(s => s.toggleTheme);
  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);

  const playingCount = playingIds.length;
  const playingNames = profile?.sounds
    .filter(s => playingIds.includes(s.id))
    .map(s => s.name) ?? [];

  const masterVolume = data?.settings.masterVolume ?? 0.8;
  const isDark = data?.settings.theme === 'dark';

  return (
    <Box
      sx={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        gap: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'transparent',
        flexShrink: 0,
      }}
    >
      {/* Now playing section */}
      <Box
        role="status"
        aria-live="polite"
        aria-label={playingCount > 0 ? `${playingCount} son${playingCount > 1 ? 's' : ''} en lecture: ${playingNames.join(', ')}` : 'Aucun son en lecture'}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flex: 1,
          minWidth: 0,
        }}
      >
        {playingCount > 0 ? (
          <>
            <FiberManualRecord
              sx={{
                fontSize: 8,
                color: '#00D4AA',
                flexShrink: 0,
                animation: 'pulse-dot 1.5s ease-in-out infinite',
                '@keyframes pulse-dot': {
                  '0%, 100%': { opacity: 0.4 },
                  '50%': { opacity: 1 },
                },
              }}
            />
            <AudioVisualizer />
            <Typography
              variant="caption"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                fontSize: '0.72rem',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
              noWrap
            >
              <PlayArrow sx={{ fontSize: 13, color: 'primary.main', flexShrink: 0 }} />
              {playingNames.join(' · ')}
            </Typography>
            <Tooltip title="Tout arrêter" arrow>
              <IconButton
                onClick={stopAll}
                size="small"
                sx={{
                  borderRadius: '6px',
                  width: 26,
                  height: 26,
                  color: '#FF6B6B',
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.1)' },
                }}
              >
                <StopCircle sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              opacity: 0.4,
              fontSize: '0.7rem',
              fontWeight: 500,
            }}
          >
            Prêt — {profile?.sounds.length ?? 0} son{(profile?.sounds.length ?? 0) > 1 ? 's' : ''}
          </Typography>
        )}
      </Box>

      {/* HTTP API indicator */}
      <Tooltip title="API HTTP active — port 47891" arrow>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            px: 0.75,
            py: 0.2,
            borderRadius: '6px',
            border: '1px solid',
            borderColor: 'divider',
            cursor: 'default',
          }}
        >
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: '#00D4AA',
              animation: 'pulse-dot 3s ease-in-out infinite',
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, color: 'text.secondary', fontFamily: 'monospace' }}>
            :47891
          </Typography>
        </Box>
      </Tooltip>

      {/* Theme toggle */}
      <Tooltip title={isDark ? 'Mode clair' : 'Mode sombre'} arrow>
        <IconButton
          onClick={toggleTheme}
          size="small"
          sx={{ color: 'text.secondary', width: 28, height: 28, borderRadius: '8px' }}
        >
          {isDark ? <LightMode sx={{ fontSize: 15 }} /> : <DarkMode sx={{ fontSize: 15 }} />}
        </IconButton>
      </Tooltip>

      {/* Master Volume */}
      <Box
        data-tour="volume"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          minWidth: 140,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
          px: 1,
          py: 0.3,
        }}
      >
        <IconButton
          size="small"
          onClick={() => setMasterVolume(masterVolume === 0 ? 0.8 : 0)}
          sx={{ color: 'text.secondary', p: 0.3 }}
        >
          {masterVolume === 0 ? (
            <VolumeMute sx={{ fontSize: 16 }} />
          ) : masterVolume < 0.5 ? (
            <VolumeDown sx={{ fontSize: 16 }} />
          ) : (
            <VolumeUp sx={{ fontSize: 16 }} />
          )}
        </IconButton>
        <Slider
          value={masterVolume}
          onChange={(_, v) => setMasterVolume(v as number)}
          min={0}
          max={1}
          step={0.01}
          size="small"
          aria-label="Volume principal"
          sx={{ width: 70 }}
        />
        <Typography
          variant="caption"
          sx={{
            minWidth: 28,
            textAlign: 'right',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          {Math.round(masterVolume * 100)}%
        </Typography>
      </Box>
    </Box>
  );
}
