import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import {
  Stop,
  FullscreenExit,
  StopCircle,
  NorthWest,
  NorthEast,
  SouthWest,
  SouthEast,
} from '@mui/icons-material';
import TomBoardLogo from '../TomBoardLogo';
import { useAppStore, useFilteredSounds } from '../../stores/appStore';
import { useI18n } from '../../i18n/I18nProvider';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { currentMonitor } from '@tauri-apps/api/window';
import { LogicalPosition } from '@tauri-apps/api/dpi';

interface OverlayViewProps {
  onExitOverlay: () => void;
}

const CORNER_MARGIN = 16;

async function snapToCorner(corner: 'tl' | 'tr' | 'bl' | 'br') {
  const win = getCurrentWindow();
  const monitor = await currentMonitor();
  if (!monitor) return;

  const { width: screenW, height: screenH } = monitor.size;
  const scaleFactor = monitor.scaleFactor;
  const logicalW = screenW / scaleFactor;
  const logicalH = screenH / scaleFactor;

  const winSize = await win.outerSize();
  const wW = winSize.width / scaleFactor;
  const wH = winSize.height / scaleFactor;

  let x = CORNER_MARGIN;
  let y = CORNER_MARGIN;

  if (corner === 'tr' || corner === 'br') x = logicalW - wW - CORNER_MARGIN;
  if (corner === 'bl' || corner === 'br') y = logicalH - wH - CORNER_MARGIN;

  await win.setPosition(new LogicalPosition(x, y));
}

export default function OverlayView({ onExitOverlay }: OverlayViewProps) {
  const sounds = useFilteredSounds();
  const playSound = useAppStore(s => s.playSound);
  const playingIds = useAppStore(s => s.playingIds);
  const stopAll = useAppStore(s => s.stopAll);
  const { t } = useI18n();

  return (
    <Box
      data-tauri-drag-region
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'rgba(11, 14, 20, 0.92)',
        backdropFilter: 'blur(24px)',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(124, 92, 252, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Mini titlebar */}
      <Box
        data-tauri-drag-region
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.5,
          bgcolor: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          WebkitAppRegion: 'drag',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }} data-tauri-drag-region>
          <TomBoardLogo size={13} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: '0.65rem',
              background: 'linear-gradient(135deg, #A78BFA, #7C5CFC)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            data-tauri-drag-region
          >
            TomBoard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.25, WebkitAppRegion: 'no-drag' }}>
          {playingIds.length > 0 && (
            <Tooltip title={t('stopAll')} arrow>
              <IconButton size="small" onClick={stopAll} sx={{ color: 'error.main', width: 22, height: 22 }}>
                <StopCircle sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Mode normal" arrow>
            <IconButton size="small" onClick={onExitOverlay} sx={{ color: 'text.secondary', width: 22, height: 22 }}>
              <FullscreenExit sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Compact sound grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
          gap: 0.5,
          p: 0.75,
          flex: 1,
          overflow: 'auto',
          alignContent: 'start',
        }}
      >
        {sounds.slice(0, 30).map(sound => {
          const isPlaying = playingIds.includes(sound.id);
          return (
            <Tooltip key={sound.id} title={sound.name} arrow>
              <Box
                onClick={() => playSound(sound)}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '10px',
                  bgcolor: isPlaying ? 'rgba(124, 92, 252, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1.5px solid',
                  borderColor: isPlaying ? 'primary.main' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    bgcolor: isPlaying ? 'rgba(124, 92, 252, 0.35)' : 'rgba(255, 255, 255, 0.1)',
                    transform: 'scale(1.08)',
                    borderColor: isPlaying ? 'primary.light' : 'rgba(124, 92, 252, 0.3)',
                  },
                  ...(isPlaying && {
                    boxShadow: '0 0 10px rgba(124, 92, 252, 0.2)',
                  }),
                }}
              >
                {isPlaying ? (
                  <Stop sx={{ fontSize: 18, color: 'primary.main' }} />
                ) : (
                  sound.icon
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Corner snap buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0.5,
          px: 1,
          py: 0.5,
          bgcolor: 'rgba(0, 0, 0, 0.25)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          WebkitAppRegion: 'no-drag',
        }}
      >
        {([
          ['tl', NorthWest],
          ['tr', NorthEast],
          ['bl', SouthWest],
          ['br', SouthEast],
        ] as const).map(([corner, DirIcon]) => (
          <Tooltip key={corner} title={`Fixer en ${corner === 'tl' ? 'haut-gauche' : corner === 'tr' ? 'haut-droite' : corner === 'bl' ? 'bas-gauche' : 'bas-droite'}`} arrow>
            <IconButton
              size="small"
              onClick={() => snapToCorner(corner)}
              sx={{
                color: 'text.secondary',
                width: 22,
                height: 22,
                borderRadius: '6px',
                '&:hover': { color: 'primary.main', bgcolor: 'rgba(124, 92, 252, 0.1)' },
              }}
            >
              <DirIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
