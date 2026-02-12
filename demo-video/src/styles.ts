// Shared design tokens matching AccountFlow's dark theme
export const colors = {
  bg: '#0A0A0F',
  bgSecondary: '#111118',
  surface: '#16161F',
  surfaceHover: '#1C1C28',
  border: '#232333',
  borderHover: '#2E2E42',
  textPrimary: '#F0F0F5',
  textSecondary: '#A0A0B8',
  textMuted: '#5C5C72',
  accent: '#6C5CE7',
  accentHover: '#7E6FF0',
  accentMuted: 'rgba(108, 92, 231, 0.12)',
  success: '#00E676',
  warning: '#FFAB00',
  error: '#FF5252',
  info: '#448AFF',
  // Elo colors
  eloIron: '#5C4033',
  eloBronze: '#CD7F32',
  eloSilver: '#A8B0B8',
  eloGold: '#FFD700',
  eloPlatinum: '#1ABC9C',
  eloEmerald: '#2ECC71',
  eloDiamond: '#9B59B6',
  eloMaster: '#E74C3C',
  eloGrandmaster: '#E67E22',
  eloChallenger: '#F1C40F',
};

export const fonts = {
  inter: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};

export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 30;

// Scene durations in frames (at 30fps)
export const SCENE_DURATIONS = {
  intro: 4 * VIDEO_FPS,       // 4s
  login: 3 * VIDEO_FPS,       // 3s
  dashboard: 5 * VIDEO_FPS,   // 5s
  profiles: 5 * VIDEO_FPS,    // 5s
  analytics: 4 * VIDEO_FPS,   // 4s
  pricing: 4 * VIDEO_FPS,     // 4s
  outro: 3 * VIDEO_FPS,       // 3s
};

export const TOTAL_DURATION = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);
