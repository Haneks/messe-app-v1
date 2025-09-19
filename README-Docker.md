# Guide Docker pour l'Application Liturgique

## ⚠️ Résolution des problèmes de compatibilité

### Erreur Python 3.12 / docker-compose
Si vous rencontrez l'erreur `ModuleNotFoundError: No module named 'distutils'`, voici les solutions :

#### Solution 1 : Utiliser Docker Compose V2 (Recommandé)
```bash
# Utiliser la nouvelle syntaxe Docker Compose V2
docker compose up -d --build
docker compose down
docker compose logs -f liturgy-app
```

#### Solution 2 : Installer Docker Compose V2
```bash
# Sur Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Vérifier l'installation
docker compose version
```

#### Solution 3 : Installer distutils (temporaire)
```bash
# Sur Ubuntu/Debian
sudo apt-get install python3-distutils

# Sur Fedora/CentOS
sudo dnf install python3-distutils
```

#### Solution 4 : Utiliser Docker directement
```bash
# Construction de l'image
docker build -t messe-app .

# Lancement du conteneur
docker run -d -p 3000:80 --name messe-app-container messe-app
```

## 🐳 Déploiement avec Docker

### Prérequis
- Docker installé sur votre système
- Docker Compose (optionnel mais recommandé)

### Construction et lancement rapide

```bash
# Construction de l'image
docker build -t messe-app .

# Lancement du conteneur
docker run -d -p 3000:80 --name messe-app-container messe-app
```

### Utilisation avec Docker Compose (Recommandé)

```bash
# Lancement de l'application (Docker Compose V2)
docker compose up -d

# Arrêt de l'application
docker compose down

# Reconstruction et relancement
docker compose up -d --build
```

### Alternative avec Docker Compose V1
```bash
# Si vous devez utiliser l'ancienne version
docker-compose up -d --build
```

### Accès à l'application
Une fois lancée, l'application sera accessible à :
- **URL locale** : http://localhost:3000

### Configuration de production

#### Variables d'environnement
Créez un fichier `.env.production` pour la configuration :

```env
NODE_ENV=production
VITE_API_BASE_URL=https://votre-domaine.com/api
```

#### SSL/HTTPS
Pour activer HTTPS en production, modifiez le `docker-compose.yml` :

```yaml
services:
  liturgy-app:
    # ... configuration existante
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    environment:
      - SSL_ENABLED=true
```

### Commandes utiles

```bash
# Voir les logs de l'application
docker-compose logs -f liturgy-app

# Accéder au conteneur
docker-compose exec liturgy-app sh

# Redémarrer l'application
docker-compose restart liturgy-app

# Mise à jour de l'application
git pull
docker-compose up -d --build
```

### Optimisations de performance

#### Cache des dépendances
Le Dockerfile utilise une approche multi-stage pour optimiser la taille de l'image finale.

#### Compression
Nginx est configuré avec la compression gzip pour réduire la taille des fichiers transférés.

#### Cache des assets
Les fichiers statiques sont mis en cache pendant 1 an pour améliorer les performances.

### Proxy API
La configuration Nginx inclut un proxy pour l'API AELF qui résout les problèmes CORS :
- `/api/aelf/*` → `https://api.aelf.org/*`

### Sécurité
- Headers de sécurité configurés
- Version Nginx masquée
- Configuration CSP basique

### Dépannage

#### L'application ne démarre pas
```bash
# Vérifier les logs
docker-compose logs liturgy-app

# Vérifier l'état des conteneurs
docker-compose ps
```

#### Problèmes de proxy API
```bash
# Tester l'API directement
curl http://localhost:3000/api/aelf/v1/messes/2024-01-01/france
```

#### Reconstruction complète
```bash
# Supprimer les images et volumes
docker-compose down -v --rmi all
docker-compose up -d --build
```

### Déploiement sur serveur

#### Avec domaine personnalisé
1. Modifiez `nginx.conf` pour inclure votre domaine
2. Configurez SSL avec Let's Encrypt ou vos certificats
3. Utilisez un reverse proxy comme Traefik ou Nginx Proxy Manager

#### Monitoring
Ajoutez des services de monitoring comme :
- Portainer pour la gestion des conteneurs
- Prometheus + Grafana pour les métriques
- Loki pour les logs centralisés

### Support
Pour toute question ou problème, consultez les logs et vérifiez la configuration Nginx.