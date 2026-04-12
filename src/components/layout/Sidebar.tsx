import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Apps,
  SportsEsports,
  EmojiEmotions,
  MusicNote,
  FolderSpecial,
  Mic,
  Movie,
  Campaign,
  Notifications,
  Bolt,
  Pets,
  Forest,
  Celebration,
} from '@mui/icons-material';
import { useAppStore } from '../../stores/appStore';

const ICON_MAP: Record<string, React.ReactNode> = {
  apps: <Apps />,
  sports_esports: <SportsEsports />,
  emoji_emotions: <EmojiEmotions />,
  music_note: <MusicNote />,
  folder_special: <FolderSpecial />,
  mic: <Mic />,
  movie: <Movie />,
  announcement: <Campaign />,
  notifications: <Notifications />,
  build: <Bolt />,
  pets: <Pets />,
  nature: <Forest />,
  celebration: <Celebration />,
};

const MIN_WIDTH = 56;
const DEFAULT_WIDTH = 230;
const MAX_WIDTH = 360;
const COLLAPSE_THRESHOLD = 100;

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const data = useAppStore(s => s.data);
  const activeCategory = useAppStore(s => s.activeCategory);
  const setActiveCategory = useAppStore(s => s.setActiveCategory);
  const switchProfile = useAppStore(s => s.switchProfile);

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('tomboard_sidebar_width');
    return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(saved, 10))) : DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);
  const categories = profile?.categories ?? [];
  const profiles = data?.profiles ?? [];

  const isCollapsed = collapsed || width <= MIN_WIDTH;
  const displayWidth = isCollapsed ? MIN_WIDTH : width;

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (isCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        onToggleCollapse?.();
      }, 200);
    }
  }, [isCollapsed, onToggleCollapse]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (!isCollapsed && !isResizing) {
      hoverTimeoutRef.current = setTimeout(() => {
        onToggleCollapse?.();
      }, 400);
    }
  }, [isCollapsed, isResizing, onToggleCollapse]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = isCollapsed ? MIN_WIDTH : width;
  }, [width, isCollapsed]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + delta;

      if (newWidth < COLLAPSE_THRESHOLD) {
        onToggleCollapse?.();
        setIsResizing(false);
        return;
      }

      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      const finalWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
      localStorage.setItem('tomboard_sidebar_width', String(finalWidth));
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, width, onToggleCollapse]);

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        display: 'flex',
        height: '100%',
        position: 'relative',
        flexShrink: 0,
      }}
    >
    <Box
      component="nav"
      aria-label="Navigation catégories et profils"
      sx={{
        width: displayWidth,
        minWidth: displayWidth,
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: isResizing ? 'none' : 'width 0.2s ease, min-width 0.2s ease',
      }}
    >

      {/* Categories */}
      {!isCollapsed && (
        <Box sx={{ px: 2.5, pt: 1, pb: 1 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Catégories
          </Typography>
        </Box>
      )}
      <List dense sx={{ px: isCollapsed ? 0.5 : 1.5, flex: 1 }} aria-label="Catégories">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          const count = cat.id === 'all'
            ? (profile?.sounds.length ?? 0)
            : (profile?.sounds.filter(s => s.category === cat.id).length ?? 0);
          return isCollapsed ? (
            <Tooltip key={cat.id} title={`${cat.name} (${count})`} placement="right" arrow>
              <ListItemButton
                selected={isActive}
                aria-current={isActive ? 'true' : undefined}
                aria-label={cat.name}
                onClick={() => setActiveCategory(cat.id)}
                sx={{
                  borderRadius: '10px',
                  mb: 0.25,
                  py: 0.6,
                  px: 1,
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(124, 92, 252, 0.12)',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '&:hover': { bgcolor: 'rgba(124, 92, 252, 0.18)' },
                  },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 'auto',
                    color: isActive ? 'primary.main' : cat.color || 'text.secondary',
                    '& .MuiSvgIcon-root': { fontSize: 20 },
                  }}
                >
                  {ICON_MAP[cat.icon] ?? <FolderSpecial />}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ) : (
            <ListItemButton
              key={cat.id}
              selected={isActive}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => setActiveCategory(cat.id)}
              sx={{
                borderRadius: '10px',
                mb: 0.25,
                py: 0.6,
                px: 1.5,
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                  bgcolor: 'rgba(124, 92, 252, 0.12)',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 },
                  '&:hover': { bgcolor: 'rgba(124, 92, 252, 0.18)' },
                },
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 32,
                  color: isActive ? 'primary.main' : cat.color || 'text.secondary',
                  '& .MuiSvgIcon-root': { fontSize: 18 },
                }}
              >
                {ICON_MAP[cat.icon] ?? <FolderSpecial />}
              </ListItemIcon>
              <ListItemText
                primary={cat.name}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 600 : 450,
                      color: isActive ? 'primary.main' : 'text.primary',
                    },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive ? 'rgba(124, 92, 252, 0.1)' : 'action.hover',
                  px: 0.8,
                  py: 0.1,
                  borderRadius: '6px',
                  minWidth: 20,
                  textAlign: 'center',
                }}
              >
                {count}
              </Typography>
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ mx: isCollapsed ? 0.5 : 2.5, opacity: 0.5 }} />

      {/* Profiles */}
      {!isCollapsed && (
        <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Profils
          </Typography>
        </Box>
      )}
      <List dense sx={{ px: isCollapsed ? 0.5 : 1.5, pb: 2 }} aria-label="Profils">
        {profiles.map(p => {
          const isActive = data?.settings.activeProfileId === p.id;
          return isCollapsed ? (
            <Tooltip key={p.id} title={p.name} placement="right" arrow>
              <ListItemButton
                selected={isActive}
                aria-current={isActive ? 'true' : undefined}
                aria-label={p.name}
                onClick={() => switchProfile(p.id)}
                sx={{
                  borderRadius: '10px',
                  mb: 0.25,
                  py: 0.6,
                  px: 1,
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(124, 92, 252, 0.12)',
                    '&:hover': { bgcolor: 'rgba(124, 92, 252, 0.18)' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 'auto' }}>
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: isActive ? 'primary.main' : 'action.hover',
                      color: isActive ? 'primary.contrastText' : 'text.secondary',
                    }}
                  >
                    {p.name[0]}
                  </Avatar>
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ) : (
            <ListItemButton
              key={p.id}
              selected={isActive}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => switchProfile(p.id)}
              sx={{
                borderRadius: '10px',
                mb: 0.25,
                py: 0.6,
                px: 1.5,
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                  bgcolor: 'rgba(124, 92, 252, 0.12)',
                  '&:hover': { bgcolor: 'rgba(124, 92, 252, 0.18)' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Avatar
                  sx={{
                    width: 22,
                    height: 22,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    bgcolor: isActive ? 'primary.main' : 'action.hover',
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  {p.name[0]}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={p.name}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 600 : 450,
                    },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                }}
              >
                {p.sounds.length}
              </Typography>
            </ListItemButton>
          );
        })}
      </List>
    </Box>

    {/* Resize handle */}
    {!isCollapsed && (
      <Box
        onMouseDown={handleMouseDown}
        aria-label="Redimensionner la sidebar"
        role="separator"
        aria-orientation="vertical"
        sx={{
          width: 4,
          cursor: 'col-resize',
          flexShrink: 0,
          bgcolor: isResizing ? 'primary.main' : 'transparent',
          transition: isResizing ? 'none' : 'background-color 0.15s ease',
          '&:hover': {
            bgcolor: 'rgba(124, 92, 252, 0.4)',
          },
        }}
      />
    )}
    </Box>
  );
}
