# Frontend Skill Document
## Zesty & Eventra – Unified Platform Frontend

**Version**: 1.0  
**Last Updated**: March 2026  
**Technology**: React + Next.js + TypeScript + Tailwind CSS + Framer Motion

---

## 📖 Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Theme System & Switching](#theme-system--switching)
4. [Component Architecture](#component-architecture)
5. [Design Specifications](#design-specifications)
6. [Animation Guidelines](#animation-guidelines)
7. [Responsive Design](#responsive-design)
8. [Performance Optimization](#performance-optimization)
9. [Accessibility Standards](#accessibility-standards)
10. [Development Workflow](#development-workflow)

---

## 1. Design Philosophy

### Dual Identity, Single Codebase

The frontend is engineered as a **single-codebase, dual-theme system**:

- **Zesty**: Warm, inviting, appetite-driven design inspired by modern food tech
- **Eventra**: Sophisticated, immersive, entertainment-focused design

### Core Principles

1. **Seamless Theme Switching**
   - Instant theme toggling via navbar button
   - <300ms animation transition
   - No page reload required
   - Persistent user preference (localStorage)

2. **Aesthetic Excellence**
   - Modern, clean UI avoiding generic templates
   - Bold typography & color choices
   - Micro-interactions that delight
   - Intentional use of negative space

3. **Performance First**
   - <2s page load (Core Web Vitals)
   - Optimized bundle size (<150KB gzipped)
   - Lazy loading for images & components
   - Server-side rendering where beneficial

4. **Accessibility Built-in**
   - WCAG 2.1 AA compliance
   - Keyboard navigation support
   - Screen reader friendly
   - High contrast ratios

---

## 2. Architecture Overview

### Folder Structure (Frontend)

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with theme provider
│   ├── page.tsx                  # Home page (platform agnostic)
│   ├── not-found.tsx
│   └── error.tsx
│
├── zesty/                        # Zesty (Food Delivery)
│   ├── page.tsx                  # Zesty home
│   ├── restaurants/
│   │   ├── page.tsx              # Restaurant listing
│   │   └── [id]/
│   │       ├── page.tsx          # Restaurant detail
│   │       └── menu.tsx          # Menu view
│   ├── order/
│   │   ├── page.tsx              # Active orders
│   │   ├── cart.tsx              # Shopping cart
│   │   └── checkout.tsx          # Checkout flow
│   └── account/
│       ├── profile.tsx
│       ├── addresses.tsx
│       └── orders-history.tsx
│
├── eventra/                      # Eventra (Event Management)
│   ├── page.tsx                  # Eventra home
│   ├── events/
│   │   ├── page.tsx              # Event listing
│   │   └── [id]/
│   │       ├── page.tsx          # Event detail
│   │       ├── tickets.tsx       # Ticket selection
│   │       └── seats.tsx         # Seat selection
│   ├── booking/
│   │   ├── page.tsx              # Active bookings
│   │   ├── checkout.tsx          # Booking checkout
│   │   └── confirmation.tsx      # Confirmation
│   └── account/
│       ├── profile.tsx
│       ├── bookings.tsx
│       └── tickets.tsx
│
├── components/
│   ├── shared/                   # Theme-agnostic components
│   │   ├── Layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ThemeSwitcher.tsx
│   │   ├── UI/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   ├── Forms/
│   │   │   ├── FormInput.tsx
│   │   │   ├── FormSelect.tsx
│   │   │   ├── FormCheckbox.tsx
│   │   │   └── FormValidator.tsx
│   │   ├── Search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── FilterPanel.tsx
│   │   └── Loading/
│   │       ├── Skeleton.tsx
│   │       └── Spinner.tsx
│   │
│   ├── zesty/                    # Zesty-specific components
│   │   ├── RestaurantCard.tsx
│   │   ├── MenuItemCard.tsx
│   │   ├── CartItem.tsx
│   │   ├── OrderStatus.tsx
│   │   ├── DeliveryTracker.tsx
│   │   └── ReviewCard.tsx
│   │
│   └── eventra/                  # Eventra-specific components
│       ├── EventCard.tsx
│       ├── TicketSelector.tsx
│       ├── SeatMap.tsx
│       ├── BookingStatus.tsx
│       ├── EventCalendar.tsx
│       └── ReviewCard.tsx
│
├── hooks/                        # Custom React Hooks
│   ├── useTheme.ts              # Theme context & switching
│   ├── useAuth.ts               # Authentication logic
│   ├── useAPI.ts                # API communication
│   ├── useCart.ts               # Cart management (Zesty)
│   ├── useBooking.ts            # Booking management (Eventra)
│   ├── useGeolocation.ts        # Location services
│   ├── useLocalStorage.ts       # Persistent storage
│   └── useDebounce.ts           # Search debouncing
│
├── context/                      # Context Providers
│   ├── ThemeContext.tsx         # Theme switching
│   ├── AuthContext.tsx          # User authentication
│   ├── CartContext.tsx          # Shopping cart state
│   ├── BookingContext.tsx       # Event booking state
│   └── NotificationContext.tsx  # Toast/notification system
│
├── styles/
│   ├── globals.css              # Global styles
│   ├── zesty-theme.css          # Zesty theme variables
│   ├── eventra-theme.css        # Eventra theme variables
│   ├── animations.css           # Shared animations
│   ├── typography.css           # Font definitions
│   ├── utility-overrides.css    # Custom Tailwind utilities
│   └── transitions.css          # Theme switch transitions
│
├── utils/
│   ├── api.ts                   # Axios instance & interceptors
│   ├── constants.ts             # App-wide constants
│   ├── validators.ts            # Form & data validation
│   ├── formatters.ts            # Date, currency, number formatting
│   ├── analytics.ts             # Event tracking
│   └── helpers.ts               # Utility functions
│
├── types/
│   ├── index.ts                 # Shared TypeScript types
│   ├── api.ts                   # API response types
│   ├── entities.ts              # Data model types
│   └── enums.ts                 # Shared enumerations
│
├── public/
│   ├── zesty-assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── animations/
│   └── eventra-assets/
│       ├── images/
│       ├── icons/
│       └── animations/
│
├── lib/
│   ├── date-utils.ts
│   ├── geo-utils.ts
│   └── string-utils.ts
│
├── .env.local                   # Environment variables
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── package.json

```

---

## 3. Theme System & Switching

### Theme Context Implementation

```typescript
// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'zesty' | 'eventra';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('zesty');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme | null;
    if (savedTheme) setTheme(savedTheme);
    setMounted(true);
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'zesty' ? 'eventra' : 'zesty'));
  };

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### CSS Theme Variables

```css
/* styles/zesty-theme.css */
[data-theme="zesty"] {
  /* Primary Colors */
  --primary-50: #FFF5E6;
  --primary-100: #FFDDB3;
  --primary-200: #FFC680;
  --primary-300: #FFAE4D;
  --primary-400: #FF961A;
  --primary-500: #FF6B35;   /* Main */
  --primary-600: #E55100;
  --primary-700: #CC4400;
  --primary-800: #B23700;
  --primary-900: #8A2800;

  /* Secondary Colors */
  --secondary-500: #F7931E;
  --secondary-400: #FFAD47;

  /* Accent */
  --accent-500: #00B4A6;
  --accent-400: #33D9D0;

  /* Neutral */
  --background: #FAFAFA;
  --surface: #FFFFFF;
  --surface-variant: #F5F5F5;
  --text-primary: #1A1A1A;
  --text-secondary: #666666;
  --border: #E0E0E0;

  /* Semantic */
  --success: #4CAF50;
  --warning: #FFC107;
  --error: #F44336;
  --info: #2196F3;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.15);

  /* Typography */
  --font-display: 'Poppins', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Menlo', 'Monaco', monospace;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
}

/* styles/eventra-theme.css */
[data-theme="eventra"] {
  /* Primary Colors */
  --primary-50: #F3E5F5;
  --primary-100: #E1BEE7;
  --primary-200: #CE93D8;
  --primary-300: #BA68C8;
  --primary-400: #AB47BC;
  --primary-500: #9B59B6;   /* Main */
  --primary-600: #8E24AA;
  --primary-700: #7B1FA2;
  --primary-800: #6A1B9A;
  --primary-900: #4A148C;

  /* Secondary Colors */
  --secondary-500: #E91E63;
  --secondary-400: #F06292;

  /* Accent */
  --accent-500: #00D4FF;
  --accent-400: #4DD0E1;

  /* Neutral */
  --background: #0F0F1E;
  --surface: #1A1A2E;
  --surface-variant: #16213E;
  --text-primary: #F5F5F5;
  --text-secondary: #B0B0B0;
  --border: #2A2A3E;

  /* Semantic */
  --success: #4CAF50;
  --warning: #FFC107;
  --error: #F44336;
  --info: #2196F3;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.5);

  /* Typography */
  --font-display: 'Montserrat', sans-serif;
  --font-body: 'Space Grotesk', sans-serif;
  --font-mono: 'Menlo', 'Monaco', monospace;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
}
```

### Theme Switcher Component

```typescript
// components/shared/Layout/ThemeSwitcher.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import styles from './ThemeSwitcher.module.css';

export const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className={styles.switcher}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <motion.div
        className={styles.track}
        initial={false}
        animate={{ backgroundColor: theme === 'zesty' ? '#FF6B35' : '#9B59B6' }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className={styles.thumb}
          initial={false}
          animate={{ x: theme === 'zesty' ? 0 : 32 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {theme === 'zesty' ? '🍕' : '🎭'}
        </motion.div>
      </motion.div>
      <span className={styles.label}>
        {theme === 'zesty' ? 'Zesty' : 'Eventra'}
      </span>
    </motion.button>
  );
};
```

---

## 4. Component Architecture

### Base Button Component

```typescript
// components/shared/UI/Button.tsx
'use client';

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import clsx from 'clsx';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  animate?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    fullWidth = false,
    className,
    children,
    animate = true,
    disabled,
    ...props
  }, ref) => {
    const buttonClass = clsx(
      styles.button,
      styles[variant],
      styles[size],
      {
        [styles.fullWidth]: fullWidth,
        [styles.loading]: isLoading,
        [styles.disabled]: disabled,
      },
      className
    );

    const content = (
      <>
        {isLoading && <span className={styles.spinner} />}
        {icon && !isLoading && <span className={styles.icon}>{icon}</span>}
        {children}
      </>
    );

    if (!animate) {
      return (
        <button
          ref={ref}
          className={buttonClass}
          disabled={disabled || isLoading}
          {...props}
        >
          {content}
        </button>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={buttonClass}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {content}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
```

### Card Component

```typescript
// components/shared/UI/Card.tsx
'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  clickable?: boolean;
  elevation?: 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, clickable = false, elevation = 'md', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          styles.card,
          styles[elevation],
          {
            [styles.hover]: hover,
            [styles.clickable]: clickable,
          },
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
```

---

## 5. Design Specifications

### Typography Scale

```css
/* Font Sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-black: 900;
```

### Spacing Scale (8px base)

```css
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
```

### Breakpoints

```typescript
// Mobile First Approach
const breakpoints = {
  sm: '640px',    // Small devices
  md: '768px',    // Tablets
  lg: '1024px',   // Desktops
  xl: '1280px',   // Large desktops
  '2xl': '1536px' // Extra large
};
```

---

## 6. Animation Guidelines

### Page Transitions

```typescript
// Theme switch animation
// Duration: 600ms
// Easing: cubic-bezier(0.4, 0, 0.2, 1)

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.3, ease: 'easeIn' }
  }
};
```

### Component Entry Animations

```typescript
// Staggered children animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};
```

### Scroll-triggered Animations

```typescript
// Use Intersection Observer for performance
const useScrollAnimation = (ref: RefObject<HTMLElement>) => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
};
```

---

## 7. Responsive Design

### Mobile-First Strategy

```typescript
// Always start with mobile styles, then enhance for larger screens

// Example: Restaurant card
export const RestaurantCard: React.FC = () => (
  <Card className="
    grid grid-cols-1 gap-4
    md:grid-cols-2 md:gap-6
    lg:grid-cols-3 lg:gap-8
  ">
    {/* Content */}
  </Card>
);
```

### Touch-Friendly Targets

```css
/* Minimum 48x48px for touch targets */
button, a, .clickable {
  min-width: 48px;
  min-height: 48px;
  padding: 12px 16px;
}

/* Mobile: Increase spacing */
@media (max-width: 640px) {
  padding: 16px 20px;
  gap: 16px;
}
```

### Safe Area Insets (Notch Support)

```css
/* iPhone notch support */
@supports (padding: max(0px)) {
  body {
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
}
```

---

## 8. Performance Optimization

### Image Optimization

```typescript
import Image from 'next/image';

export const OptimizedImage: React.FC = () => (
  <Image
    src="/restaurant.jpg"
    alt="Restaurant"
    width={800}
    height={600}
    priority={false}
    loading="lazy"
    placeholder="blur"
    blurDataURL="data:image/svg+xml,..." // Low-quality placeholder
    sizes="(max-width: 640px) 100vw,
           (max-width: 1024px) 50vw,
           33vw"
  />
);
```

### Code Splitting

```typescript
// Dynamic imports for route-specific code
import dynamic from 'next/dynamic';

const SeatMap = dynamic(() => import('@/components/eventra/SeatMap'), {
  loading: () => <Skeleton className="w-full h-96" />,
  ssr: false, // Only render on client
});
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx bundle-analyzer out/.next/static
```

---

## 9. Accessibility Standards

### WCAG 2.1 AA Compliance

#### Color Contrast
```css
/* Minimum 4.5:1 for body text */
--text-primary: #1A1A1A;        /* Zesty */
--background: #FAFAFA;

/* Minimum 3:1 for large text */
--primary-500: #FF6B35;
--background: #FAFAFA;
```

#### Keyboard Navigation
```typescript
// All interactive elements must be keyboard accessible
export const TabNavigation: React.FC = () => (
  <nav role="navigation">
    <Button onKeyDown={(e) => {
      if (e.key === 'ArrowRight') focusNextTab();
      if (e.key === 'ArrowLeft') focusPreviousTab();
    }}>
      Tab Item
    </Button>
  </nav>
);
```

#### ARIA Labels
```typescript
<Button aria-label="Toggle theme">
  <ThemeIcon />
</Button>

<div role="status" aria-live="polite" aria-atomic="true">
  {cartItems.length} items in cart
</div>
```

#### Semantic HTML
```typescript
// Use semantic elements
<main>
  <article>
    <header>...</header>
    <section>...</section>
  </article>
</main>
```

---

## 10. Development Workflow

### Component Creation Checklist

- [ ] TypeScript interfaces defined
- [ ] Theme variables applied (CSS custom properties)
- [ ] Responsive breakpoints considered
- [ ] Animation/motion implemented
- [ ] Accessibility: ARIA labels added
- [ ] Keyboard navigation supported
- [ ] Mobile-friendly sizing (48px min-touch)
- [ ] Error states handled
- [ ] Loading states shown
- [ ] Unit tests written
- [ ] Storybook story created
- [ ] Performance: Image optimization done
- [ ] Type exports in index.ts

### Testing Strategy

```typescript
// Jest + React Testing Library
describe('Button Component', () => {
  it('should render with correct theme', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container).toHaveClass('button--primary');
  });

  it('should handle keyboard interaction', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    // Assertion
  });

  it('should respect theme context', () => {
    const { container } = render(
      <ThemeProvider initialTheme="eventra">
        <Button>Click me</Button>
      </ThemeProvider>
    );
    expect(container).toHaveAttribute('data-theme', 'eventra');
  });
});
```

### Git Commit Convention

```
feat: Add restaurant search component
feat: Implement theme switching animation
fix: Resolve Button hover state styling
refactor: Extract theme variables to CSS
docs: Update component API documentation
style: Format code according to Prettier
test: Add Button component unit tests
perf: Optimize image loading with Next/Image
```

---

## 11. Design Assets

### Icon System

```typescript
// components/shared/UI/Icon.tsx
import { ReactNode } from 'react';

interface IconProps {
  name: 'search' | 'heart' | 'cart' | 'user' | 'menu' | ...;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'zesty' | 'eventra';
}

export const Icon: React.FC<IconProps> = ({ name, size = 'md', theme }) => {
  // Return SVG icon
};
```

### Image Guidelines

**Restaurant Images (Zesty)**
- Dimensions: 800x600px minimum
- Format: WebP with JPEG fallback
- Quality: 85% compression
- Aspect ratio: 4:3

**Event Images (Eventra)**
- Dimensions: 1200x800px minimum
- Format: WebP with JPEG fallback
- Quality: 85% compression
- Aspect ratio: 3:2

---

## 12. Performance Targets

| Metric | Target |
|--------|--------|
| Largest Contentful Paint (LCP) | < 2.5s |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| First Contentful Paint (FCP) | < 1.8s |
| Bundle Size (gzipped) | < 150KB |
| Lighthouse Score | ≥ 90 |

---

## 13. Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

---

## 14. Color Usage Examples

### Zesty (Food Delivery)

```typescript
// Primary actions (Order, Add to cart)
bg-[--primary-500] // #FF6B35 (Vibrant Orange)

// Confirmation, success
bg-[--success] // #4CAF50 (Green)

// Secondary content (Restaurants, filters)
bg-[--secondary-500] // #F7931E (Warm Gold)

// Accent highlights (Popular, trending)
text-[--accent-500] // #00B4A6 (Fresh Teal)
```

### Eventra (Event Management)

```typescript
// Primary actions (Book ticket, Buy)
bg-[--primary-500] // #9B59B6 (Royal Purple)

// Featured events, premium tiers
bg-[--secondary-500] // #E91E63 (Hot Pink)

// Accent highlights (VIP badge)
text-[--accent-500] // #00D4FF (Cyan)

// Dark mode ambient
bg-[--background] // #0F0F1E (Dark Navy)
```

---

## 15. Future Enhancements

- [ ] Dark mode variant
- [ ] Custom font preloading (WOFF2)
- [ ] Service Worker for offline support
- [ ] Progressive Web App (PWA) capabilities
- [ ] Advanced animations with GPU acceleration
- [ ] Internationalization (i18n) support
- [ ] Advanced analytics integration
- [ ] A/B testing framework

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)

---

**Document Owner**: Frontend Lead  
**Last Updated**: March 2026  
**Next Review**: After MVP Launch
