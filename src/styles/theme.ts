import { createTheme, ThemeOptions } from '@mui/material/styles';

const getTheme = (mode: 'dark' | 'light', seedColor: string = '#7C5CFC') => {
  const isDark = mode === 'dark';

  // Premium color palette
  const colors = {
    dark: {
      bg: '#0B0E14',
      bgSubtle: '#0F1319',
      surface: '#141A24',
      surfaceHover: '#1A2233',
      surfaceBright: '#1E2738',
      border: 'rgba(255, 255, 255, 0.06)',
      borderSubtle: 'rgba(255, 255, 255, 0.03)',
      text: '#E8ECF4',
      textSecondary: '#7B8494',
      textMuted: '#4A5568',
    },
    light: {
      bg: '#F8F9FC',
      bgSubtle: '#F0F2F7',
      surface: '#FFFFFF',
      surfaceHover: '#F5F6FA',
      surfaceBright: '#ECEEF5',
      border: 'rgba(0, 0, 0, 0.08)',
      borderSubtle: 'rgba(0, 0, 0, 0.04)',
      text: '#0F1419',
      textSecondary: '#5A6577',
      textMuted: '#9AA5B4',
    },
  };
  const c = isDark ? colors.dark : colors.light;

  const theme: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: seedColor,
        light: isDark ? '#A78BFA' : '#7C5CFC',
        dark: isDark ? '#5B3FD4' : '#4C2FA0',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#00D4AA',
        light: '#33DDBB',
        dark: '#00A886',
      },
      error: {
        main: '#FF6B6B',
        light: '#FF8E8E',
        dark: '#E04848',
      },
      warning: {
        main: '#FFB347',
      },
      success: {
        main: '#00D4AA',
        light: '#33DDBB',
        dark: '#00A886',
      },
      background: {
        default: c.bg,
        paper: c.surface,
      },
      text: {
        primary: c.text,
        secondary: c.textSecondary,
      },
      divider: c.border,
      action: {
        hover: isDark ? 'rgba(124, 92, 252, 0.08)' : 'rgba(124, 92, 252, 0.06)',
        selected: isDark ? 'rgba(124, 92, 252, 0.14)' : 'rgba(124, 92, 252, 0.10)',
        disabled: c.textMuted,
        disabledBackground: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2 },
      h5: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 },
      h6: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 },
      subtitle1: { fontWeight: 500, letterSpacing: '-0.005em' },
      subtitle2: { fontWeight: 600, letterSpacing: '0.01em', fontSize: '0.8rem' },
      body1: { letterSpacing: '-0.005em' },
      body2: { letterSpacing: '0' },
      caption: { letterSpacing: '0.02em' },
      overline: { fontWeight: 700, letterSpacing: '0.12em', fontSize: '0.6rem' },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124, 92, 252, 0.08) 0%, transparent 70%)'
              : 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundImage: 'none',
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              borderColor: isDark ? 'rgba(124, 92, 252, 0.3)' : 'rgba(124, 92, 252, 0.2)',
              boxShadow: isDark
                ? '0 4px 24px rgba(124, 92, 252, 0.12), 0 0 0 1px rgba(124, 92, 252, 0.1)'
                : '0 4px 24px rgba(0, 0, 0, 0.08)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 20px',
            fontWeight: 600,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: `0 4px 16px ${isDark ? 'rgba(124, 92, 252, 0.3)' : 'rgba(124, 92, 252, 0.2)'}`,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'all 0.15s ease',
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: `0 4px 20px ${isDark ? 'rgba(124, 92, 252, 0.35)' : 'rgba(124, 92, 252, 0.25)'}`,
            '&:hover': {
              boxShadow: `0 6px 28px ${isDark ? 'rgba(124, 92, 252, 0.5)' : 'rgba(124, 92, 252, 0.35)'}`,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            backgroundImage: 'none',
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            boxShadow: isDark
              ? '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 24px 80px rgba(0, 0, 0, 0.15)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            backgroundColor: isDark ? '#1E2738' : '#1C1B1F',
            color: '#E8ECF4',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
          },
          arrow: {
            color: isDark ? '#1E2738' : '#1C1B1F',
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            height: 4,
            '& .MuiSlider-thumb': {
              width: 14,
              height: 14,
              boxShadow: `0 0 0 4px ${isDark ? 'rgba(124, 92, 252, 0.15)' : 'rgba(124, 92, 252, 0.1)'}`,
              '&:hover': {
                boxShadow: `0 0 0 6px ${isDark ? 'rgba(124, 92, 252, 0.25)' : 'rgba(124, 92, 252, 0.15)'}`,
              },
            },
            '& .MuiSlider-track': {
              border: 'none',
            },
            '& .MuiSlider-rail': {
              opacity: isDark ? 0.15 : 0.25,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: c.surface,
            borderLeft: `1px solid ${c.border}`,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            backgroundImage: 'none',
            backgroundColor: isDark ? c.surfaceBright : c.surface,
            border: `1px solid ${c.border}`,
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.5)'
              : '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 6px',
            fontSize: '0.85rem',
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(124, 92, 252, 0.15)' : 'rgba(124, 92, 252, 0.08)',
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'all 0.15s ease',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: c.borderSubtle,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: '0.85rem',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            padding: 7,
          },
          switchBase: {
            '&.Mui-checked': {
              '& + .MuiSwitch-track': {
                opacity: 1,
              },
            },
          },
          track: {
            borderRadius: 11,
            opacity: isDark ? 0.2 : 0.3,
          },
        },
      },
    },
  };

  return createTheme(theme);
};

export default getTheme;
