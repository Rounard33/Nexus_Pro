# Configuration de l'API

## URL de l'API

L'URL de l'API est configurée dans `src/app/services/content.service.ts`.

### En développement local

Si vous utilisez Vercel CLI pour tester localement :
```bash
vercel dev
```
L'URL sera : `http://localhost:3000/api`

### En production

Après déploiement sur Vercel, remplacez l'URL dans `content.service.ts` :

```typescript
const API_URL = 'https://votre-app.vercel.app/api';
```

Où `votre-app.vercel.app` est l'URL fournie par Vercel lors du déploiement.

## Variables d'environnement Vercel

Assurez-vous d'avoir configuré dans Vercel Dashboard (Settings → Environment Variables) :
- `SUPABASE_URL` = votre Project URL Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = votre service_role key Supabase

## Test de l'API

Pour tester si l'API fonctionne :

1. En local : `http://localhost:3000/api/prestations`
2. En production : `https://votre-app.vercel.app/api/prestations`

Vous devriez recevoir un JSON avec vos prestations.

