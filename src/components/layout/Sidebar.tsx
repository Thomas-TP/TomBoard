import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
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

interface SidebarProps {}

export default function Sidebar({}: SidebarProps) {
  const data = useAppStore(s => s.data);
  const activeCategory = useAppStore(s => s.activeCategory);
  const setActiveCategory = useAppStore(s => s.setActiveCategory);
  const switchProfile = useAppStore(s => s.switchProfile);

  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);
  const categories = profile?.categories ?? [];
  const profiles = data?.profiles ?? [];

  return (
    <Box
      sx={{
        width: 230,
        minWidth: 230,
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Categories */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
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
      <List dense sx={{ px: 1.5, flex: 1 }}>
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          const count = cat.id === 'all'
            ? (profile?.sounds.length ?? 0)
            : (profile?.sounds.filter(s => s.category === cat.id).length ?? 0);
          return (
            <ListItemButton
              key={cat.id}
              selected={isActive}
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

      <Divider sx={{ mx: 2.5, opacity: 0.5 }} />

      {/* Profiles */}
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
      <List dense sx={{ px: 1.5, pb: 2 }}>
        {profiles.map(p => {
          const isActive = data?.settings.activeProfileId === p.id;
          return (
            <ListItemButton
              key={p.id}
              selected={isActive}
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
  );
}
