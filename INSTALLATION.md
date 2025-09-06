# 🚀 Installation Guide - NexusPro Theme

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [First Launch](#first-launch)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Software
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or yarn 1.22.0+)
- **Angular CLI** 17.0.0 or higher
- **Git** (optional, for versioning)

### Prerequisites Check
```bash
# Check Node.js
node --version
# Should display v18.0.0 or higher

# Check npm
npm --version
# Should display 9.0.0 or higher

# Check Angular CLI
ng version
# Should display Angular CLI 17.0.0 or higher
```

### Angular CLI Installation (if needed)
```bash
npm install -g @angular/cli@17
# or
yarn global add @angular/cli@17
```

## 📦 Installation

### Step 1: Download
1. Download the `nexuspro-theme.zip` archive
2. Extract the archive to your working folder
3. Rename the folder to `nexuspro-project` (optional)

### Step 2: Dependencies Installation
```bash
# Navigate to the project folder
cd nexuspro-project

# Install dependencies
npm install
# or
yarn install
```

### Step 3: Installation Verification
```bash
# Verify everything is installed correctly
ng version
npm list --depth=0
```

## ⚙️ Configuration

### Basic Configuration
The theme is ready to use, but you can customize:

#### 1. CSS Variables (src/styles.scss)
```scss
:root {
  // Primary colors
  --primary-600: #3b82f6;    // Main blue
  --secondary-600: #8b5cf6;  // Secondary purple
  --accent-600: #f59e0b;     // Accent orange
  
  // Fonts
  --font-family: 'Inter', sans-serif;
  --heading-font: 'Inter', sans-serif;
  
  // Layout
  --container-width: 1200px;
  --radius-md: 0.5rem;
}
```

#### 2. Page Content
Modify data in components:

**Homepage** (`src/app/pages/home/home.component.ts`):
```typescript
features = [
  {
    icon: 'design',
    title: 'Your Title',
    description: 'Your description...'
  }
];
```

**Contact information** (`src/app/pages/contact/contact.component.ts`):
```typescript
contactInfo = {
  email: 'contact@your-company.com',
  phone: '+1 234 567 8900',
  address: 'Your Address'
};
```

#### 3. Images and Assets
Replace images in `src/assets/images/`:
- `logo.png` - Your logo (recommended: 200x60px)
- `hero-bg.jpg` - Hero background image (recommended: 1920x1080px)
- `about-image.jpg` - About section image (recommended: 600x400px)

## 🚀 First Launch

### Development Server
```bash
# Start development server
ng serve
# or
npm start

# The site will be accessible at http://localhost:4200
```

### Production Build
```bash
# Create production build
ng build --configuration production

# Production files will be in dist/
```

### Verification
1. Open http://localhost:4200 in your browser
2. Verify all pages load correctly
3. Test navigation between pages
4. Check dark/light mode
5. Test responsiveness on mobile

## 🌐 Deployment

### Option 1: Standard Web Server
```bash
# Production build
ng build --configuration production

# Copy files from dist/ to your web server
# Apache configuration (.htaccess)
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Option 2: Netlify
1. Connect your GitHub repository
2. Configure build settings:
   - **Build command**: `ng build --configuration production`
   - **Publish directory**: `dist`
3. Deploy automatically

### Option 3: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 4: GitHub Pages
```bash
# Install angular-cli-ghpages
npm install -g angular-cli-ghpages

# Build and deploy
ng build --configuration production --base-href "https://your-username.github.io/your-repo/"
ngh --dir=dist
```

## 🔧 Server Configuration

### Apache (.htaccess)
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# GZIP Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache Headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/nexuspro/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "ng command not found" Error
```bash
# Solution: Install Angular CLI globally
npm install -g @angular/cli@17
```

#### 2. Dependencies Error
```bash
# Solution: Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. Build Error
```bash
# Solution: Check Node.js version
node --version
# Must be 18.0.0 or higher
```

#### 4. Production Routing Issue
```bash
# Solution: Check server configuration
# Make sure all routes redirect to index.html
```

#### 5. Images Not Loading
```bash
# Solution: Check paths in src/assets/
# Use relative paths: ./assets/images/logo.png
```

### Debug Logs
```bash
# Debug mode
ng serve --verbose

# Build with source maps
ng build --source-map

# Bundle analysis
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

## 📞 Support

### Help Resources
- 📖 **Documentation**: [Customization Guide](CUSTOMIZATION.md)
- 🐛 **Bugs**: [GitHub Issues](https://github.com/nexuspro/theme/issues)
- 💬 **Forum**: [GitHub Discussions](https://github.com/nexuspro/theme/discussions)
- 📧 **Email**: support@nexuspro.com

### Debug Information
In case of problems, provide:
- Node.js version: `node --version`
- Angular CLI version: `ng version`
- Complete error message
- Steps to reproduce the problem

---

<div align="center">
  <p>🎉 Congratulations! Your NexusPro site is now ready!</p>
  <p>For any questions, don't hesitate to contact us.</p>
</div>
