export const theme = {
  colors: {
    bgDeep: "#020617",
    bgDark: "#0B1430",
    bgCard: "#0F1B3D",
    surface: "#FFFFFF",
    surfaceMuted: "#F4F7FB",
    surfaceSubtle: "#EEF2F8",

    primary: "#0EA5E9",
    primaryDark: "#0284C7",
    accent: "#22D3EE",
    accentBright: "#67E8F9",

    success: "#10B981",
    successDark: "#059669",
    danger: "#EF4444",
    warning: "#F59E0B",
    purple: "#8B5CF6",
    pink: "#EC4899",
    orange: "#FB923C",
    indigo: "#6366F1",

    text: "#0B1430",
    textMuted: "#64748B",
    textSubtle: "#94A3B8",
    textOnDark: "#F8FAFC",
    textOnDarkMuted: "#94A3B8",

    border: "#E2E8F0",
    borderDark: "#1E293B",
    divider: "#F1F5F9",

    inputBg: "#F4F7FB",
    inputBorder: "#E2E8F0",
  },
  gradients: {
    header: ["#020617", "#0B1430", "#0EA5E9"] as const,
    headerSoft: ["#0B1430", "#1E3A8A", "#0EA5E9"] as const,
    primary: ["#0EA5E9", "#22D3EE"] as const,
    accent: ["#22D3EE", "#67E8F9"] as const,
    button: ["#0EA5E9", "#0284C7"] as const,
    success: ["#10B981", "#22D3EE"] as const,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  /**
   * Objeto de estilo de fonte — use via spread: `...theme.font.bold`.
   * As fontes são carregadas via Font.loadAsync em _layout.tsx para todas as plataformas.
   */
  font: {
    regular: { fontFamily: "Inter_400Regular" },
    medium: { fontFamily: "Inter_500Medium" },
    semibold: { fontFamily: "Inter_600SemiBold" },
    bold: { fontFamily: "Inter_700Bold" },
  },
  shadow: {
    soft: {
      shadowColor: "#0B1430",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    card: {
      shadowColor: "#0B1430",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 5,
    },
  },
};

export type Theme = typeof theme;
