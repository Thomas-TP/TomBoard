import { useEffect, useState, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import TomBoardLogo from './components/TomBoardLogo';
import Titlebar from './components/layout/Titlebar';
import Toolbar from './components/layout/Toolbar';
import StatusBar from './components/layout/StatusBar';
import SoundGrid from './components/sound/SoundGrid';
import SoundList from './components/sound/SoundList';
import AddSoundDialog from './components/dialogs/AddSoundDialog';
import EditSoundDialog from './components/dialogs/EditSoundDialog';
import SettingsDialog from './components/dialogs/SettingsDialog';
import SoundLibraryDialog from './components/dialogs/SoundLibraryDialog';
import OverlayView from './components/layout/OverlayView';
import SoundContextMenu from './components/sound/SoundContextMenu';
import VoiceChangerPanel from './components/VoiceChangerPanel';
import Onboarding from './components/Onboarding';
import getTheme from './styles/theme';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, useFilteredSounds } from './stores/appStore';
import { useHotkeyManager } from './hooks/useHotkeyManager';
import { Sound } from './types';
import {
  DndContext,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

function App() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editSound, setEditSound] = useState<Sound | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [overlayMode, setOverlayMode] = useState(false);
  const [voiceChangerOpen, setVoiceChangerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('tomboard_onboarding_done');
  });
  const [contextMenu, setContextMenu] = useState<{
    position: { top: number; left: number };
    sound: Sound;
  } | null>(null);
  const loadData = useAppStore(s => s.loadData);
  const refreshPlaying = useAppStore(s => s.refreshPlaying);
  const data = useAppStore(s => s.data);
  const viewMode = useAppStore(s => s.viewMode);
  const loading = useAppStore(s => s.loading);
  const reorderSounds = useAppStore(s => s.reorderSounds);
  const updateSound = useAppStore(s => s.updateSound);
  const sounds = useFilteredSounds();

  // DnD state
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    if (overId?.startsWith('category-drop-')) {
      setDragOverCategory(overId.replace('category-drop-', ''));
    } else {
      setDragOverCategory(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragActiveId(null);
    setDragOverCategory(null);
    if (!over) return;

    const overId = over.id as string;

    // Dropped onto a category chip
    if (overId.startsWith('category-drop-')) {
      const categoryId = overId.replace('category-drop-', '');
      const sound = sounds.find(s => s.id === active.id);
      if (sound && sound.category !== categoryId) {
        await updateSound({ ...sound, category: categoryId });
      }
      return;
    }

    // Normal reorder within grid
    if (active.id === over.id) return;
    const oldIndex = sounds.findIndex(s => s.id === active.id);
    const newIndex = sounds.findIndex(s => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = [...sounds];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    reorderSounds(newOrder.map(s => s.id));
  };

  const dragActiveSound = dragActiveId ? sounds.find(s => s.id === dragActiveId) : null;

  // Global hotkey manager
  useHotkeyManager();

  const enterOverlay = async () => {
    const win = getCurrentWindow();
    await win.setAlwaysOnTop(true);
    await win.setSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(320, 400));
    await win.setMinSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(200, 200));
    // Apply transparent background for overlay
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    setOverlayMode(true);
  };

  const exitOverlay = async () => {
    const win = getCurrentWindow();
    await win.setAlwaysOnTop(false);
    await win.setSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(1100, 700));
    await win.setMinSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(800, 600));
    // Restore opaque background
    document.documentElement.style.background = '';
    document.body.style.background = '';
    setOverlayMode(false);
  };

  const theme = useMemo(
    () => getTheme(data?.settings.theme ?? 'dark', data?.settings.customSeedColor),
    [data?.settings.theme, data?.settings.customSeedColor]
  );

  useEffect(() => {
    loadData().catch((e) => {
      console.error('Failed to load data:', e);
    });
  }, []);

  // Sync audio settings to backend on startup
  useEffect(() => {
    if (!data) return;
    const syncAudio = async () => {
      const { masterVolume, outputDevice, secondaryDevice, dualOutput } = data.settings;
      await invoke('set_master_volume', { volume: masterVolume }).catch(console.error);
      if (outputDevice && outputDevice !== 'default') {
        await invoke('set_output_device', { deviceName: outputDevice }).catch(console.error);
      }
      // Auto-detect virtual cable if not configured
      let secDevice = secondaryDevice;
      if (!secDevice || secDevice === 'none') {
        try {
          const cables = await invoke<string[]>('check_virtual_cable');
          console.log('[STARTUP] check_virtual_cable result:', cables);
          if (cables.length > 0) {
            secDevice = cables[0];
            const newSettings = { ...data.settings, secondaryDevice: secDevice, dualOutput: true };
            await invoke('save_settings', { settings: newSettings });
            loadData();
          }
        } catch (e) { console.warn('[STARTUP] check_virtual_cable failed:', e); }
      }
      console.log('[STARTUP] secDevice:', secDevice, 'dualOutput:', dualOutput);
      if (secDevice && secDevice !== 'none') {
        try {
          await invoke('set_secondary_device', { deviceName: secDevice });
          console.log('[STARTUP] set_secondary_device OK:', secDevice);
        } catch (e) { console.error('[STARTUP] set_secondary_device FAILED:', e); }
        try {
          await invoke('set_dual_output', { enabled: true });
          console.log('[STARTUP] set_dual_output OK: true');
        } catch (e) { console.error('[STARTUP] set_dual_output FAILED:', e); }
        // Auto-start mic passthrough if a mic is selected
        const micDev = data.settings.micPassthroughDevice;
        if (micDev) {
          try {
            await invoke('start_mic_passthrough', { inputDevice: micDev, outputDevice: secDevice });
            console.log('[STARTUP] start_mic_passthrough OK:', micDev, '->', secDevice);
          } catch (e) { console.error('[STARTUP] start_mic_passthrough FAILED:', e); }
        }
        // Sync silent mode
        if (data.settings.silentMode) {
          await invoke('set_silent_mode', { enabled: true }).catch(console.error);
        }
        // Sync noise suppression
        if (data.settings.noiseSuppression !== false) {
          await invoke('set_noise_suppression', { enabled: true }).catch(console.error);
        }
      } else {
        await invoke('set_dual_output', { enabled: dualOutput }).catch(console.error);
      }
    };
    syncAudio();
  }, [!!data]); // runs once when data first loads

  // Periodically refresh playing state
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      refreshPlaying();
    }, 500);
    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            bgcolor: '#0B0E14',
            color: '#fff',
            flexDirection: 'column',
            gap: 3,
            backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(124, 92, 252, 0.12) 0%, transparent 70%)',
          }}
        >
          <Box
            sx={{
              animation: 'pulse-logo 2s ease-in-out infinite',
              '@keyframes pulse-logo': {
                '0%, 100%': { opacity: 0.8, transform: 'scale(1)' },
                '50%': { opacity: 1, transform: 'scale(1.05)' },
              },
            }}
          >
            <TomBoardLogo size={64} />
          </Box>
          <Box sx={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>TomBoard</Box>
          <Box
            sx={{
              width: 120,
              height: 2,
              borderRadius: 1,
              bgcolor: 'rgba(124, 92, 252, 0.3)',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                display: 'block',
                width: '40%',
                height: '100%',
                bgcolor: '#7C5CFC',
                borderRadius: 1,
                animation: 'loading-bar 1.2s ease-in-out infinite',
              },
              '@keyframes loading-bar': {
                '0%': { transform: 'translateX(-100%)' },
                '100%': { transform: 'translateX(350%)' },
              },
            }}
          />
        </Box>
      </ThemeProvider>
    );
  }

  if (overlayMode) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <OverlayView onExitOverlay={exitOverlay} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        <Titlebar
          onAddClick={() => setAddDialogOpen(true)}
          onLibraryClick={() => setLibraryOpen(true)}
          onOverlayClick={enterOverlay}
          onSettingsClick={() => setSettingsDialogOpen(true)}
          onVoiceChangerClick={() => setVoiceChangerOpen(true)}
        />
        <DndContext
          sensors={dndSensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <Toolbar dragOverCategory={dragOverCategory} isDragging={!!dragActiveId} />
          <SortableContext items={sounds.map(s => s.id)} strategy={rectSortingStrategy}>
          {viewMode === 'grid' ? (
            <SoundGrid
              onContextMenu={(sound, position) => setContextMenu({ sound, position })}
              onEdit={setEditSound}
              dragActiveId={dragActiveId}
            />
          ) : (
            <SoundList
              onContextMenu={(sound, position) => setContextMenu({ sound, position })}
              onEdit={setEditSound}
            />
          )}
          </SortableContext>
        </Box>
        <DragOverlay dropAnimation={null}>
          {dragActiveSound ? (
            <Box sx={{
              px: 1.5, py: 1, borderRadius: '10px', bgcolor: 'primary.main', color: 'primary.contrastText',
              fontWeight: 600, fontSize: '0.8rem', boxShadow: 4, whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {dragActiveSound.name}
            </Box>
          ) : null}
        </DragOverlay>
        </DndContext>
        <StatusBar />
      </Box>

      <AddSoundDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
      />

      <SoundLibraryDialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
      />

      <EditSoundDialog
        open={editSound !== null}
        onClose={() => setEditSound(null)}
        sound={editSound}
      />

      <SoundContextMenu
        anchorPosition={contextMenu?.position ?? null}
        sound={contextMenu?.sound ?? null}
        onClose={() => setContextMenu(null)}
        onEdit={setEditSound}
      />

      <VoiceChangerPanel
        open={voiceChangerOpen}
        onClose={() => setVoiceChangerOpen(false)}
      />

      <SettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
      />

      {showOnboarding && (
        <Onboarding
          onComplete={() => {
            localStorage.setItem('tomboard_onboarding_done', '1');
            setShowOnboarding(false);
          }}
        />
      )}
    </ThemeProvider>
  );
}

export default App;
