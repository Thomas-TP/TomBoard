import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box, Snackbar, Alert, Button } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import TomBoardLogo from './components/TomBoardLogo';
import Titlebar from './components/layout/Titlebar';
import Sidebar from './components/layout/Sidebar';
import Toolbar from './components/layout/Toolbar';
import StatusBar from './components/layout/StatusBar';
import SoundGrid from './components/sound/SoundGrid';
import SoundList from './components/sound/SoundList';
import ErrorBoundary from './components/ErrorBoundary';
import AddSoundDialog from './components/dialogs/AddSoundDialog';
import EditSoundDialog from './components/dialogs/EditSoundDialog';
import SettingsDialog from './components/dialogs/SettingsDialog';
import SoundLibraryDialog from './components/dialogs/SoundLibraryDialog';
import OverlayView from './components/layout/OverlayView';
import SoundContextMenu from './components/sound/SoundContextMenu';
import VoiceChangerPanel from './components/VoiceChangerPanel';
import Onboarding from './components/Onboarding';
import ChangelogDialog from './components/dialogs/ChangelogDialog';
import { useUpdater } from './hooks/useUpdater';
import getTheme from './styles/theme';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, useFilteredSounds } from './stores/appStore';
import { useHotkeyManager } from './hooks/useHotkeyManager';
import { useI18n } from './i18n/I18nProvider';
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
  const { t } = useI18n();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const { updateAvailable, updating, applyUpdate, dismiss } = useUpdater();

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('tomboard_onboarding_done');
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('tomboard_sidebar_collapsed') === '1';
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
  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // reserved for future category drop targets
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragActiveId(null);
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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('tomboard_sidebar_collapsed', next ? '1' : '');
      return next;
    });
  }, []);

  // In-app keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      if (e.key === 'Escape') {
        (target as HTMLInputElement).blur();
      }
      return;
    }

    // Ctrl+F → focus search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    // Ctrl+N → add sound
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      setAddDialogOpen(true);
    }
    // Ctrl+Shift+S → stop all
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      useAppStore.getState().stopAll();
    }
    // Escape → close panels/dialogs
    if (e.key === 'Escape') {
      if (voiceChangerOpen) setVoiceChangerOpen(false);
      else if (contextMenu) setContextMenu(null);
    }
    // Ctrl+1 → grid view, Ctrl+2 → list view
    if (e.ctrlKey && e.key === '1') { e.preventDefault(); useAppStore.getState().setViewMode('grid'); }
    if (e.ctrlKey && e.key === '2') { e.preventDefault(); useAppStore.getState().setViewMode('list'); }
    if (e.ctrlKey && e.key === '3') { e.preventDefault(); useAppStore.getState().setViewMode('compact'); }
    // Ctrl+B → toggle sidebar
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
    // Ctrl+Z → undo
    if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); useAppStore.getState().undo(); }
    // Ctrl+Y / Ctrl+Shift+Z → redo
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) { e.preventDefault(); useAppStore.getState().redo(); }
  }, [voiceChangerOpen, contextMenu, toggleSidebar]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const [dropHighlight, setDropHighlight] = useState(false);
  const dropEnterCount = React.useRef(0);

  const handleFileDragEnter = useCallback((e: React.DragEvent) => {
    if ([...e.dataTransfer.items].some(i => i.kind === 'file')) {
      e.preventDefault();
      dropEnterCount.current += 1;
      setDropHighlight(true);
    }
  }, []);

  const handleFileDragLeave = useCallback(() => {
    dropEnterCount.current -= 1;
    if (dropEnterCount.current <= 0) {
      dropEnterCount.current = 0;
      setDropHighlight(false);
    }
  }, []);

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    if ([...e.dataTransfer.items].some(i => i.kind === 'file')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDropHighlight(false);
    dropEnterCount.current = 0;
    const files = [...e.dataTransfer.files].filter(f =>
      /\.(mp3|wav|ogg|flac|aac|m4a|opus|webm)$/i.test(f.name)
    );
    if (files.length === 0) return;
    const addSound = useAppStore.getState().addSound;
    for (const file of files) {
      const name = file.name.replace(/\.[^.]+$/, '');
      try {
        // Read file as bytes and send to Rust for copying to app data dir
        const buffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        const destPath = await invoke<string>('import_audio_bytes', { fileName: file.name, bytes });
        await addSound(name, destPath, 'all');
      } catch (err) {
        console.error('Failed to add dropped file:', err);
      }
    }
  }, []);

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
        <a href="#main-content" className="skip-to-main">Aller au contenu</a>
        <Titlebar
          onAddClick={() => setAddDialogOpen(true)}
          onLibraryClick={() => setLibraryOpen(true)}
          onOverlayClick={enterOverlay}
          onSettingsClick={() => setSettingsDialogOpen(true)}
          onVoiceChangerClick={() => setVoiceChangerOpen(true)}
          onChangelogClick={() => setChangelogOpen(true)}
        />
        <DndContext
          sensors={dndSensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        <Box
          component="main"
          role="main"
          id="main-content"
          tabIndex={-1}
          onDragEnter={handleFileDragEnter}
          onDragLeave={handleFileDragLeave}
          onDragOver={handleFileDragOver}
          onDrop={handleFileDrop}
          sx={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            ...(dropHighlight && {
              outline: '3px dashed',
              outlineColor: 'primary.main',
              outlineOffset: '-4px',
            }),
          }}
        >
          {dropHighlight && (
            <Box sx={{
              position: 'absolute', inset: 0, zIndex: 20,
              bgcolor: 'rgba(103,80,164,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <Box sx={{
                border: '2px dashed', borderColor: 'primary.main', borderRadius: 4,
                px: 5, py: 4, textAlign: 'center', color: 'primary.main', fontWeight: 700, fontSize: '1.1rem',
              }}>
                {t('dropFilesHere')}
              </Box>
            </Box>
          )}
          <Toolbar />
          <SortableContext items={sounds.map(s => s.id)} strategy={rectSortingStrategy}>
          <AnimatePresence mode="wait">
          {viewMode === 'grid' || viewMode === 'compact' ? (
            <motion.div key="grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <ErrorBoundary fallbackTitle={t('soundsDisplayError')}>
            <SoundGrid
              onContextMenu={(sound, position) => setContextMenu({ sound, position })}
              onEdit={setEditSound}
              dragActiveId={dragActiveId}
              compact={viewMode === 'compact'}
            />
            </ErrorBoundary>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <ErrorBoundary fallbackTitle={t('soundsDisplayError')}>
            <SoundList
              onContextMenu={(sound, position) => setContextMenu({ sound, position })}
              onEdit={setEditSound}
            />
            </ErrorBoundary>
            </motion.div>
          )}
          </AnimatePresence>
          </SortableContext>
        </Box>
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

      <ErrorBoundary fallbackTitle={t('voiceChangerError')}>
      <VoiceChangerPanel
        open={voiceChangerOpen}
        onClose={() => setVoiceChangerOpen(false)}
      />
      </ErrorBoundary>

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

      <ChangelogDialog
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />

      <Snackbar
        open={!!updateAvailable}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={dismiss}
          action={
            <>
              <Button
                color="inherit"
                size="small"
                onClick={() => { setChangelogOpen(true); }}
                sx={{ mr: 1 }}
              >
                {t('viewNotes')}
              </Button>
              <Button
                color="inherit"
                size="small"
                disabled={updating}
                onClick={applyUpdate}
              >
                {updating ? t('installing') : t('install')}
              </Button>
            </>
          }
        >
          {t('updateAvailable')} v{updateAvailable?.version}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
