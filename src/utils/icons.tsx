import { SvgIconProps } from '@mui/material';
import {
  VolumeUp,
  MusicNote,
  QueueMusic,
  Mic,
  Headphones,
  Piano,
  Album,
  Equalizer,
  GraphicEq,
  // Effects
  Notifications,
  Campaign,
  Flare,
  Whatshot,
  ElectricBolt,
  AutoAwesome,
  Celebration,
  Festival,
  TheaterComedy,
  // People
  Visibility,
  WavingHand,
  FrontHand,
  Dangerous,
  SentimentVerySatisfied,
  SentimentVeryDissatisfied,
  EmojiEmotions,
  SentimentSatisfiedAlt,
  Face,
  // Animals
  Pets,
  Air,
  // Objects
  RocketLaunch,
  EmojiEvents,
  SportsSoccer,
  SportsEsports,
  SportsKabaddi,
  Shield,
  Diamond,
  Paid,
  // Hearts
  Favorite,
  FavoriteBorder,
  HeartBroken,
  // Category icons
  Apps,
  FolderSpecial,
  Movie,
  Bolt,
  Forest,
  // Misc
  RecordVoiceOver,
  Star,
} from '@mui/icons-material';
import React from 'react';

// ── Category icon map (shared with Sidebar) ──

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<SvgIconProps>> = {
  apps: Apps,
  sports_esports: SportsEsports,
  emoji_emotions: EmojiEmotions,
  music_note: MusicNote,
  folder_special: FolderSpecial,
  mic: Mic,
  movie: Movie,
  announcement: Campaign,
  notifications: Notifications,
  build: Bolt,
  pets: Pets,
  nature: Forest,
  celebration: Celebration,
};

export function renderCategoryIcon(iconId: string, props?: SvgIconProps): React.ReactNode {
  const Icon = CATEGORY_ICON_MAP[iconId];
  return Icon ? <Icon {...props} /> : <FolderSpecial {...props} />;
}

// ── Category options for pickers ──

export const ICON_OPTIONS = [
  { id: 'apps', label: 'Tous', i18nKey: 'iconAll' },
  { id: 'sports_esports', label: 'Gaming', i18nKey: 'iconGaming' },
  { id: 'emoji_emotions', label: 'Fun', i18nKey: 'iconFun' },
  { id: 'music_note', label: 'Musique', i18nKey: 'iconMusic' },
  { id: 'mic', label: 'Voix', i18nKey: 'iconVoice' },
  { id: 'movie', label: 'Film', i18nKey: 'iconMovie' },
  { id: 'announcement', label: 'Annonce', i18nKey: 'iconAnnounce' },
  { id: 'notifications', label: 'Notif', i18nKey: 'iconNotif' },
  { id: 'build', label: 'SFX', i18nKey: 'iconSfx' },
  { id: 'pets', label: 'Animaux', i18nKey: 'iconAnimals' },
  { id: 'nature', label: 'Nature', i18nKey: 'iconNature' },
  { id: 'celebration', label: 'Fête', i18nKey: 'iconParty' },
];

// ── Sound icon system ──
// Icons stored by MUI icon name. Legacy emojis are rendered as text fallback.

export const SOUND_ICON_MAP: Record<string, React.ComponentType<SvgIconProps>> = {
  // Sound & Music
  volume_up: VolumeUp,
  music_note: MusicNote,
  queue_music: QueueMusic,
  mic: Mic,
  headphones: Headphones,
  piano: Piano,
  album: Album,
  equalizer: Equalizer,
  graphic_eq: GraphicEq,
  // Effects
  notifications: Notifications,
  campaign: Campaign,
  flare: Flare,
  whatshot: Whatshot,
  electric_bolt: ElectricBolt,
  auto_awesome: AutoAwesome,
  celebration: Celebration,
  festival: Festival,
  theater_comedy: TheaterComedy,
  // People
  visibility: Visibility,
  waving_hand: WavingHand,
  front_hand: FrontHand,
  skull: Dangerous,
  sentiment_very_satisfied: SentimentVerySatisfied,
  sentiment_very_dissatisfied: SentimentVeryDissatisfied,
  emoji_emotions: EmojiEmotions,
  sentiment_satisfied_alt: SentimentSatisfiedAlt,
  face: Face,
  // Animals
  pets: Pets,
  flutter: Air,
  // Objects
  rocket_launch: RocketLaunch,
  emoji_events: EmojiEvents,
  sports_soccer: SportsSoccer,
  sports_esports: SportsEsports,
  sports_kabaddi: SportsKabaddi,
  shield: Shield,
  diamond: Diamond,
  paid: Paid,
  // Hearts
  favorite: Favorite,
  favorite_border: FavoriteBorder,
  heart_broken: HeartBroken,
  // Misc
  movie: Movie,
  star: Star,
  record_voice_over: RecordVoiceOver,
  bolt: Bolt,
  forest: Forest,
};

export const SOUND_ICONS = [
  // Row 1: Sound & Music
  'volume_up', 'music_note', 'queue_music', 'mic', 'headphones',
  'piano', 'album', 'equalizer', 'graphic_eq',
  // Row 2: Effects
  'notifications', 'campaign', 'flare', 'whatshot', 'electric_bolt',
  'auto_awesome', 'celebration', 'festival', 'theater_comedy',
  // Row 3: People & Faces
  'visibility', 'waving_hand', 'front_hand', 'skull',
  'sentiment_very_satisfied', 'sentiment_very_dissatisfied',
  'emoji_emotions', 'sentiment_satisfied_alt', 'face',
  // Row 4: Animals & Objects
  'pets', 'flutter', 'rocket_launch', 'emoji_events',
  'sports_soccer', 'sports_esports', 'sports_kabaddi',
  'shield', 'diamond', 'paid',
  // Row 5: Hearts & Misc
  'favorite', 'favorite_border', 'heart_broken',
  'movie', 'star', 'record_voice_over', 'bolt', 'forest',
];

export function renderSoundIcon(icon: string, props?: SvgIconProps): React.ReactNode {
  const Icon = SOUND_ICON_MAP[icon];
  if (Icon) return <Icon {...props} />;
  // Legacy emoji fallback
  return <span style={{ fontSize: props?.sx ? undefined : 'inherit' }}>{icon}</span>;
}
