/**
 * Berkshire Hathaway HomeServices (BHHS) Color Palette
 * Design system constants for consistent theming
 */

export const colors = {
  // Primary Colors
  cabernet: '#552448',        // Primary brand color (RGB 85,36,72)
  cream: '#EAE3D4',          // Secondary background (RGB 234,227,212)
  
  // Cabernet Variants
  cabernetHover: '#6B3057',   // Lighter tint for hover states
  cabernetActive: '#441D39',  // Darker shade for active states
  cabernetLight: '#7A4F6D',   // Light variant
  
  // Accent Neutrals
  lightPink: '#F5E6F0',       // Soft pink for backgrounds
  blushPink: '#E8D1E1',       // Medium pink for borders/dividers
  warmGrey: '#B8B0A6',        // Warm grey for secondary text
  lightGrey: '#D6D2CB',       // Light grey for subtle borders
  
  // Typography
  darkNeutral: '#333333',     // Primary text color
  mediumGrey: '#666666',      // Secondary text color
  
  // Status Colors (maintaining accessibility)
  success: '#4A7C59',         // Success state (green tinted toward cabernet)
  error: '#8B4B47',           // Error state (red tinted toward cabernet)
  warning: '#A67C52',         // Warning state (orange tinted toward cabernet)
  
  // Pure Neutrals
  white: '#FFFFFF',
  black: '#000000'
};

export const typography = {
  fontFamily: {
    primary: '"Georgia", "Times New Roman", serif',
    secondary: '"Helvetica Neue", "Arial", sans-serif'
  },
  
  fontSizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem' // 30px
  },
  
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
};

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem'     // 64px
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(85, 36, 72, 0.05)',
  md: '0 4px 6px -1px rgba(85, 36, 72, 0.1), 0 2px 4px -1px rgba(85, 36, 72, 0.06)',
  lg: '0 10px 15px -3px rgba(85, 36, 72, 0.1), 0 4px 6px -2px rgba(85, 36, 72, 0.05)',
  xl: '0 20px 25px -5px rgba(85, 36, 72, 0.1), 0 10px 10px -5px rgba(85, 36, 72, 0.04)'
};

// CSS Custom Properties for easy integration
export const cssVariables = `
  :root {
    --color-cabernet: ${colors.cabernet};
    --color-cabernet-hover: ${colors.cabernetHover};
    --color-cabernet-active: ${colors.cabernetActive};
    --color-cream: ${colors.cream};
    --color-light-pink: ${colors.lightPink};
    --color-blush-pink: ${colors.blushPink};
    --color-warm-grey: ${colors.warmGrey};
    --color-light-grey: ${colors.lightGrey};
    --color-dark-neutral: ${colors.darkNeutral};
    --color-medium-grey: ${colors.mediumGrey};
    --color-success: ${colors.success};
    --color-error: ${colors.error};
    --color-warning: ${colors.warning};
    --color-white: ${colors.white};
    --color-black: ${colors.black};
    
    --font-family-primary: ${typography.fontFamily.primary};
    --font-family-secondary: ${typography.fontFamily.secondary};
    
    --shadow-sm: ${shadows.sm};
    --shadow-md: ${shadows.md};
    --shadow-lg: ${shadows.lg};
    --shadow-xl: ${shadows.xl};
  }
`;

export default {
  colors,
  typography,
  spacing,
  shadows,
  cssVariables
};