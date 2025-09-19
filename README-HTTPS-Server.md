# 🔒 Déploiement HTTPS sur Serveur Personnel

Guide complet pour déployer l'application Messe avec HTTPS sur votre propre serveur.

## 🚀 Déploiement rapide

### 1. Prérequis
```bash
# Installer Docker et Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installer Docker Compose V2
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### 2. Configuration DNS
Pointez votre domaine vers l'IP de votre serveur :
```
A    votre-domaine.com    → IP_DE_VOTRE_SERVEUR
A    www.votre-domaine.com → IP_DE_VOTRE_SERVEUR
```

### 3. Déploiement automatique
```bash
# Rendre le script exécutable
chmod +x setup-ssl.sh

# Lancer la configuration (remplacez par vos vraies valeurs)
./setup-ssl.sh votre-domaine.com votre-email@example.com
```

## 🔧 Configuration manuelle

### 1. Modifier les fichiers de configuration
```bash
# Éditer nginx-https.conf
sed -i 's/votre-domaine\.com/mondomaine.com/g' nginx-https.conf

# Éditer docker-compose.prod.yml
sed -i 's/votre-email@example\.com/mon-email@example.com/g' docker-compose.prod.yml
sed -i 's/votre-domaine\.com/mondomaine.com/g' docker-compose.prod.yml
```

### 2. Démarrer l'application
```bash
# Créer les répertoires
mkdir -p certbot/conf certbot/www ssl

# Démarrer sans SSL d'abord
docker-compose -f docker-compose.prod.yml up -d liturgy-app nginx-proxy

# Obtenir le certificat SSL
docker-compose -f docker-compose.prod.yml --profile ssl-setup run --rm certbot

# Redémarrer avec SSL
docker-compose -f docker-compose.prod.yml restart nginx-proxy
```

## 🔒 Fonctionnalités de sécurité

### Headers de sécurité configurés :
- **HSTS** : Force HTTPS pendant 1 an
- **X-Frame-Options** : Protection contre le clickjacking
- **X-Content-Type-Options** : Prévention du MIME sniffing
- **X-XSS-Protection** : Protection XSS
- **CSP** : Content Security Policy restrictive

### Chiffrement SSL/TLS :
- **Protocoles** : TLS 1.2 et 1.3 uniquement
- **Ciphers** : Suite de chiffrement moderne et sécurisée
- **Perfect Forward Secrecy** : Activé

## 🔄 Maintenance

### Renouvellement automatique SSL
Le script configure automatiquement le renouvellement :
```bash
# Vérifier le crontab
crontab -l

# Tester le renouvellement manuellement
./renew-ssl.sh
```

### Commandes utiles
```bash
# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Redémarrer l'application
docker-compose -f docker-compose.prod.yml restart

# Mise à jour
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier les certificats
docker-compose -f docker-compose.prod.yml run --rm certbot certificates
```

## 🌐 Test de la configuration

### Vérifier HTTPS
```bash
# Test SSL
curl -I https://votre-domaine.com

# Test de redirection HTTP → HTTPS
curl -I http://votre-domaine.com

# Test des headers de sécurité
curl -I https://votre-domaine.com | grep -E "(Strict-Transport|X-Frame|X-Content)"
```

### Outils en ligne
- [SSL Labs Test](https://www.ssllabs.com/ssltest/) - Note A+ attendue
- [Security Headers](https://securityheaders.com/) - Vérification des headers
- [HTTP/2 Test](https://tools.keycdn.com/http2-test) - Support HTTP/2

## 🔧 Dépannage

### Problèmes courants

#### Certificat SSL non obtenu
```bash
# Vérifier les logs Certbot
docker-compose -f docker-compose.prod.yml logs certbot

# Vérifier que le domaine pointe vers le serveur
nslookup votre-domaine.com

# Test manuel du challenge
curl http://votre-domaine.com/.well-known/acme-challenge/test
```

#### Erreur 502 Bad Gateway
```bash
# Vérifier que l'application fonctionne
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs liturgy-app

# Tester l'accès direct
curl http://localhost:80
```

#### Problème de proxy API
```bash
# Tester l'API AELF
curl -v "https://votre-domaine.com/api/aelf/v1/messes/2024-01-15/france"
```

## 📊 Monitoring (optionnel)

### Ajouter Portainer pour la gestion
```yaml
# Ajouter à docker-compose.prod.yml
  portainer:
    image: portainer/portainer-ce
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    restart: unless-stopped
```

### Logs centralisés
```bash
# Configurer la rotation des logs
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

## 🎯 Performance

### Optimisations appliquées :
- **HTTP/2** : Activé automatiquement
- **Compression Gzip** : Tous les assets texte
- **Cache des assets** : 1 an pour les fichiers statiques
- **Buffers optimisés** : Pour les proxies

Votre application sera accessible en HTTPS avec une sécurité de niveau production ! 🚀