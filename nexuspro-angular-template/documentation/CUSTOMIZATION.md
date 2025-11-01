# 🎨 Customization Guide - NexusPro Theme

## 📋 Table of Contents

1. [Overview](#overview)
2. [Color Customization](#color-customization)
3. [Typography](#typography)
4. [Layout and Structure](#layout-and-structure)
5. [Page Content](#page-content)
6. [Images and Assets](#images-and-assets)
7. [Animations](#animations)
8. [Custom Components](#custom-components)
9. [Predefined Themes](#predefined-themes)
10. [Best Practices](#best-practices)

## 🎯 Overview

NexusPro is designed to be easily customizable. This guide explains how to modify all aspects of the theme according to your needs.

### File Structure
```
src/
├── app/
│   ├── components/          # Reusable components
│   ├── pages/              # Main pages
│   └── services/           # Angular services
├── assets/
│   └── images/             # Images and assets
└── styles.scss             # Global CSS variables
```

## 🎨 Color Customization

### Main CSS Variables
Modify colors in `src/styles.scss`:

```scss
:root {
  // Primary colors
  --primary-50: #f0f9ff;
  --primary-100: #e0f2fe;
  --primary-200: #bae6fd;
  --primary-300: #7dd3fc;
  --primary-400: #38bdf8;
  --primary-500: #0ea5e9;
  --primary-600: #0284c7;    // Main color
  --primary-700: #0369a1;
  --primary-800: #075985;
  --primary-900: #0c4a6e;

  // Secondary colors
  --secondary-50: #fdf4ff;
  --secondary-100: #fae8ff;
  --secondary-200: #f5d0fe;
  --secondary-300: #f0abfc;
  --secondary-400: #e879f9;
  --secondary-500: #d946ef;
  --secondary-600: #c026d3;  // Secondary color
  --secondary-700: #a21caf;
  --secondary-800: #86198f;
  --secondary-900: #701a75;
}
```

### Color Palette Examples

#### Minimalist Palette
```scss
:root {
  --primary-600: #000000;
  --secondary-600: #666666;
  --accent-600: #cccccc;
}
```

#### Colorful Palette
```scss
:root {
  --primary-600: #ff6b6b;
  --secondary-600: #4ecdc4;
  --accent-600: #ffe66d;
}
```

#### Professional Palette
```scss
:root {
  --primary-600: #2c3e50;
  --secondary-600: #3498db;
  --accent-600: #e74c3c;
}
```

## 📝 Typography

### Available Fonts
```scss
:root {
  // Main font
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  // Heading font
  --heading-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Adding a New Font
1. **Import the font** in `src/styles.scss`:
```scss
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
```

2. **Modify the variables**:
```scss
:root {
  --font-family: 'Poppins', sans-serif;
  --heading-font: 'Poppins', sans-serif;
}
```

### Font Sizes
```scss
:root {
  --font-size-xs: 0.75rem;    // 12px
  --font-size-sm: 0.875rem;   // 14px
  --font-size-base: 1rem;     // 16px
  --font-size-lg: 1.125rem;   // 18px
  --font-size-xl: 1.25rem;    // 20px
  --font-size-2xl: 1.5rem;    // 24px
  --font-size-3xl: 1.875rem;  // 30px
  --font-size-4xl: 2.25rem;   // 36px
}
```

## 🏗️ Layout and Structure

### Container Width
```scss
:root {
  --container-width: 1200px;  // Maximum width
}
```

### Spacing
```scss
:root {
  --spacing-xs: 0.25rem;   // 4px
  --spacing-sm: 0.5rem;    // 8px
  --spacing-md: 1rem;      // 16px
  --spacing-lg: 1.5rem;    // 24px
  --spacing-xl: 2rem;      // 32px
  --spacing-2xl: 3rem;     // 48px
  --spacing-3xl: 4rem;     // 64px
}
```

### Border Radius
```scss
:root {
  --radius-sm: 0.25rem;    // 4px
  --radius-md: 0.5rem;     // 8px
  --radius-lg: 0.75rem;    // 12px
  --radius-xl: 1rem;       // 16px
  --radius-2xl: 1.5rem;    // 24px
}
```

## 📄 Page Content

### Homepage
Modify `src/app/pages/home/home.component.ts`:

```typescript
// Hero Section
heroTitle = "Your Main Title";
heroDescription = "Your catchy description...";

// Features
features = [
  {
    icon: 'design',
    title: 'Your Feature',
    description: 'Description of your feature...'
  }
];

// Testimonials
testimonials = [
  {
    name: 'Client Name',
    role: 'Position, Company',
    content: 'Client testimonial...',
    avatar: 'path/to/avatar.jpg'
  }
];
```

### About Page
Modify `src/app/pages/about/about.component.ts`:

```typescript
// Team
team = [
  {
    name: 'Member Name',
    role: 'Position',
    bio: 'Biography...',
    image: 'path/to/photo.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/profile',
      twitter: 'https://twitter.com/account'
    }
  }
];
```

### Services Page
Modify `src/app/pages/services/services.component.ts`:

```typescript
services = [
  {
    title: 'Your Service',
    description: 'Service description...',
    icon: '🚀',
    features: ['Feature 1', 'Feature 2'],
    price: 'Starting from $999'
  }
];
```

### Portfolio Page
Modify `src/app/pages/portfolio/portfolio.component.ts`:

```typescript
projects = [
  {
    title: 'Your Project',
    description: 'Project description...',
    image: 'path/to/image.jpg',
    technologies: ['Angular', 'TypeScript'],
    category: 'web',
    link: 'https://your-project.com'
  }
];
```

### Contact Page
Modify `src/app/pages/contact/contact.component.ts`:

```typescript
contactInfo = {
  email: 'contact@your-company.com',
  phone: '+1 234 567 8900',
  address: 'Your Complete Address',
  mapEmbed: 'Google Maps integration code'
};
```

## 🖼️ Images and Assets

### Image Replacement
Place your images in `src/assets/images/`:

```
src/assets/images/
├── logo.png              # Logo (200x60px)
├── bg.jpg           # Hero image (1920x1080px)
├── about-image.jpg       # About image (600x400px)
├── portfolio/            # Portfolio images
│   ├── project1.jpg
│   └── project2.jpg
└── team/                 # Team photos
    ├── member1.jpg
    └── member2.jpg
```

### Image Optimization
```bash
# Optimize images with ImageOptim (Mac)
# or TinyPNG (Web)
# or imagemin (Node.js)
npm install -g imagemin-cli
imagemin src/assets/images/*.jpg --out-dir=src/assets/images/optimized
```

### Recommended Formats
- **Logo**: PNG (transparent) or SVG
- **Photos**: JPG (85% quality)
- **Icons**: SVG or PNG 24x24px
- **Hero images**: JPG 1920x1080px

## ✨ Animations

### Disable Animations
```scss
// In src/styles.scss
.no-animations * {
  animation: none !important;
  transition: none !important;
}
```

### Modify Speed
```scss
:root {
  --animation-duration: 0.5s;  // Faster: 0.3s, Slower: 0.8s
}
```

### Create a New Animation
```scss
@keyframes my-animation {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.my-element {
  animation: my-animation 0.6s ease-out;
}
```

## 🧩 Custom Components

### Create a New Component
```bash
ng generate component my-component
```

### Component Example
```typescript
// src/app/components/my-component/my-component.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-my-component',
  standalone: true,
  template: `
    <div class="my-component">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>
  `,
  styles: [`
    .my-component {
      padding: var(--spacing-lg);
      background: var(--card-bg);
      border-radius: var(--radius-md);
    }
  `]
})
export class MyComponentComponent {
  title = 'My Title';
  description = 'My description...';
}
```

### Use the Component
```html
<!-- In any page -->
<app-my-component></app-my-component>
```

## 🎨 Predefined Themes

### Minimalist Theme
```scss
// src/styles.scss
:root {
  --primary-600: #000000;
  --secondary-600: #666666;
  --font-family: 'Helvetica', sans-serif;
  --radius-md: 0;
}
```

### Colorful Theme
```scss
:root {
  --primary-600: #ff6b6b;
  --secondary-600: #4ecdc4;
  --accent-600: #ffe66d;
  --font-family: 'Poppins', sans-serif;
}
```

### Dark Theme
```scss
.dark {
  --primary-600: #60a5fa;
  --secondary-600: #a78bfa;
  --accent-600: #fbbf24;
}
```

## 📱 Responsive Design

### Breakpoints
```scss
// Mobile
@media (max-width: 768px) {
  .my-element {
    font-size: 14px;
  }
}

// Tablet
@media (min-width: 769px) and (max-width: 1024px) {
  .my-element {
    font-size: 16px;
  }
}

// Desktop
@media (min-width: 1025px) {
  .my-element {
    font-size: 18px;
  }
}
```

### Responsive Grids
```scss
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}
```

## 🔧 Best Practices

### 1. Use CSS Variables
```scss
// ✅ Good
.my-element {
  color: var(--primary-600);
  padding: var(--spacing-md);
}

// ❌ Avoid
.my-element {
  color: #3b82f6;
  padding: 16px;
}
```

### 2. Component Structure
```typescript
// ✅ Good - Simple and reusable component
@Component({
  selector: 'app-button',
  template: `
    <button [class]="className" (click)="onClick()">
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() className = 'btn btn-primary';
  @Output() click = new EventEmitter();
  
  onClick() {
    this.click.emit();
  }
}
```

### 3. Performance
```typescript
// ✅ Good - Lazy loading
const routes: Routes = [
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  }
];
```

### 4. Accessibility
```html
<!-- ✅ Good -->
<button aria-label="Close modal" (click)="close()">
  <span aria-hidden="true">&times;</span>
</button>

<!-- ✅ Good -->
<img src="image.jpg" alt="Image description">
```

## 🚀 Deployment

### Production Build
```bash
ng build --configuration production
```

### Verification
```bash
# Test the build locally
npx http-server dist -p 4200
```

## 📞 Support

### Resources
- 📖 **Documentation**: [Installation Guide](INSTALLATION.md)
- 🐛 **Bugs**: [GitHub Issues](https://github.com/nexuspro/theme/issues)
- 💬 **Forum**: [GitHub Discussions](https://github.com/nexuspro/theme/discussions)

### Debug Information
In case of problems, provide:
- Your customization code
- Complete error message
- Browser and version
- Steps to reproduce

---

<div align="center">
  <p>🎉 Your NexusPro theme is now customized!</p>
  <p>Feel free to share your creations with the community.</p>
</div>
