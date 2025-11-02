# 🔧 Guide de résolution des erreurs CORS

## 📋 Comprendre l'erreur

Vous avez rencontré cette erreur :
```
Access to XMLHttpRequest at 'https://nexus-pro-liart.vercel.app/api/...' 
from origin 'https://lacouleurdelaura.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Explication

**CORS (Cross-Origin Resource Sharing)** est un mécanisme de sécurité du navigateur qui bloque les requêtes HTTP entre différents domaines par défaut.

Dans votre cas :
- **Frontend** : `https://lacouleurdelaura.vercel.app` (votre site web)
- **Backend API** : `https://nexus-pro-liart.vercel.app` (votre API)
- **Problème** : L'API ne retourne pas le header `Access-Control-Allow-Origin` permettant au frontend d'accéder aux ressources

## ✅ Solution : Configurer ALLOWED_ORIGINS

### Étape 1 : Ajouter la variable d'environnement dans Vercel

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

### Si l'erreur persiste après configuration

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

