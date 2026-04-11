import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
} from '@mui/material';
import {
  Add,
  Mic,
  LibraryMusic,
  Settings,
  Category,
  VolumeUp,
  ArrowForward,
  ArrowBack,
  Close,
  CheckCircle,
  RocketLaunch,
} from '@mui/icons-material';
import TomBoardLogo from './TomBoardLogo';

interface OnboardingProps {
  onComplete: () => void;
}

type TooltipPosition = 'bottom' | 'top' | 'left' | 'right';

interface TourStep {
  /** data-tour attribute value of the target element */
  target: string | null;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  gradient: string;
  position: TooltipPosition;
}

const STEPS: TourStep[] = [
  {
    target: null,
    icon: <RocketLaunch sx={{ fontSize: 28 }} />,
    title: 'Bienvenue sur TomBoard !',
    description: 'Votre soundboard ultime pour le streaming, le gaming et la communication. Suivez ce guide rapide pour découvrir toutes les fonctionnalités.',
    color: '#7C5CFC',
    gradient: 'linear-gradient(135deg, #7C5CFC 0%, #B347EA 100%)',
    position: 'bottom',
  },
  {
    target: 'add-sound',
    icon: <Add sx={{ fontSize: 28 }} />,
    title: 'Ajouter un son',
    description: 'Cliquez ici pour importer un fichier audio, enregistrer depuis votre micro, ou générer un son par synthèse vocale.',
    color: '#7C5CFC',
    gradient: 'linear-gradient(135deg, #7C5CFC 0%, #B347EA 100%)',
    position: 'bottom',
  },
  {
    target: 'library',
    icon: <LibraryMusic sx={{ fontSize: 28 }} />,
    title: 'Bibliothèque en ligne',
    description: 'Recherchez et téléchargez des milliers de sons depuis Myinstants. Prévisualisez-les avant de les ajouter.',
    color: '#FF6B6B',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    position: 'bottom',
  },
  {
    target: 'voice-changer',
    icon: <Mic sx={{ fontSize: 28 }} />,
    title: 'Changeur de voix',
    description: 'Activez des effets vocaux en temps réel : Robot, Chipmunk, Radio, Dark… Envoyez votre voix modifiée dans Discord via VB-Cable.',
    color: '#E040FB',
    gradient: 'linear-gradient(135deg, #E040FB 0%, #7C5CFC 100%)',
    position: 'bottom',
  },
  {
    target: 'categories',
    icon: <Category sx={{ fontSize: 28 }} />,
    title: 'Catégories & Organisation',
    description: 'Organisez vos sons par catégories. Glissez-déposez un son directement sur une catégorie pour le déplacer.',
    color: '#FFB800',
    gradient: 'linear-gradient(135deg, #FFB800 0%, #FF6B00 100%)',
    position: 'bottom',
  },
  {
    target: 'settings',
    icon: <Settings sx={{ fontSize: 28 }} />,
    title: 'Paramètres',
    description: 'Configurez l\'audio, les profils, les raccourcis, le thème et bien plus. Créez plusieurs profils pour différentes situations.',
    color: '#00B0FF',
    gradient: 'linear-gradient(135deg, #00B0FF 0%, #0091EA 100%)',
    position: 'bottom',
  },
  {
    target: 'volume',
    icon: <VolumeUp sx={{ fontSize: 28 }} />,
    title: 'Volume principal',
    description: 'Contrôlez le volume global ici. La barre de statut affiche aussi les sons en cours de lecture avec un visualiseur en temps réel.',
    color: '#00D4AA',
    gradient: 'linear-gradient(135deg, #00D4AA 0%, #00B4D8 100%)',
    position: 'top',
  },
];

