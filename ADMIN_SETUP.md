# Configuration du Panel Admin

## 1. Variables d'environnement

Ajoutez les variables suivantes dans votre fichier `.env.local` :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
SUPABASE_ANON_KEY=votre_anon_key
```

### Configuration dans Angular

Mettez à jour `src/environments/environment.ts` et `src/environments/environment.prod.ts` :

```typescript
export const environment = {
  production: false, // ou true pour prod
  supabaseUrl: 'https://votre-projet.supabase.co',
  supabaseAnonKey: 'votre_anon_key'
};
```

## 2. Créer un utilisateur admin dans Supabase

### Méthode 1 : Via le Dashboard Supabase

1. Allez dans **Authentication > Users** dans votre projet Supabase
2. Cliquez sur **Add User**
3. Créez un utilisateur avec email/password
4. Notez l'email et le mot de passe

### Méthode 2 : Via l'API (recommandé)

Vous pouvez aussi créer l'utilisateur directement depuis le code ou via la console Supabase SQL :

```sql
-- Optionnel : Créer une table admin pour gérer les droits
-- (Si vous voulez une gestion plus fine des permissions)
CREATE TABLE IF NOT EXISTS admin (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Tester le panel admin

1. **Lancer l'API locale** :
   ```bash
   npm run api:dev
   ```

2. **Lancer Angular** :
   ```bash
   npm start
   ```

3. **Accéder au login admin** :
   - URL : `http://localhost:4200/admin/login`
   - Connectez-vous avec l'email/mot de passe créé

4. **Accéder au panel** :
   - Après connexion, vous serez redirigé vers `/admin`
   - Dashboard disponible avec statistiques
   - Gestion des rendez-vous avec filtres
   - Modification des horaires d'ouverture

## 4. Routes disponibles

### Frontend
- `/admin/login` - Page de connexion (non protégée)
- `/admin` - Dashboard (protégé)
- `/admin/appointments` - Gestion des rendez-vous (protégé)
- `/admin/statistics` - Statistiques (protégé)
- `/admin/hours` - Gestion des horaires (protégé)

### API (protégées)
- `PATCH /api/appointments?id=xxx` - Mettre à jour un rendez-vous (requiert auth)
- `PATCH /api/opening-hours?id=xxx` - Mettre à jour les horaires (requiert auth)

## 5. Sécurité

- ✅ Toutes les routes admin sont protégées par un Guard Angular
- ✅ Les routes API PATCH vérifient le token Supabase Auth
- ✅ Le token est automatiquement inclus dans les headers des requêtes
- ✅ RLS (Row Level Security) dans Supabase pour double sécurité

## 6. Fonctionnalités

### Dashboard
- Statistiques du mois en cours
- Prochains rendez-vous
- Taux d'acceptation

### Gestion des rendez-vous
- Filtres par statut (pending/accepted/rejected)
- Filtres par date (aujourd'hui/semaine/mois/personnalisé)
- Recherche par nom/email
- Actions : Accepter, Refuser, Voir détails

### Statistiques
- Nombre total de RDV
- RDV en attente
- RDV acceptés/refusés
- Taux d'acceptation
- Top 5 prestations les plus réservées

### Gestion des horaires
- Modifier les périodes d'ouverture par jour
- Modifier le dernier rendez-vous par jour
- Activer/désactiver un jour
- Sauvegarder individuellement ou tout en une fois

## 7. Déploiement

Lors du déploiement sur Vercel :
1. Configurez les variables d'environnement dans Vercel Dashboard
2. Mettez à jour `environment.prod.ts` avec vos valeurs Supabase
3. Déployez avec `npm run vercel:deploy`

Les routes API seront automatiquement déployées comme Serverless Functions.

