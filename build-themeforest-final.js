const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building ThemeForest package...');

// Create the main ThemeForest directory structure
const themeforestDir = 'themeforest-package';
const demoDir = path.join(themeforestDir, 'demo');
const documentationDir = path.join(themeforestDir, 'documentation');
const templateDir = path.join(themeforestDir, 'template');

// Clean and create directories
if (fs.existsSync(themeforestDir)) {
    fs.rmSync(themeforestDir, { recursive: true });
}

fs.mkdirSync(themeforestDir, { recursive: true });
fs.mkdirSync(demoDir, { recursive: true });
fs.mkdirSync(documentationDir, { recursive: true });
fs.mkdirSync(templateDir, { recursive: true });

console.log('📁 Created directory structure');

// 1. DEMO FOLDER - Build production version for demo
console.log('🔨 Building demo (production build)...');
try {
    execSync('ng build --configuration production', { stdio: 'inherit' });
    
    // Copy dist files to demo folder
    const distDir = 'dist/template/browser';
    if (fs.existsSync(distDir)) {
        copyDir(distDir, demoDir);
        console.log('✅ Demo files copied');
    } else {
        console.error('❌ Dist folder not found');
    }
} catch (error) {
    console.error('❌ Build failed:', error.message);
}

// 2. DOCUMENTATION FOLDER - Copy all documentation
console.log('📚 Copying documentation...');
const docFiles = [
    'README.md',
    'INSTALLATION.md', 
    'CUSTOMIZATION.md',
    'CHANGELOG.md',
    'LICENSE',
    'THEMEFOREST_DESCRIPTION.txt'
];

docFiles.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(documentationDir, file));
        console.log(`  ✅ ${file}`);
    }
});

// Create additional documentation files
createDocumentationFiles(documentationDir);

// 3. TEMPLATE FOLDER - Copy source code
console.log('📦 Copying template source code...');
const templateFiles = [
    'src',
    'angular.json',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.spec.json'
];

templateFiles.forEach(file => {
    if (fs.existsSync(file)) {
        if (fs.statSync(file).isDirectory()) {
            copyDir(file, path.join(templateDir, file));
        } else {
            fs.copyFileSync(file, path.join(templateDir, file));
        }
        console.log(`  ✅ ${file}`);
    }
});

// Create template-specific files
createTemplateFiles(templateDir);

// 4. Create final ZIP
console.log('📦 Creating final ZIP...');
try {
    execSync(`cd ${themeforestDir} && powershell Compress-Archive -Path * -DestinationPath ../nexuspro-angular-template.zip -Force`, { stdio: 'inherit' });
    console.log('✅ Final ZIP created: nexuspro-angular-template.zip');
} catch (error) {
    console.error('❌ ZIP creation failed:', error.message);
}

console.log('🎉 ThemeForest package ready!');
console.log('📁 Structure:');
console.log('  ├── demo/ (production build)');
console.log('  ├── documentation/ (all docs)');
console.log('  └── template/ (source code)');

// Helper functions
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function createDocumentationFiles(docDir) {
    // Create QUICK_START.md
    const quickStart = `# Quick Start Guide

## For Buyers - Getting Started

### 1. Choose Your Version
- **Demo**: Use the files in the \`demo\` folder for a quick preview
- **Template**: Use the files in the \`template\` folder for customization

### 2. Demo Setup (Quick Preview)
1. Extract the \`demo\` folder
2. Open \`index.html\` in your browser
3. That's it! No installation required

### 3. Template Setup (Full Customization)
1. Extract the \`template\` folder
2. Install Node.js (v18 or higher)
3. Run: \`npm install\`
4. Run: \`ng serve\`
5. Open: http://localhost:4200

### 4. Customization
- See \`CUSTOMIZATION.md\` for detailed instructions
- All source code is in the \`src\` folder
- Styles are in \`src/styles.scss\` and component SCSS files

### 5. Production Build
\`\`\`bash
ng build --configuration production
\`\`\`

## Support
- Documentation: Check the \`documentation\` folder
- Issues: Contact the author
- Updates: Check \`CHANGELOG.md\`

## License
This template is licensed under MIT License. See \`LICENSE\` file for details.
`;

    fs.writeFileSync(path.join(docDir, 'QUICK_START.md'), quickStart);

    // Create DEPLOYMENT.md
    const deployment = `# Deployment Guide

## Production Deployment

### 1. Build for Production
\`\`\`bash
ng build --configuration production
\`\`\`

### 2. Deploy to Web Server
Copy the contents of the \`dist/template/browser\` folder to your web server.

### 3. Server Configuration

#### Apache (.htaccess)
\`\`\`apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
\`\`\`

#### Nginx
\`\`\`nginx
location / {
  try_files $uri $uri/ /index.html;
}
\`\`\`

### 4. CDN Setup (Optional)
- Upload assets to a CDN
- Update asset paths in \`angular.json\`
- Configure CORS if needed

### 5. Environment Configuration
- Set up environment files for different deployments
- Configure API endpoints
- Set up analytics tracking

## Performance Optimization
- Enable gzip compression
- Set up caching headers
- Optimize images
- Use a CDN for static assets
`;

    fs.writeFileSync(path.join(docDir, 'DEPLOYMENT.md'), deployment);
}

function createTemplateFiles(templateDir) {
    // Create .gitignore
    const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
tmp/
out-tsc/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port
`;

    fs.writeFileSync(path.join(templateDir, '.gitignore'), gitignore);

    // Create environment files
    const environment = `export const environment = {
  production: true,
  apiUrl: 'https://your-api-url.com',
  appName: 'NexusPro',
  version: '1.0.0'
};
`;

    fs.mkdirSync(path.join(templateDir, 'src', 'environments'), { recursive: true });
    fs.writeFileSync(path.join(templateDir, 'src', 'environments', 'environment.ts'), environment);
    fs.writeFileSync(path.join(templateDir, 'src', 'environments', 'environment.prod.ts'), environment);
}
