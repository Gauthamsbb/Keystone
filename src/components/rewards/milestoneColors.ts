export const MILESTONE_COLORS = [
  { hex: '#F59E0B', glow: 'rgba(245,158,11,0.55)',  label: 'Amber',   bgLight: '#FFFBEB', border: '#FCD34D', textDark: '#92400E' },
  { hex: '#10B981', glow: 'rgba(16,185,129,0.55)',  label: 'Emerald', bgLight: '#ECFDF5', border: '#6EE7B7', textDark: '#065F46' },
  { hex: '#3B82F6', glow: 'rgba(59,130,246,0.55)',  label: 'Sapphire',bgLight: '#EFF6FF', border: '#93C5FD', textDark: '#1E40AF' },
  { hex: '#8B5CF6', glow: 'rgba(139,92,246,0.55)',  label: 'Violet',  bgLight: '#F5F3FF', border: '#C4B5FD', textDark: '#5B21B6' },
  { hex: '#F43F5E', glow: 'rgba(244,63,94,0.55)',   label: 'Rose',    bgLight: '#FFF1F2', border: '#FDA4AF', textDark: '#9F1239' },
] as const;

export function getMilestoneColor(displayOrder: number) {
  return MILESTONE_COLORS[displayOrder % MILESTONE_COLORS.length];
}
