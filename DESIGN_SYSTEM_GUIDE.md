# Sales Arena - Design System Implementation Guide

## 📋 Visión General

Sales Arena utiliza un **Design System Moderno** basado en variables CSS y principios de Accesibilidad, Rendimiento y UX consistente.

**Estilo**: Vibrant & Block-based  
**Colores**: Trust Teal + Professional Blue  
**Tipografía**: Cinzel (Headings) + Josefin Sans (Body)  
**Modo**: Light & Dark Mode completamente soportados

---

## 🎨 Paleta de Colores

### Primarios (Teal - Confianza)
```css
--design-primary: #0F766E       /* Principal */
--design-primary-hover: #0d6163 /* Hover state */
--design-on-primary: #FFFFFF    /* Texto sobre primary */
```

### Secundarios (Teal claro - Complementario)
```css
--design-secondary: #14B8A6        /* Secundario */
--design-secondary-hover: #0d9488  /* Hover state */
--design-on-secondary: #FFFFFF     /* Texto sobre secondary */
```

### Acentos (Azul - Call-to-Action)
```css
--design-accent: #0369A1        /* CTA Principal */
--design-accent-hover: #0284c7  /* Hover state */
--design-on-accent: #FFFFFF     /* Texto sobre accent */
```

### Semánticos
```css
--design-success: #10b981  /* OK, completado */
--design-warning: #f59e0b  /* Atención, pendiente */
--design-error: #DC2626    /* Error, destructivo */
--design-info: #0369A1     /* Información */
```

### Superficies
```css
--design-background: #F0FDFA  /* Fondo claro */
--design-foreground: #134E4A  /* Texto oscuro */
--design-muted: #E8F0F3       /* Fondo secundario */
--design-border: #99F6E4      /* Bordes activos */
```

---

## 📐 Escala de Espaciado

Basada en sistema de 8px:

```css
--space-xs: 4px      /* Compacto */
--space-sm: 8px      /* Pequeno */
--space-md: 16px     /* Base (default) */
--space-lg: 24px     /* Normal */
--space-xl: 32px     /* Grande */
--space-2xl: 48px    /* Muy grande */
--space-3xl: 64px    /* Secciones */
--space-4xl: 96px    /* Bloques principales */
```

**Reglas de Oro:**
- Gaps entre elementos: `--space-md` o `--space-lg`
- Padding interno: `--space-md` (1rem)
- Secciones con aire: `--space-2xl` (48px)
- Cards/Panels: `--space-lg` gap, `--space-md` padding

---

## 🔤 Tipografía

### Fuentes Importadas
```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Josefin+Sans:wght@300;400;500;600;700&display=swap');

--font-heading: 'Cinzel', serif;  /* Títulos elegantes */
--font-body: 'Josefin Sans', sans-serif;  /* Cuerpo moderno */
```

### Tamaños

| Variable | Tamaño | Uso |
|----------|--------|-----|
| `--text-xs` | 12px | Labels, hints |
| `--text-sm` | 14px | Secondary text |
| `--text-base` | 16px | Párrafos normales |
| `--text-lg` | 18px | Énfasis |
| `--text-xl` | 20px | Subtítulos |
| `--text-2xl` | 24px | h3/h4 |
| `--text-3xl` | 32px | h2 |
| `--text-4xl` | 40px | h1 |
| `--text-5xl` | 48px | Hero |

### Pesos

```css
--font-light: 300      /* Cinzel: no usable, Josefin: soft */
--font-normal: 400     /* Regular */
--font-medium: 500     /* Emphasis */
--font-semibold: 600   /* Strong */
--font-bold: 700       /* Headings */
```

### Altura de Línea

```css
--leading-tight: 1.1        /* Títulos densos */
--leading-normal: 1.5       /* Párrafos (default) */
--leading-relaxed: 1.75     /* Textos largos */
--leading-loose: 2          /* Máximo aire */
```

---

## 🔲 Border Radius

Estilo Apple - redondeado pero no circular:

```css
--radius-xs: 4px        /* Botones pequeños */
--radius-sm: 8px        /* Inputs, chips */
--radius-md: 12px       /* Cards típicas */
--radius-lg: 14px       /* Panels principales */
--radius-xl: 16px       /* Modales */
--radius-2xl: 20px      /* Grandes contenedores */
--radius-full: 9999px   /* Badges circulares */
```

---

## 🌀 Transiciones & Animaciones

Duración estándar (150-300ms):

```css
--duration-fast: 150ms   /* Hover, toggle */
--duration-base: 200ms   /* Fade, slide */
--duration-slow: 300ms   /* Modales, collapses */
```

