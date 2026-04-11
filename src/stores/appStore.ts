import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { AppData, AppSettings, Sound, ViewMode } from '../types';

export type SoundFilter = 'all' | 'favorites' | 'looping' | 'recent' | 'most-played';
export type SoundSort = 'order' | 'name' | 'recent' | 'most-played';

const MAX_HISTORY = 30;

interface AppState {
  // Data
  data: AppData | null;
  loading: boolean;
  activeCategory: string;
  viewMode: ViewMode;
  searchQuery: string;
  playingIds: string[];
  activeFilter: SoundFilter;
  activeSort: SoundSort;

  // History (undo/redo)
  history: AppData[];
  future: AppData[];
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  loadData: () => Promise<void>;
  setActiveCategory: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: SoundFilter) => void;
  setActiveSort: (sort: SoundSort) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  // Audio actions
  playSound: (sound: Sound) => Promise<void>;
  stopSound: (id: string) => Promise<void>;
  stopAll: () => Promise<void>;
  setVolume: (id: string, volume: number) => Promise<void>;
  setMasterVolume: (volume: number) => Promise<void>;
  refreshPlaying: () => Promise<void>;

  // Sound CRUD
  addSound: (name: string, sourcePath: string, category: string) => Promise<Sound>;
  updateSound: (sound: Sound) => Promise<void>;
  deleteSound: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  reorderSounds: (soundIds: string[]) => Promise<void>;

  // Profile actions
  addProfile: (name: string) => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  renameProfile: (id: string, name: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  duplicateProfile: (id: string, name: string) => Promise<void>;

  // Category actions
  addCategory: (name: string, icon: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (categoryIds: string[]) => Promise<void>;

  // Settings
  saveSettings: (settings: AppSettings) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  data: null,
  loading: true,
  activeCategory: 'all',
  viewMode: 'grid',
  searchQuery: '',
  playingIds: [],
  activeFilter: 'all' as SoundFilter,
  activeSort: 'order' as SoundSort,
  history: [],
  future: [],
  canUndo: false,
  canRedo: false,

  loadData: async () => {
    try {
      const data = await invoke<AppData>('get_data');
      set({ data, loading: false });
    } catch (e) {
      console.error('Failed to load data:', e);
      set({ loading: false });
    }
  },

  setActiveCategory: (id) => set({ activeCategory: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setActiveSort: (sort) => set({ activeSort: sort }),

  undo: async () => {
    const { history, data, future } = get();
    if (history.length === 0 || !data) return;
    const prev = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const newFuture = [data, ...future].slice(0, MAX_HISTORY);
    // Restore backend to the previous snapshot
    await invoke('set_data', { data: prev }).catch(console.error);
    set({ data: prev, history: newHistory, future: newFuture, canUndo: newHistory.length > 0, canRedo: true });
  },

  redo: async () => {
    const { future, data, history } = get();
    if (future.length === 0 || !data) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const newHistory = [...history, data].slice(-MAX_HISTORY);
    await invoke('set_data', { data: next }).catch(console.error);
    set({ data: next, history: newHistory, future: newFuture, canUndo: true, canRedo: newFuture.length > 0 });
  },

  playSound: async (sound) => {
    try {
      const { playingIds } = get();
      if (playingIds.includes(sound.id)) {
        await invoke('stop_sound', { id: sound.id });
        set({ playingIds: playingIds.filter(id => id !== sound.id) });
        return;
      }
      await invoke('play_sound', {
        id: sound.id,
        filePath: sound.filePath,
        volume: sound.volume,
        looping: sound.isLooping,
        speed: sound.speed ?? 1.0,
        fadeIn: sound.fadeIn ?? 0,
        fadeOut: sound.fadeOut ?? 0,
      });
      set({ playingIds: [...playingIds, sound.id] });

      // Update Discord Rich Presence
      const profileName = get().data?.profiles.find(p => p.id === get().data?.settings.activeProfileId)?.name ?? 'TomBoard';
      invoke('update_discord_presence', { detail: `🔊 ${sound.name}`, state: profileName }).catch(() => {});

      // Increment play count
      const data = get().data;
      if (data) {
        const profile = data.profiles.find(p => p.id === data.settings.activeProfileId);
        if (profile) {
          const s = profile.sounds.find(s => s.id === sound.id);
          if (s) {
            const updated = { ...s, playCount: s.playCount + 1 };
            invoke('update_sound', { sound: updated }).catch(console.error);
          }
        }
      }
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  },

  stopSound: async (id) => {
    try {
      await invoke('stop_sound', { id });
      const { playingIds } = get();
      set({ playingIds: playingIds.filter(pid => pid !== id) });
    } catch (e) {
      console.error('Failed to stop sound:', e);
    }
  },

  stopAll: async () => {
    try {
      await invoke('stop_all');
      set({ playingIds: [] });
      invoke('update_discord_presence', { detail: 'TomBoard ouvert', state: '' }).catch(() => {});
    } catch (e) {
      console.error('Failed to stop all:', e);
    }
  },

  setVolume: async (id, volume) => {
    try {
      await invoke('set_volume', { id, volume });
    } catch (e) {
      console.error('Failed to set volume:', e);
    }
  },

  setMasterVolume: async (volume) => {
    try {
      await invoke('set_master_volume', { volume });
      const { data } = get();
      if (data) {
        const settings = { ...data.settings, masterVolume: volume };
        set({ data: { ...data, settings } });
      }
    } catch (e) {
      console.error('Failed to set master volume:', e);
    }
  },

  refreshPlaying: async () => {
    try {
      const ids = await invoke<string[]>('get_playing');
      set({ playingIds: ids });
    } catch (e) {
      console.error('Failed to refresh playing:', e);
    }
  },

  addSound: async (name, sourcePath, category) => {
    const { data, history } = get();
    if (data) set({ history: [...history, data].slice(-MAX_HISTORY), future: [], canUndo: true, canRedo: false });
    const sound = await invoke<Sound>('add_sound', { name, sourcePath, category });
    await get().loadData();
    return sound;
  },

  updateSound: async (sound) => {
    const { data, history } = get();
    if (data) set({ history: [...history, data].slice(-MAX_HISTORY), future: [], canUndo: true, canRedo: false });
    await invoke('update_sound', { sound });
    await get().loadData();
  },

  deleteSound: async (id) => {
    const { data, history } = get();
    if (data) set({ history: [...history, data].slice(-MAX_HISTORY), future: [], canUndo: true, canRedo: false });
    await invoke('delete_sound', { id });
    await get().loadData();
  },

  toggleFavorite: async (id) => {
    const { data } = get();
    if (!data) return;
    const profile = data.profiles.find(p => p.id === data.settings.activeProfileId);
    if (!profile) return;
    const sound = profile.sounds.find(s => s.id === id);
    if (!sound) return;
    const updated = { ...sound, isFavorite: !sound.isFavorite };
    await invoke('update_sound', { sound: updated });
    await get().loadData();
  },

  reorderSounds: async (soundIds) => {
    const { data } = get();
    if (!data) return;
    const profileIdx = data.profiles.findIndex(p => p.id === data.settings.activeProfileId);
    if (profileIdx === -1) return;
    const profile = data.profiles[profileIdx];
    // Reorder sounds based on new order and update their order field
    const reordered = soundIds.map((id, index) => {
      const sound = profile.sounds.find(s => s.id === id);
      return sound ? { ...sound, order: index } : null;
    }).filter(Boolean) as Sound[];
    // Keep sounds not in the reorder list (different category)
    const otherSounds = profile.sounds.filter(s => !soundIds.includes(s.id));
    const updatedProfile = { ...profile, sounds: [...reordered, ...otherSounds] };
    const updatedProfiles = [...data.profiles];
    updatedProfiles[profileIdx] = updatedProfile;
    // Optimistic update
    set({ data: { ...data, profiles: updatedProfiles } });
    // Persist each updated sound
    for (const sound of reordered) {
      await invoke('update_sound', { sound }).catch(console.error);
    }
  },

  addProfile: async (name) => {
    await invoke('add_profile', { name });
    await get().loadData();
  },

  switchProfile: async (id) => {
    await invoke('switch_profile', { profileId: id });
    await get().loadData();
  },

  renameProfile: async (id, name) => {
    await invoke('rename_profile', { profileId: id, name });
    await get().loadData();
  },

  deleteProfile: async (id) => {
    await invoke('delete_profile', { profileId: id });
    await get().loadData();
  },

  duplicateProfile: async (id, name) => {
    await invoke('duplicate_profile', { profileId: id, name });
    await get().loadData();
  },

  addCategory: async (name, icon, color) => {
    await invoke('add_category', { name, icon, color });
    await get().loadData();
  },

  deleteCategory: async (id) => {
    await invoke('delete_category', { categoryId: id });
    await get().loadData();
  },

  reorderCategories: async (categoryIds) => {
    await invoke('reorder_categories', { categoryIds });
    await get().loadData();
  },

  saveSettings: async (settings) => {
    await invoke('save_settings', { settings });
    const { data } = get();
    if (data) {
      set({ data: { ...data, settings } });
    }
  },

  toggleTheme: async () => {
    const { data } = get();
    if (!data) return;
    const newTheme = data.settings.theme === 'dark' ? 'light' : 'dark';
    const settings = { ...data.settings, theme: newTheme as 'dark' | 'light' };
    await invoke('save_settings', { settings });
    set({ data: { ...data, settings } });
  },
}));

// Helper hook to get filtered sounds with memoization
export function useFilteredSounds(): Sound[] {
  const data = useAppStore(s => s.data);
  const activeCategory = useAppStore(s => s.activeCategory);
  const searchQuery = useAppStore(s => s.searchQuery);
  const activeFilter = useAppStore(s => s.activeFilter);
  const activeSort = useAppStore(s => s.activeSort);

  if (!data) return EMPTY_SOUNDS;
  const profile = data.profiles.find(p => p.id === data.settings.activeProfileId);
  if (!profile) return EMPTY_SOUNDS;

  let sounds = [...profile.sounds];

  if (activeCategory !== 'all') {
    sounds = sounds.filter(s => s.category === activeCategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    sounds = sounds.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Apply filter
  switch (activeFilter) {
    case 'favorites':
      sounds = sounds.filter(s => s.isFavorite);
      break;
    case 'looping':
      sounds = sounds.filter(s => s.isLooping);
      break;
    case 'recent':
      sounds = [...sounds].sort((a, b) => Number(b.addedAt) - Number(a.addedAt)).slice(0, 20);
      break;
    case 'most-played':
      sounds = [...sounds].sort((a, b) => b.playCount - a.playCount).slice(0, 20);
      break;
  }

  // Apply sort
  switch (activeSort) {
    case 'name':
      sounds.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'recent':
      sounds.sort((a, b) => Number(b.addedAt) - Number(a.addedAt));
      break;
    case 'most-played':
      sounds.sort((a, b) => b.playCount - a.playCount);
      break;
    case 'order':
    default:
      sounds.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.order - b.order;
      });
      break;
  }

  return sounds;
}

const EMPTY_SOUNDS: Sound[] = [];
