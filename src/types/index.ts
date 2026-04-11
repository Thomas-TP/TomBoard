export interface Sound {
  id: string;
  name: string;
  filePath: string;
  category: string;
  tags: string[];
  icon: string;
  color: string;
  volume: number;
  speed: number;
  hotkey: string | null;
  isFavorite: boolean;
  isLooping: boolean;
  trimStart: number;
  trimEnd: number | null;
  fadeIn: number;   // seconds
  fadeOut: number;  // seconds
  addedAt: string;
  playCount: number;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
}

export interface Profile {
  id: string;
  name: string;
  sounds: Sound[];
  categories: Category[];
}

export interface AppSettings {
  theme: 'dark' | 'light';
  customSeedColor: string;
  masterVolume: number;
  activeProfileId: string;
  outputDevice: string;
  secondaryDevice: string;
  dualOutput: boolean;
  minimizeToTray: boolean;
  launchMinimized: boolean;
  soundsFolder: string;
  freesoundApiKey: string;
  micPassthroughDevice: string;
  silentMode: boolean;
  noiseSuppression: boolean;
  piperPath: string;
  piperModel: string;
  discordRpc: boolean;
  language: 'fr' | 'en';
}

export interface AppData {
  settings: AppSettings;
  profiles: Profile[];
}

export type ViewMode = 'grid' | 'list' | 'compact';
