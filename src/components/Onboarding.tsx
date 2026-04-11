import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
  Grow,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  MusicNote,
  Mic,
  Category,
  Settings,
  LibraryMusic,
  RecordVoiceOver,
  DragIndicator,
  Keyboard,
  ArrowForward,
  ArrowBack,
  Close,
  CheckCircle,
  RocketLaunch,
  VolumeUp,
  CloudDownload,
  Tune,
} from '@mui/icons-material';
import TomBoardLogo from './TomBoardLogo';

interface OnboardingProps {
  onComplete: () => void;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  features: { icon: React.ReactNode; text: string }[];
  color: string;
  gradient: string;
}

const STEPS: Step[] = [
  {
    icon: <RocketLaunch sx={{ fontSize: 36 }} />,
    title: 'Bienvenue sur TomBoard',
    subtitle: 'Le soundboard ultime',
    description:
      'TomBoard est votre compagnon audio pour le streaming, le gaming et bien plus encore. Découvrons ensemble comment l\'utiliser !',
    features: [
      { icon: <MusicNote sx={{ fontSize: 16 }} />, text: 'Sons instantanés en un clic' },
      { icon: <Mic sx={{ fontSize: 16 }} />, text: 'Changeur de voix en temps réel' },
      { icon: <RecordVoiceOver sx={{ fontSize: 16 }} />, text: 'Synthèse vocale intégrée' },
    ],
    color: '#7C5CFC',
    gradient: 'linear-gradient(135deg, #7C5CFC 0%, #B347EA 100%)',
  },
  {
    icon: <VolumeUp sx={{ fontSize: 36 }} />,
    title: 'Ajouter des sons',
    subtitle: 'Trois façons d\'ajouter',
    description:
      'Cliquez sur le bouton  +  dans la barre supérieure pour ouvrir la fenêtre d\'ajout. Vous pouvez :',
    features: [
      { icon: <MusicNote sx={{ fontSize: 16 }} />, text: 'Importer un fichier audio ou vidéo (l\'audio sera extrait)' },
      { icon: <Mic sx={{ fontSize: 16 }} />, text: 'Enregistrer directement depuis votre micro' },
      { icon: <RecordVoiceOver sx={{ fontSize: 16 }} />, text: 'Générer un son par synthèse vocale (TTS)' },
    ],
    color: '#00D4AA',
    gradient: 'linear-gradient(135deg, #00D4AA 0%, #00B4D8 100%)',
  },
  {
    icon: <CloudDownload sx={{ fontSize: 36 }} />,
    title: 'Bibliothèque en ligne',
    subtitle: 'Des milliers de sons',
    description:
      'Cliquez sur l\'icône de bibliothèque 📚 pour rechercher et télécharger des sons depuis Myinstants. Prévisualisez-les avant de les ajouter.',
    features: [
      { icon: <LibraryMusic sx={{ fontSize: 16 }} />, text: 'Recherche par mots-clés avec catégories' },
      { icon: <VolumeUp sx={{ fontSize: 16 }} />, text: 'Prévisualisation avant téléchargement' },
      { icon: <CloudDownload sx={{ fontSize: 16 }} />, text: 'Ajout direct à votre soundboard' },
    ],
    color: '#FF6B6B',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
  },
  {
    icon: <Category sx={{ fontSize: 36 }} />,
    title: 'Catégories & Organisation',
    subtitle: 'Glisser-déposer',
    description:
      'Organisez vos sons par catégories avec des icônes et couleurs. Glissez-déposez un son sur une catégorie dans la barre pour le déplacer.',
    features: [
      { icon: <DragIndicator sx={{ fontSize: 16 }} />, text: 'Drag & Drop des sons sur les catégories' },
      { icon: <Category sx={{ fontSize: 16 }} />, text: 'Créez des catégories personnalisées (Paramètres > Catégories)' },
      { icon: <Keyboard sx={{ fontSize: 16 }} />, text: 'Assignez des raccourcis clavier à chaque son' },
    ],
    color: '#FFB800',
    gradient: 'linear-gradient(135deg, #FFB800 0%, #FF6B00 100%)',
  },
  {
    icon: <Tune sx={{ fontSize: 36 }} />,
    title: 'Changeur de voix & Audio',
    subtitle: 'Effets en temps réel',
    description:
      'Cliquez sur l\'icône micro 🎤 dans la barre supérieure pour ouvrir le changeur de voix. Configurez une sortie secondaire (VB-Cable) pour envoyer l\'audio dans Discord ou Teams.',
    features: [
      { icon: <Mic sx={{ fontSize: 16 }} />, text: 'Presets de voix : Robot, Chipmunk, Radio, Dark…' },
      { icon: <VolumeUp sx={{ fontSize: 16 }} />, text: 'Double sortie : haut-parleurs + micro virtuel' },
      { icon: <RecordVoiceOver sx={{ fontSize: 16 }} />, text: 'Suppression de bruit IA intégrée' },
    ],
    color: '#E040FB',
    gradient: 'linear-gradient(135deg, #E040FB 0%, #7C5CFC 100%)',
  },
  {
    icon: <Settings sx={{ fontSize: 36 }} />,
    title: 'Paramètres & Profils',
    subtitle: 'Personnalisez tout',
    description:
      'Accédez aux paramètres via l\'icône ⚙️. Créez plusieurs profils pour différentes situations et basculez instantanément.',
    features: [
      { icon: <Settings sx={{ fontSize: 16 }} />, text: 'Audio, Communication, Catégories, Profils, Sauvegarde' },
      { icon: <Category sx={{ fontSize: 16 }} />, text: 'Profils multiples avec switch rapide depuis la barre' },
      { icon: <CloudDownload sx={{ fontSize: 16 }} />, text: 'Import/Export pour sauvegarder vos données' },
    ],
    color: '#00B0FF',
    gradient: 'linear-gradient(135deg, #00B0FF 0%, #0091EA 100%)',
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(true);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isLast = currentStep === STEPS.length - 1;

  useEffect(() => {
    setAnimating(false);
    const t = setTimeout(() => setAnimating(true), 50);
    return () => clearTimeout(t);
  }, [currentStep]);

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(s => s + 1);
    }
  }, [isLast, onComplete]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onComplete]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        bgcolor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background decorative blobs */}
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: step.gradient,
          opacity: 0.06,
          filter: 'blur(80px)',
          top: '10%',
          left: '10%',
          transition: 'all 0.6s ease',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: step.gradient,
          opacity: 0.04,
          filter: 'blur(60px)',
          bottom: '15%',
          right: '15%',
          transition: 'all 0.6s ease',
        }}
      />

      {/* Skip button */}
      <IconButton
        onClick={onComplete}
        sx={{
          position: 'absolute',
          top: 56,
          right: 16,
          color: 'rgba(255,255,255,0.5)',
          '&:hover': { color: 'rgba(255,255,255,0.8)' },
        }}
      >
        <Close />
      </IconButton>

      {/* Progress bar */}
      <Box sx={{ position: 'absolute', top: 46, left: 0, right: 0, px: 0 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3,
            bgcolor: 'rgba(255,255,255,0.06)',
            '& .MuiLinearProgress-bar': {
              background: step.gradient,
              transition: 'transform 0.4s ease, background 0.4s ease',
            },
          }}
        />
      </Box>

      {/* Main content card */}
      <Fade in={animating} timeout={400}>
        <Box
          sx={{
            maxWidth: 520,
            width: '90%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {/* Step indicator */}
          <Box sx={{ display: 'flex', gap: 0.75, mb: -1 }}>
            {STEPS.map((_, i) => (
              <Box
                key={i}
                onClick={() => setCurrentStep(i)}
                sx={{
                  width: i === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: i === currentStep ? step.color : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: i === currentStep ? step.color : 'rgba(255,255,255,0.3)',
                  },
                }}
              />
            ))}
          </Box>

          {/* Logo + Icon */}
          <Grow in={animating} timeout={500}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '22px',
                background: step.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 8px 32px ${step.color}40`,
                transition: 'all 0.4s ease',
              }}
            >
              {currentStep === 0 ? <TomBoardLogo size={48} /> : step.icon}
            </Box>
          </Grow>

          {/* Title */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: 'white',
                fontSize: '1.6rem',
                letterSpacing: '-0.02em',
                mb: 0.5,
              }}
            >
              {step.title}
            </Typography>
            <Chip
              label={step.subtitle}
              size="small"
              sx={{
                background: `${step.color}20`,
                color: step.color,
                fontWeight: 600,
                fontSize: '0.72rem',
                height: 24,
                border: `1px solid ${step.color}30`,
              }}
            />
          </Box>

          {/* Description */}
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              maxWidth: 420,
            }}
          >
            {step.description}
          </Typography>

          {/* Feature list */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
              width: '100%',
              maxWidth: 400,
            }}
          >
            {step.features.map((f, i) => (
              <Grow key={i} in={animating} timeout={600 + i * 150}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    borderRadius: '12px',
                    bgcolor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.07)',
                      borderColor: `${step.color}30`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: `${step.color}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: step.color,
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                    }}
                  >
                    {f.text}
                  </Typography>
                </Box>
              </Grow>
            ))}
          </Box>

          {/* Navigation buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, mt: 1, width: '100%', maxWidth: 400 }}>
            {currentStep > 0 && (
              <Button
                onClick={prev}
                variant="outlined"
                startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  py: 1,
                  px: 2.5,
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.3)',
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                Retour
              </Button>
            )}
            <Button
              onClick={next}
              variant="contained"
              endIcon={
                isLast ? (
                  <CheckCircle sx={{ fontSize: 18 }} />
                ) : (
                  <ArrowForward sx={{ fontSize: 16 }} />
                )
              }
              sx={{
                flex: 1,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                py: 1.2,
                background: step.gradient,
                boxShadow: `0 4px 16px ${step.color}30`,
                '&:hover': {
                  boxShadow: `0 6px 24px ${step.color}50`,
                },
              }}
            >
              {isLast ? 'Commencer !' : 'Suivant'}
            </Button>
          </Box>

          {/* Keyboard hint */}
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '0.68rem',
              textAlign: 'center',
            }}
          >
            ← → pour naviguer · Entrée pour continuer · Échap pour passer
          </Typography>
        </Box>
      </Fade>
    </Box>
  );
}
