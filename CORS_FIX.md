# 🔧 Guide de résolution des erreurs CORS

## 📋 Comprendre l'erreur

Vous avez rencontré cette erreur :
```
Access to XMLHttpRequest at 'https://nexus-pro-liart.vercel.app/api/...' 
from origin 'https://lacouleurdelaura.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**ET** vous voyez aussi dans l'onglet Network :
- Status: `500 Internal Server Error`
- Header: `X-Vercel-Error: FUNCTION_INVOCATION_FAILED`

### Explication : Deux problèmes simultanés

**Problème 1 : CORS (Cross-Origin Resource Sharing)**
- Le navigateur bloque les requêtes HTTP entre différents domaines par défaut
- **Frontend** : `https://lacouleurdelaura.vercel.app` (votre site web)
- **Backend API** : `https://nexus-pro-liart.vercel.app` (votre API)
- **Problème** : L'API ne retourne pas le header `Access-Control-Allow-Origin`

**Problème 2 : 500 Internal Server Error**
- Votre fonction Vercel plante avec une erreur `FUNCTION_INVOCATION_FAILED`
- **Cause probable** : Une exception non gérée dans le code (Supabase, variables d'environnement, etc.)
- **Conséquence** : Quand la fonction plante, elle ne peut pas envoyer les headers CORS

### 🔍 Pourquoi les deux erreurs apparaissent ensemble ?

1. La fonction API plante (500) avant de pouvoir envoyer la réponse
2. Quand Vercel gère l'erreur, il n'inclut pas les headers CORS dans la réponse d'erreur
3. Le navigateur voit une réponse sans header `Access-Control-Allow-Origin`
4. Le navigateur bloque la requête (erreur CORS) ET affiche l'erreur 500

## ✅ Solutions : Deux étapes nécessaires

### 🔴 ÉTAPE 1 : Résoudre l'erreur 500 (PRIORITÉ)

L'erreur 500 signifie que votre fonction Vercel plante. Il faut d'abord résoudre cela.

#### 1.1 Vérifier les logs Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet **nexus-pro-liart**
3. Allez dans **Logs** ou **Deployments** → Cliquez sur le dernier déploiement → **Function Logs**
4. Cherchez les erreurs avec :
   - `[CREATIONS]`, `[FAQS]`, `[PRESTATIONS]`, etc.
   - Messages d'erreur comme "Missing env vars", erreurs Supabase, etc.

#### 1.2 Causes fréquentes de l'erreur 500

**A. Variables d'environnement manquantes**
- Vérifiez que `SUPABASE_URL` est défini dans Vercel
- Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est défini dans Vercel
- Vérifiez que `ALLOWED_ORIGINS` est défini (même si vide, ça peut aider au débogage)

**B. Problème de connexion Supabase**
- Les clés Supabase sont peut-être invalides
- Le projet Supabase est peut-être suspendu ou supprimé

**C. Erreur dans le code**
- Une exception non gérée dans les requêtes Supabase
- Un problème avec le rate limiting

#### 1.3 Comment déboguer

Ajoutez ces variables dans Vercel pour voir les erreurs détaillées :
- Vérifiez les **Function Logs** dans Vercel Dashboard
- Les logs devraient montrer l'erreur exacte

### 🟡 ÉTAPE 2 : Configurer ALLOWED_ORIGINS (après avoir résolu le 500)

Une fois que l'erreur 500 est résolue, configurez CORS correctement.

#### 2.1 Ajouter la variable d'environnement dans Vercel

1. Allez sur le dashboard Vercel : https://vercel.com/dashboard
2. Sélectionnez votre projet **nexus-pro-liart**
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez une nouvelle variable :
   - **Key** : `ALLOWED_ORIGINS`
   - **Value** : `https://lacouleurdelaura.vercel.app`
   - **Environments** : Cochez Production, Preview, Development (ou au minimum Production)

5. Si vous avez plusieurs domaines frontend, séparez-les par des virgules :
   ```
   https://lacouleurdelaura.vercel.app,https://www.lacouleurdelaura.com
   ```

### Étape 2 : Redéployer le projet

Après avoir ajouté la variable d'environnement :

1. Dans Vercel, allez dans **Deployments**
2. Cliquez sur les **3 points** du dernier déploiement
3. Sélectionnez **Redeploy**
4. Ou faites un nouveau commit/push pour déclencher un redéploiement

### Étape 3 : Vérifier la configuration

Pour vérifier que la configuration fonctionne :

1. Attendez que le redéploiement soit terminé
2. Ouvrez votre site frontend : `https://lacouleurdelaura.vercel.app`
3. Ouvrez la console du navigateur (F12)
4. Les erreurs CORS devraient disparaître

## 🔍 Dépannage

### Ordre de résolution

1. **D'abord** : Résoudre l'erreur 500 (voir logs Vercel)
2. **Ensuite** : Configurer ALLOWED_ORIGINS
3. **Enfin** : Vérifier que tout fonctionne

### Si l'erreur 500 persiste

1. **Vérifiez les logs Vercel** :
   - Dashboard Vercel → Votre projet → **Logs** ou **Deployments** → **Function Logs**
   - Cherchez les messages d'erreur détaillés

2. **Vérifiez les variables d'environnement** :
   ```bash
   # Dans Vercel Dashboard → Settings → Environment Variables
   SUPABASE_URL=... (doit être défini)
   SUPABASE_SERVICE_ROLE_KEY=... (doit être défini)
   ALLOWED_ORIGINS=https://lacouleurdelaura.vercel.app (optionnel mais recommandé)
   ```

3. **Testez la connexion Supabase** :
   - Vérifiez que votre projet Supabase est actif
   - Vérifiez que les clés sont correctes

### Si l'erreur CORS persiste (mais plus d'erreur 500)

1. **Vérifiez que la variable est bien définie** :
   - Dans Vercel Dashboard → Settings → Environment Variables
   - Vérifiez que `ALLOWED_ORIGINS` est présente
   - Vérifiez que la valeur contient exactement : `https://lacouleurdelaura.vercel.app`

2. **Vérifiez qu'un redéploiement a eu lieu** :
   - La variable d'environnement n'est disponible qu'après un redéploiement
   - Faites un nouveau commit ou utilisez "Redeploy" dans Vercel

3. **Vérifiez que l'URL est exacte** :
   - Pas d'espace avant/après
   - Pas de slash final (pas de `/` à la fin)
   - HTTPS avec le bon sous-domaine

4. **Testez avec curl** pour vérifier les headers CORS :
   ```bash
   curl -H "Origin: https://lacouleurdelaura.vercel.app" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://nexus-pro-liart.vercel.app/api/opening-hours \
        -v
   ```
   
   Vous devriez voir dans la réponse :
   ```
   < Access-Control-Allow-Origin: https://lacouleurdelaura.vercel.app
   < Access-Control-Allow-Methods: GET, OPTIONS
   ```

## 🛡️ Sécurité

⚠️ **Important** : Ne mettez **JAMAIS** `*` comme valeur de `ALLOWED_ORIGINS` en production !

- `*` permet à **n'importe quel site** d'accéder à votre API
- Liste explicitement tous les domaines autorisés
- Séparez-les par des virgules si vous en avez plusieurs

### Exemple de configuration sécurisée

```env
ALLOWED_ORIGINS=https://lacouleurdelaura.vercel.app,https://www.lacouleurdelaura.com
```

## 📝 Notes techniques

### Comment ça fonctionne

1. Le navigateur envoie d'abord une requête **OPTIONS** (preflight)
2. L'API vérifie si l'origine (`Origin` header) est dans `ALLOWED_ORIGINS`
3. Si oui, l'API retourne `Access-Control-Allow-Origin: <origine>`
4. Le navigateur autorise alors la requête réelle (GET, POST, etc.)

### Code actuel

Le code dans `api/utils/security-helpers.ts` a été amélioré pour :
- Toujours définir les headers CORS de base
- Vérifier l'origine contre `ALLOWED_ORIGINS`
- Logger un avertissement si l'origine n'est pas autorisée
- Permettre le développement local sans configuration

## ✅ Checklist de résolution

- [ ] Variable `ALLOWED_ORIGINS` ajoutée dans Vercel
- [ ] Valeur contient `https://lacouleurdelaura.vercel.app` (sans slash final)
- [ ] Redéploiement effectué sur Vercel
- [ ] Attente de la fin du déploiement (1-2 minutes)
- [ ] Test du site frontend
- [ ] Vérification de la console du navigateur (plus d'erreurs CORS)