function getTooltipStyle(
  rect: DOMRect | null,
  position: TooltipPosition,
): React.CSSProperties {
  if (!rect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const gap = 16;
  const base: React.CSSProperties = { position: 'fixed' };

  switch (position) {
    case 'bottom':
      return { ...base, top: rect.bottom + gap, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' };
    case 'top':
      return { ...base, bottom: window.innerHeight - rect.top + gap, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' };
    case 'left':
      return { ...base, top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + gap, transform: 'translateY(-50%)' };
    case 'right':
      return { ...base, top: rect.top + rect.height / 2, left: rect.right + gap, transform: 'translateY(-50%)' };
  }
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isWelcome = step.target === null;

  // Find and measure target element
  useEffect(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const measure = () => setTargetRect(el.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [currentStep, step.target]);

  // Fade transition between steps
  const goTo = useCallback((idx: number) => {
    setVisible(false);
    setTimeout(() => {
      setCurrentStep(idx);
      setVisible(true);
    }, 200);
  }, []);

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      goTo(currentStep + 1);
    }
  }, [isLast, onComplete, currentStep, goTo]);

  const prev = useCallback(() => {
    if (currentStep > 0) goTo(currentStep - 1);
  }, [currentStep, goTo]);

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

  // Spotlight cutout dimensions
  const pad = 8;
  const spotX = targetRect ? targetRect.left - pad : 0;
  const spotY = targetRect ? targetRect.top - pad : 0;
  const spotW = targetRect ? targetRect.width + pad * 2 : 0;
  const spotH = targetRect ? targetRect.height + pad * 2 : 0;

  return (
    <Box ref={overlayRef} sx={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      {/* SVG overlay with spotlight cutout */}
      <svg
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={spotX}
                y={spotY}
                width={spotW}
                height={spotH}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.72)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Highlight ring around target */}
      {targetRect && (
        <Box
          sx={{
            position: 'fixed',
            left: spotX,
            top: spotY,
            width: spotW,
            height: spotH,
            borderRadius: '12px',
            border: `2px solid ${step.color}`,
            boxShadow: `0 0 0 4px ${step.color}25, 0 0 24px ${step.color}30`,
            pointerEvents: 'none',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'tour-pulse 2s ease-in-out infinite',
            '@keyframes tour-pulse': {
              '0%, 100%': { boxShadow: `0 0 0 4px ${step.color}25, 0 0 24px ${step.color}30` },
              '50%': { boxShadow: `0 0 0 6px ${step.color}35, 0 0 32px ${step.color}45` },
            },
          }}
        />
      )}

      {/* Skip button */}
      <IconButton
        onClick={onComplete}
        sx={{
          position: 'fixed',
          top: 56,
          right: 16,
          zIndex: 10001,
          color: 'rgba(255,255,255,0.5)',
          '&:hover': { color: 'rgba(255,255,255,0.85)' },
        }}
      >
        <Close />
      </IconButton>

      {/* Tooltip card */}
      <Fade in={visible} timeout={250}>
        <Box
          sx={{
            ...getTooltipStyle(targetRect, step.position),
            zIndex: 10000,
            maxWidth: 360,
            minWidth: 280,
            bgcolor: '#1A1D24',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: `0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
            overflow: 'hidden',
          }}
        >
          {/* Color accent bar */}
          <Box sx={{ height: 3, background: step.gradient }} />

          <Box sx={{ p: 2.5 }}>
            {/* Icon + Title row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: step.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: `0 4px 16px ${step.color}30`,
                }}
              >
                {isWelcome ? <TomBoardLogo size={28} /> : step.icon}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '0.95rem', lineHeight: 1.2 }}>
                  {step.title}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 500 }}>
                  Étape {currentStep + 1} / {STEPS.length}
                </Typography>
              </Box>
            </Box>

            {/* Description */}
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', lineHeight: 1.55, mb: 2 }}>
              {step.description}
            </Typography>

            {/* Step dots */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
              {STEPS.map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: i === currentStep ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: i === currentStep ? step.color : 'rgba(255,255,255,0.12)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: i === currentStep ? step.color : 'rgba(255,255,255,0.25)' },
                  }}
                  onClick={() => goTo(i)}
                />
              ))}
            </Box>

            {/* Navigation buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {currentStep > 0 && (
                <Button
                  onClick={prev}
                  size="small"
                  startIcon={<ArrowBack sx={{ fontSize: 14 }} />}
                  sx={{
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    px: 1.5,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' },
                  }}
                >
                  Retour
                </Button>
              )}
              <Button
                onClick={next}
                size="small"
                variant="contained"
                endIcon={isLast ? <CheckCircle sx={{ fontSize: 16 }} /> : <ArrowForward sx={{ fontSize: 14 }} />}
                sx={{
                  flex: 1,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  background: step.gradient,
                  boxShadow: `0 4px 12px ${step.color}30`,
                  '&:hover': { boxShadow: `0 6px 20px ${step.color}50` },
                }}
              >
                {isLast ? 'C\'est parti !' : 'Suivant'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
}
