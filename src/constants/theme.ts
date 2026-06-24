export const theme = {
  colors: {
    background: '#F4F4F5',
    surface: '#FFFFFF',
    text: '#18181B',
    textMuted: '#71717A',
    border: '#E4E4E7',
    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
  },
  tabs: {
    Schedule: { emoji: '📅', label: '일정', active: '#6366F1', activeBg: '#EEF2FF' },
    Meal: { emoji: '🍽️', label: '식사', active: '#10B981', activeBg: '#ECFDF5' },
    Word: { emoji: '✨', label: '말씀', active: '#EC4899', activeBg: '#FDF2F8' },
    Mongolian: { emoji: '🐎', label: '몽골어', active: '#F97316', activeBg: '#FFF7ED' },
    Album: { emoji: '📸', label: '앨범', active: '#8B5CF6', activeBg: '#F5F3FF' },
  },
} as const;

export type TabRouteName = keyof typeof theme.tabs;
