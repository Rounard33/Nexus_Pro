# Deployment Guide

## Production Deployment

### 1. Build for Production
```bash
ng build --configuration production
```

### 2. Deploy to Web Server
Copy the contents of the `dist/template/browser` folder to your web server.

### 3. Server Configuration

#### Apache (.htaccess)
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

#### Nginx
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### 4. CDN Setup (Optional)
- Upload assets to a CDN
- Update asset paths in `angular.json`
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
