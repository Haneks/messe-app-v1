#!/bin/bash

# Script de configuration SSL pour l'application Messe (Version corrigée)
# Usage: ./setup-ssl-fixed.sh votre-domaine.com votre-email@example.com

set -e

DOMAIN=${1:-"votre-domaine.com"}
EMAIL=${2:-"votre-email@example.com"}

echo "🔧 Configuration SSL pour le domaine: $DOMAIN"
echo "📧 Email: $EMAIL"

# Vérifier les paramètres
if [ "$DOMAIN" = "votre-domaine.com" ] || [ "$EMAIL" = "votre-email@example.com" ]; then
    echo "❌ Erreur: Veuillez fournir un vrai domaine et email"
    echo "Usage: ./setup-ssl-fixed.sh mondomaine.com mon-email@example.com"
    exit 1
fi

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé."
    exit 1
fi

# Forcer l'utilisation de Docker Compose V2 (plugin)
echo "🔧 Installation/Mise à jour de Docker Compose V2..."
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Utiliser exclusivement Docker Compose V2
COMPOSE_CMD="docker compose"

echo "✅ Utilisation de: $COMPOSE_CMD"

# Vérifier que Docker Compose V2 fonctionne
if ! $COMPOSE_CMD version &> /dev/null; then
    echo "❌ Docker Compose V2 ne fonctionne pas correctement"
    echo "🔧 Tentative de réparation..."
    
    # Supprimer l'ancienne version si elle existe
    sudo apt-get remove -y docker-compose || true
    
    # Réinstaller le plugin
    sudo apt-get install -y docker-compose-plugin
    
    if ! $COMPOSE_CMD version &> /dev/null; then
        echo "❌ Impossible de faire fonctionner Docker Compose"
        exit 1
    fi
fi

# Créer les répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p ssl

# Sauvegarder et modifier les fichiers de configuration
echo "🔄 Configuration du domaine..."

# Créer une version modifiée de nginx-https.conf
cat > nginx-https-temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Configuration des logs
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Optimisations de performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Compression gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Redirection HTTP vers HTTPS
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;
        
        # Challenge Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Redirection HTTPS
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }

    # Configuration HTTPS
    server {
        listen 443 ssl http2;
        server_name $DOMAIN www.$DOMAIN;

        # Certificats SSL
        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

        # Headers de sécurité HTTPS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline'; connect-src 'self' https://api.aelf.org" always;

        # Proxy vers l'application
        location / {
            proxy_pass http://liturgy-app:80;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header X-Forwarded-Host \$host;
            proxy_set_header X-Forwarded-Port \$server_port;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            
            # Buffers
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }

        # Cache pour les assets statiques
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            proxy_pass http://liturgy-app:80;
            proxy_set_header Host \$host;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

mv nginx-https-temp.conf nginx-https.conf

# Créer une version modifiée de docker-compose.prod.yml
cat > docker-compose-temp.yml << EOF
services:
  liturgy-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: messe-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    networks:
      - liturgy-network

  nginx-proxy:
    image: nginx:alpine
    container_name: nginx-https-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-https.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt/live/haneks.ddns.net/:/etc/letsencrypt/live/haneks.ddns.net/
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - liturgy-app
    networks:
      - liturgy-network
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    container_name: certbot
    volumes:
      - /etc/letsencrypt/live/haneks.ddns.net/:/etc/letsencrypt/live/haneks.ddns.net/
      - ./certbot/www:/var/www/certbot
    command: certonly --webroot -w /var/www/certbot --force-renewal --email $EMAIL -d $DOMAIN --agree-tos
    profiles:
      - ssl-setup

networks:
  liturgy-network:
    driver: bridge
EOF

mv docker-compose-temp.yml docker-compose.prod.yml

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
$COMPOSE_CMD -f docker-compose.prod.yml down 2>/dev/null || true

# Construire l'image
echo "🔨 Construction de l'image..."
$COMPOSE_CMD -f docker-compose.prod.yml build liturgy-app

# Démarrer l'application sans SSL d'abord
echo "🚀 Démarrage de l'application..."
$COMPOSE_CMD -f docker-compose.prod.yml up -d liturgy-app nginx-proxy

# Attendre que Nginx soit prêt
echo "⏳ Attente du démarrage de Nginx (30 secondes)..."
sleep 30

# Vérifier que l'application répond
echo "🔍 Vérification de l'application..."
for i in {1..5}; do
    if curl -f http://localhost:80 > /dev/null 2>&1; then
        echo "✅ Application accessible"
        break
    fi
    echo "⏳ Tentative $i/5..."
    sleep 10
done

# Obtenir le certificat SSL
echo "🔒 Obtention du certificat SSL..."
if $COMPOSE_CMD -f docker-compose.prod.yml --profile ssl-setup run --rm certbot; then
    echo "✅ Certificat SSL obtenu avec succès"
    
    # Redémarrer Nginx avec SSL
    echo "🔄 Redémarrage avec SSL..."
    $COMPOSE_CMD -f docker-compose.prod.yml restart nginx-proxy
    
    # Configuration du renouvellement automatique
    echo "⚙️ Configuration du renouvellement automatique..."
    cat > renew-ssl.sh << EOF
#!/bin/bash
cd "\$(dirname "\$0")"
$COMPOSE_CMD -f docker-compose.prod.yml run --rm certbot renew
$COMPOSE_CMD -f docker-compose.prod.yml restart nginx-proxy
EOF
    
    chmod +x renew-ssl.sh
    
    # Ajouter au crontab (renouvellement tous les 3 mois)
    (crontab -l 2>/dev/null; echo "0 3 1 */3 * $(pwd)/renew-ssl.sh") | crontab -
    
    echo "✅ Configuration SSL terminée !"
    echo "🌐 Votre site est maintenant accessible en HTTPS sur: https://$DOMAIN"
    echo "🔄 Le certificat se renouvellera automatiquement tous les 3 mois"
    
else
    echo "❌ Échec de l'obtention du certificat SSL"
    echo "📋 Vérifications nécessaires:"
    echo "   1. Le domaine $DOMAIN pointe-t-il vers ce serveur ?"
    echo "   2. Les ports 80 et 443 sont-ils ouverts ?"
    echo "   3. Y a-t-il un autre service sur le port 80/443 ?"
    
    echo "📋 Logs Certbot:"
    $COMPOSE_CMD -f docker-compose.prod.yml logs certbot
    
    exit 1
fi

# Vérifier le statut final
echo "📊 Statut des conteneurs:"
$COMPOSE_CMD -f docker-compose.prod.yml ps

echo "🎉 Déploiement terminé avec succès !"