import {
  Box,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  GridView,
  ViewList,
  DensitySmall,
  Apps,
  FolderSpecial,
  Sort,
  Star,
  Replay,
  Schedule,
  TrendingUp,
  SportsEsports,
  EmojiEmotions,
  MusicNote,
  Mic,
  Movie,
  Campaign,
  Notifications,
  Bolt,
  Pets,
  Forest,
  Celebration,
} from '@mui/icons-material';
import { useAppStore, SoundFilter, SoundSort } from '../../stores/appStore';
import { useState } from 'react';
import React from 'react';
import { useDroppable } from '@dnd-kit/core';

const ICON_MAP: Record<string, React.ReactNode> = {
  apps: <Apps sx={{ fontSize: 15 }} />,
  sports_esports: <SportsEsports sx={{ fontSize: 15 }} />,
  emoji_emotions: <EmojiEmotions sx={{ fontSize: 15 }} />,
  music_note: <MusicNote sx={{ fontSize: 15 }} />,
  folder_special: <FolderSpecial sx={{ fontSize: 15 }} />,
  mic: <Mic sx={{ fontSize: 15 }} />,
  movie: <Movie sx={{ fontSize: 15 }} />,
  announcement: <Campaign sx={{ fontSize: 15 }} />,
  notifications: <Notifications sx={{ fontSize: 15 }} />,
  build: <Bolt sx={{ fontSize: 15 }} />,
  pets: <Pets sx={{ fontSize: 15 }} />,
  nature: <Forest sx={{ fontSize: 15 }} />,
  celebration: <Celebration sx={{ fontSize: 15 }} />,
};

interface ToolbarProps {
  dragOverCategory?: string | null;
  isDragging?: boolean;
}

function DroppableCategoryChip({ cat, isActive, count, onClick, isDragOver, isDragging }: {
  cat: { id: string; name: string; icon: string; color?: string };
  isActive: boolean;
  count: number;
  onClick: () => void;
  isDragOver: boolean;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `category-drop-${cat.id}` });
  const highlighted = isDragOver || isOver;

  return (
    <Chip
      ref={setNodeRef}
      key={cat.id}
      icon={ICON_MAP[cat.icon] ? React.cloneElement(ICON_MAP[cat.icon] as React.ReactElement<any>, {
        sx: { fontSize: 16, color: isActive ? 'primary.contrastText' : (cat.color || 'text.secondary') },
      }) : undefined}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span>{cat.name}</span>
          <Typography
            component="span"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              opacity: isActive ? 0.9 : 0.5,
              ml: 0.25,
            }}
          >
            {count}
          </Typography>
        </Box>
      }
      variant={isActive ? 'filled' : 'outlined'}
      color={isActive ? 'primary' : 'default'}
      onClick={onClick}
      sx={{
        fontSize: '0.82rem',
        height: 34,
        fontWeight: isActive ? 700 : 500,
        borderColor: highlighted ? 'primary.main' : isActive ? undefined : 'divider',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        flexShrink: 0,
        px: 0.5,
        ...(highlighted && isDragging && {
          bgcolor: 'rgba(124, 92, 252, 0.2)',
          borderColor: 'primary.main',
          transform: 'scale(1.08)',
          boxShadow: '0 2px 12px rgba(124, 92, 252, 0.4)',
        }),
        ...(isActive && !highlighted && {
          boxShadow: '0 2px 8px rgba(124, 92, 252, 0.3)',
        }),
        '&:hover': {
          bgcolor: isActive ? undefined : 'action.hover',
          borderColor: isActive ? undefined : 'text.secondary',
          transform: highlighted ? 'scale(1.08)' : 'translateY(-1px)',
        },
      }}
    />
  );
}

