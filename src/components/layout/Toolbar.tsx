import {
  Box,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  GridView,
  ViewList,
  DensitySmall,
  Sort,
  Star,
  Replay,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';
import { useAppStore, SoundFilter, SoundSort } from '../../stores/appStore';
import { useState } from 'react';
import React from 'react';

export default function Toolbar() {
  const viewMode = useAppStore(s => s.viewMode);
  const setViewMode = useAppStore(s => s.setViewMode);
  const activeFilter = useAppStore(s => s.activeFilter);
  const setActiveFilter = useAppStore(s => s.setActiveFilter);
  const activeSort = useAppStore(s => s.activeSort);
  const setActiveSort = useAppStore(s => s.setActiveSort);

  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);

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
      {/* Filters, Sort, View toggle */}
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
