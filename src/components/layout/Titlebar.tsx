import { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  InputBase,
  Tooltip,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Minimize,
  CropSquare,
  Close,
  Search,
  Add,
  Settings,
  Mic as MicIcon,
  PictureInPicture,
  LibraryMusic,
  CheckCircle,
} from '@mui/icons-material';
import TomBoardLogo from '../TomBoardLogo';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../../stores/appStore';

const appWindow = getCurrentWindow();

interface TitlebarProps {
  onAddClick: () => void;
  onLibraryClick: () => void;
  onSettingsClick: () => void;
  onOverlayClick: () => void;
  onVoiceChangerClick: () => void;
}

export default function Titlebar({
  onAddClick,
  onLibraryClick,
  onSettingsClick,
  onOverlayClick,
  onVoiceChangerClick,
}: TitlebarProps) {
  const searchQuery = useAppStore(s => s.searchQuery);
  const setSearchQuery = useAppStore(s => s.setSearchQuery);
  const data = useAppStore(s => s.data);
  const switchProfile = useAppStore(s => s.switchProfile);
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);

  const profiles = data?.profiles ?? [];
  const activeProfile = profiles.find(p => p.id === data?.settings.activeProfileId);

  return (
    <Box
      data-tauri-drag-region
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: 46,
        px: 1.5,
        gap: 1,
        bgcolor: 'transparent',
        borderBottom: '1px solid',
        borderColor: 'divider',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        position: 'relative',
        zIndex: 1300,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 0.5 }} data-tauri-drag-region>
        <TomBoardLogo size={18} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #A78BFA 0%, #7C5CFC 50%, #00D4AA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '0.78rem',
            letterSpacing: '0.03em',
          }}
          data-tauri-drag-region
        >
          TomBoard
        </Typography>
      </Box>

      {/* Search */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          px: 1.25,
          width: 240,
          transition: 'all 0.2s ease',
          WebkitAppRegion: 'no-drag',
          '&:focus-within': {
            borderColor: 'primary.main',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(124, 92, 252, 0.06)' : 'rgba(124, 92, 252, 0.04)',
            boxShadow: '0 0 0 3px rgba(124, 92, 252, 0.08)',
            width: 300,
          },
        }}
      >
        <Search sx={{ fontSize: 16, color: 'text.secondary', mr: 0.75, flexShrink: 0 }} />
        <InputBase
          placeholder="Rechercher un son..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          sx={{ flex: 1, fontSize: '0.78rem', py: 0.4, '& input::placeholder': { opacity: 0.45, fontSize: '0.78rem' } }}
        />
      </Box>

      {/* Spacer (draggable) */}
      <Box sx={{ flex: 1 }} data-tauri-drag-region />

      {/* Profile selector */}
      <Box sx={{ WebkitAppRegion: 'no-drag' }}>
        <Tooltip title={`Profil: ${activeProfile?.name ?? '—'}`} arrow>
          <IconButton
            size="small"
            onClick={e => setProfileAnchor(e.currentTarget)}
            sx={{
              borderRadius: '8px',
              px: 1,
              py: 0.4,
              gap: 0.5,
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover', borderColor: 'text.secondary' },
            }}
          >
            <Avatar
              sx={{
                width: 18,
                height: 18,
                fontSize: '0.55rem',
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              {activeProfile?.name[0] ?? 'P'}
            </Avatar>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.primary' }}>
              {activeProfile?.name ?? 'Profil'}
            </Typography>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={profileAnchor}
          open={!!profileAnchor}
          onClose={() => setProfileAnchor(null)}
          slotProps={{
            paper: { sx: { borderRadius: '12px', minWidth: 180, mt: 0.5 } },
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {profiles.map(p => (
            <MenuItem
              key={p.id}
              onClick={() => { switchProfile(p.id); setProfileAnchor(null); }}
              selected={p.id === data?.settings.activeProfileId}
              sx={{ borderRadius: '8px', mx: 0.5, fontSize: '0.82rem', py: 0.75 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Avatar
                  sx={{
                    width: 20,
                    height: 20,
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    bgcolor: p.id === data?.settings.activeProfileId ? 'primary.main' : 'action.hover',
                    color: p.id === data?.settings.activeProfileId ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  {p.name[0]}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={p.name}
                secondary={`${p.sounds.length} son${p.sounds.length > 1 ? 's' : ''}`}
                slotProps={{
                  primary: { sx: { fontSize: '0.8rem', fontWeight: p.id === data?.settings.activeProfileId ? 600 : 400 } },
                  secondary: { sx: { fontSize: '0.65rem' } },
                }}
              />
              {p.id === data?.settings.activeProfileId && (
                <CheckCircle sx={{ fontSize: 14, color: 'primary.main', ml: 1 }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* Divider */}
      <Divider orientation="vertical" sx={{ height: 20, mx: 0.25 }} />

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 0.25, WebkitAppRegion: 'no-drag' }}>
        <Tooltip title="Ajouter un son" arrow>
          <IconButton
            data-tour="add-sound"
            onClick={onAddClick}
            size="small"
            sx={{
              width: 30,
              height: 30,
              borderRadius: '8px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <Add sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Changeur de voix" arrow>
          <IconButton data-tour="voice-changer" onClick={onVoiceChangerClick} size="small" sx={{ color: 'text.secondary', width: 30, height: 30, borderRadius: '8px' }}>
            <MicIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Bibliothèque" arrow>
          <IconButton data-tour="library" onClick={onLibraryClick} size="small" sx={{ color: 'text.secondary', width: 30, height: 30, borderRadius: '8px' }}>
            <LibraryMusic sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Mode compact" arrow>
          <IconButton onClick={onOverlayClick} size="small" sx={{ color: 'text.secondary', width: 30, height: 30, borderRadius: '8px' }}>
            <PictureInPicture sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Paramètres" arrow>
          <IconButton data-tour="settings" onClick={onSettingsClick} size="small" sx={{ color: 'text.secondary', width: 30, height: 30, borderRadius: '8px' }}>
            <Settings sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Divider */}
      <Divider orientation="vertical" sx={{ height: 20, mx: 0.25 }} />

      {/* Window controls */}
      <Box
        sx={{
          display: 'flex',
          gap: 0,
          WebkitAppRegion: 'no-drag',
        }}
      >
        <IconButton
          size="small"
          onClick={() => appWindow.minimize()}
          sx={{
            borderRadius: '8px',
            width: 34,
            height: 26,
            color: 'text.secondary',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)', color: 'text.primary' },
          }}
        >
          <Minimize sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => appWindow.toggleMaximize()}
          sx={{
            borderRadius: '8px',
            width: 34,
            height: 26,
            color: 'text.secondary',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)', color: 'text.primary' },
          }}
        >
          <CropSquare sx={{ fontSize: 12 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => appWindow.close()}
          sx={{
            borderRadius: '8px',
            width: 34,
            height: 26,
            color: 'text.secondary',
            '&:hover': { bgcolor: '#E04848', color: '#fff' },
          }}
        >
          <Close sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