export default function Toolbar({ dragOverCategory, isDragging }: ToolbarProps) {
  const viewMode = useAppStore(s => s.viewMode);
  const setViewMode = useAppStore(s => s.setViewMode);
  const data = useAppStore(s => s.data);
  const activeCategory = useAppStore(s => s.activeCategory);
  const setActiveCategory = useAppStore(s => s.setActiveCategory);
  const activeFilter = useAppStore(s => s.activeFilter);
  const setActiveFilter = useAppStore(s => s.setActiveFilter);
  const activeSort = useAppStore(s => s.activeSort);
  const setActiveSort = useAppStore(s => s.setActiveSort);

  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);

  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);
  const categories = profile?.categories ?? [];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        px: 2,
        pt: 1.5,
        pb: 0.5,
        flexShrink: 0,
      }}
    >
      {/* Row 1: Categories */}
      <Box
        data-tour="categories"
        sx={{
          display: 'flex',
          gap: 0.75,
          overflow: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          const count = cat.id === 'all'
            ? (profile?.sounds.length ?? 0)
            : (profile?.sounds.filter(s => s.category === cat.id).length ?? 0);
          return (
            <DroppableCategoryChip
              key={cat.id}
              cat={cat}
              isActive={isActive}
              count={count}
              onClick={() => setActiveCategory(cat.id)}
              isDragOver={dragOverCategory === cat.id}
              isDragging={!!isDragging}
            />
          );
        })}
      </Box>

      {/* Row 2: Filters, Sort, View toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 0.25, flex: 1 }}>
          {([['favorites', '⭐', Star], ['looping', '🔁', Replay], ['recent', '🕐', Schedule], ['most-played', '🔥', TrendingUp]] as [SoundFilter, string, React.ComponentType<any>][]).map(([filter, , FilterIcon]) => {
            const isActive = activeFilter === filter;
            return (
              <Tooltip key={filter} title={filter === 'favorites' ? 'Favoris' : filter === 'looping' ? 'Boucle' : filter === 'recent' ? 'Récents' : 'Top'} arrow>
                <IconButton
                  size="small"
                  onClick={() => setActiveFilter(isActive ? 'all' : filter)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    bgcolor: isActive ? 'rgba(124, 92, 252, 0.15)' : 'transparent',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    border: '1px solid',
                    borderColor: isActive ? 'primary.main' : 'transparent',
                    '&:hover': { bgcolor: isActive ? 'rgba(124, 92, 252, 0.2)' : 'action.hover' },
                  }}
                >
                  <FilterIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            );
          })}
        </Box>

        {/* Sort */}
        <Tooltip title="Trier" arrow>
          <IconButton
            size="small"
            onClick={e => setSortAnchor(e.currentTarget)}
            sx={{
              color: activeSort !== 'order' ? 'primary.main' : 'text.secondary',
              width: 28,
              height: 28,
              borderRadius: '8px',
            }}
          >
            <Sort sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={sortAnchor} open={!!sortAnchor} onClose={() => setSortAnchor(null)}>
          {([['order', 'Par défaut'], ['name', 'Nom (A-Z)'], ['recent', 'Plus récents'], ['most-played', 'Plus joués']] as [SoundSort, string][]).map(([sort, label]) => (
            <MenuItem
              key={sort}
              selected={activeSort === sort}
              onClick={() => { setActiveSort(sort); setSortAnchor(null); }}
              sx={{ fontSize: '0.82rem', borderRadius: '8px', mx: 0.5 }}
            >
              {label}
            </MenuItem>
          ))}
        </Menu>

        {/* View toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
          aria-label="Mode d'affichage"
          sx={{
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            p: '2px',
            flexShrink: 0,
            '& .MuiToggleButton-root': {
              border: 'none',
              borderRadius: '6px !important',
              px: 0.75,
              py: 0.3,
              color: 'text.secondary',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            },
          }}
        >
          <ToggleButton value="grid" aria-label="Vue grille">
            <GridView sx={{ fontSize: 15 }} />
          </ToggleButton>
          <ToggleButton value="list" aria-label="Vue liste">
            <ViewList sx={{ fontSize: 15 }} />
          </ToggleButton>
          <ToggleButton value="compact" aria-label="Vue compacte">
            <DensitySmall sx={{ fontSize: 15 }} />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}