Easing functions:

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1)           /* Accelerate */
--ease-out: cubic-bezier(0, 0, 0.2, 1)          /* Decelerate */
--ease-inout: cubic-bezier(0.4, 0, 0.2, 1)      /* Smooth (default) */
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)    /* Energetic bounce */
```

**Ejemplo:**
```css
.button {
  transition: all var(--duration-base) var(--ease-inout);
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

---

## 📦 Sombras

Jerarquía de profundidad:

```css
--shadow-xs: 0 1px 2px ...      /* Sutil, botones */
--shadow-sm: 0 1px 3px ...      /* Elevado ligero */
--shadow-md: 0 4px 6px ...      /* Tarjetas típicas */
--shadow-lg: 0 10px 15px ...    /* Paneles, dropdowns */
--shadow-xl: 0 20px 25px ...    /* Modales grandes */
--shadow-2xl: 0 25px 50px ...   /* Hero sections */
```

---

## ♿ Accesibilidad (WCAG 2.1 AA)

### Contraste de Colores
- **Mínimo 4.5:1** para texto normal
- **Mínimo 3:1** para texto grande (18px+)
- **Verificar:** Cinzel (700) sobre teal garantiza 4.5:1+

### Componentes Interactivos
```css
/* OBLIGATORIO: Visible focus ring */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--design-accent);
  outline-offset: 2px;
}

/* Tamaño mínimo de tap target: 44×44px */
.button {
  min-height: 44px;
  min-width: 44px;
}
```

### Movimiento Reducido
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

### Dark Mode Automático
```css
@media (prefers-color-scheme: dark) {
  :root {
    --design-background: #0f172a;
    --design-foreground: #e2e8f0;
    /* ... */
  }
}
```

---

## 🛠 Utilidades CSS Disponibles

### Colores
```css
.text-primary { color: var(--design-primary); }
.text-accent { color: var(--design-accent); }
.bg-primary { background-color: var(--design-primary); }
.border-accent { border-color: var(--design-accent); }
```

### Espaciado
```css
.gap-md { gap: var(--space-md); }
.gap-lg { gap: var(--space-lg); }
```

### Bordes & Sombras
```css
.rounded-lg { border-radius: var(--radius-lg); }
.shadow-md { box-shadow: var(--shadow-md); }
```

### Transiciones
```css
.transition-fast { transition: all var(--duration-fast) var(--ease-inout); }
.transition-base { transition: all var(--duration-base) var(--ease-inout); }
```

### Flex/Grid
```css
.flex-center { display: flex; align-items: center; justify-content: center; }
.flex-between { display: flex; justify-content: space-between; }
.grid-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
```

---

## 📱 Responsive Design

### Breakpoints Recomendados
```css
/* Mobile first approach */
/* Base: 375px - 767px */
/* Tablet: 768px - 1023px */
/* Desktop: 1024px+ */

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 1024px) {
  .hide-on-tablet {
    display: none;
  }
}
```

### Viewport Meta
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

---

## 🚀 Ejemplos de Uso

### Botón Personalizado
```jsx
export function MyButton({ children, variant = 'primary' }) {
  return (
    <button
      className={`
        ${variant === 'primary' ? 'text-primary' : 'text-accent'}
        px-6 py-3
        rounded-lg
        transition-base
        hover:shadow-lg
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
      `}
    >
      {children}
    </button>
  );
}
```

### Card con Variantes
```jsx
export function Card({ title, children }) {
  return (
    <div
      className="
        bg-muted
        border border-design-border
        rounded-lg
        p-6
        shadow-sm
        transition-base
        hover:shadow-md
      "
    >
      <h3 className="text-2xl font-bold text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}
```

### Form Input Accesible
```jsx
export function FormField({ label, id, ...props }) {
  return (
    <div className="mb-6">
      <label htmlFor={id} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <input
        id={id}
        className="
          w-full
          px-4 py-3
          border border-design-border
          rounded-md
          focus:outline-2 focus:outline-offset-2 focus:outline-accent
          transition-base
        "
        {...props}
      />
    </div>
  );
}
```

---

## ✅ Pre-Delivery Checklist

- [ ] No emojis como iconos (usar SVG: Lucide)
- [ ] Todo elemento clickeable tiene `cursor-pointer`
- [ ] Estados hover suave (150-300ms)
- [ ] Contraste texto: mínimo 4.5:1
- [ ] Focus rings visibles (`focus-visible`)
- [ ] Respetar `prefers-reduced-motion`
- [ ] Responsive en: 375px, 768px, 1024px, 1440px
- [ ] Dark mode funciona completamente
- [ ] Sin emojis en UI (solo SVG)

---

## 📖 Referencias

- **Design System Master**: `design-system/sales-arena/MASTER.md`
- **Lucide Icons**: https://lucide.dev/
- **Google Fonts**: Cinzel, Josefin Sans
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/

---

## 🔄 Actualizar el Design System

Si necesitas ajustar colores, tipografía o espaciado:

1. Edita `/src/design-system.css`
2. Actualiza `MASTER.md` en `design-system/sales-arena/`
3. Comunica los cambios al equipo
4. Verifica contraste y accesibilidad

---

**Last Updated**: 2026-07-17  
**Design System**: Sales Arena v1.0
