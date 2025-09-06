# 🚀 NexusPro - Professional Angular Theme

<div align="center">
  <img src="preview-images/01-homepage.jpg" alt="NexusPro Theme Preview" width="800">
  
  [![Angular](https://img.shields.io/badge/Angular-17-red.svg)](https://angular.io/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
  [![SCSS](https://img.shields.io/badge/SCSS-CSS3-pink.svg)](https://sass-lang.com/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## ✨ Overview

**NexusPro** is a professional and modern Angular theme, designed to create exceptional web experiences. Perfect for agencies, freelancers, startups and businesses looking for elegant design and optimal performance.

## 🎨 Key Features

### 🚀 **Modern Technologies**
- **Angular 17** with standalone components
- **TypeScript 5** for robust code
- **SCSS** for advanced styling
- **RxJS** for state management
- **Mobile-first** responsive design

### 🎯 **Advanced Features**
- ✨ **Smooth animations** and micro-interactions
- 🌙 **Complete dark mode** support
- 📱 **100% Responsive** (Mobile, Tablet, Desktop)
- ⚡ **Optimized performance** with lazy loading
- 🎨 **Modern and professional** design
- 🔧 **Easily customizable**

### 📄 **Included Sections**
- 🏠 **Homepage** with animated hero
- 👥 **About** with team presentation
- 🛠️ **Services** with detailed filters
- 💼 **Portfolio** with interactive gallery
- 💬 **Testimonials** with automatic carousel
- 💰 **Pricing** with detailed plans
- 📞 **Contact** with functional form

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+ or yarn
- Angular CLI 17+

### Installation

1. **Download the theme**
   ```bash
   # Extract the archive to your project folder
   unzip nexuspro-theme.zip
   cd nexuspro-theme
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**
   ```bash
   ng serve
   # or
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:4200
   ```

## 🎨 Customization

### Colors
Modify CSS variables in `src/styles.scss`:

```scss
:root {
  --primary-600: #3b82f6;    // Primary color
  --secondary-600: #8b5cf6;  // Secondary color
  --accent-600: #f59e0b;     // Accent color
}
```

### Content
Edit data in components:

```typescript
// src/app/pages/home/home.component.ts
features = [
  {
    icon: 'design',
    title: 'Your Title',
    description: 'Your description...'
  }
];
```

### Images
Replace images in `src/assets/images/`:
- `logo.png` - Your logo
- `hero-bg.jpg` - Hero background image
- `about-image.jpg` - About section image

## 📱 Responsive Design

The theme adapts perfectly to all screens:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🌙 Dark Mode

Dark mode is automatically enabled based on system preferences or via the toggle in the header.

## ⚡ Performance

- **Lazy Loading** of components
- **Optimized and compressed** images
- **Minified CSS** in production
- **Performant animations** with `requestAnimationFrame`

## 🛠️ Build and Deployment

### Production Build
```bash
ng build --configuration production
```

### Deployment
```bash
# Production files are in dist/
# Upload the content of dist/ to your server
```

## 📚 Documentation

- [Installation Guide](INSTALLATION.md)
- [Customization Guide](CUSTOMIZATION.md)
- [Changelog](CHANGELOG.md)

## 🎯 Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Angular Versions
- Angular 17+
- TypeScript 5+
- Node.js 18+

## 🆘 Support

### Included Support
- 📧 **Email**: support@nexuspro.com
- 📖 **Complete documentation**
- 🐛 **Bug fixes**
- 🔄 **Free updates**

### Community
- 💬 **Forum**: [GitHub Discussions](https://github.com/nexuspro/theme/discussions)
- 🐛 **Bugs**: [GitHub Issues](https://github.com/nexuspro/theme/issues)
- 💡 **Suggestions**: [GitHub Discussions](https://github.com/nexuspro/theme/discussions)

## 📄 License

This theme is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Angular Team** for the exceptional framework
- **Unsplash** for demo images
- **Community** for feedback and suggestions

---

<div align="center">
  <p>Made with ❤️ for the Angular community</p>
  <p>© 2024 NexusPro. All rights reserved.</p>
</div>