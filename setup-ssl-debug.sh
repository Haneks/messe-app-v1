#!/bin/bash

# Script de débogage SSL pour l'application Messe
# Usage: ./setup-ssl-debug.sh votre-domaine.com votre-email@example.com

set -e

DOMAIN=${1:-"haneks.ddns.net"}
EMAIL=${2:-"haneks55@gmail.com"}

echo "🔧 Configuration SSL DEBUG pour le domaine: $DOMAIN"
echo "📧 Email: $EMAIL"

# Vérifier les paramètres
if [ "$DOMAIN" = "votre-domaine.com" ] || [ "$EMAIL" = "votre-email@example.com" ]; then
    echo "❌ Erreur: Veuillez fournir un vrai domaine et email"
    echo "Usage: ./setup-ssl-debug.sh mondomaine.com mon-email@example.com"
    exit 1
fi

# Forcer l'utilisation de Docker Compose V2
COMPOSE_CMD="docker compose"

# Vérifier que Docker Compose V2 fonctionne
if ! $COMPOSE_CMD version &> /dev/null; then
    echo "❌ Docker Compose V2 ne fonctionne pas"
    echo "🔧 Installation de Docker Compose V2..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# Créer les répertoires avec les bonnes permissions
echo "📁 Création des répertoires avec permissions..."
sudo mkdir -p certbot/conf
sudo mkdir -p certbot/www
sudo mkdir -p ssl
sudo chown -R $USER:$USER certbot/
sudo chmod -R 755 certbot/

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
$COMPOSE_CMD -f docker-compose.prod.yml down 2>/dev/null || true

# Nettoyer les anciens certificats
echo "🧹 Nettoyage des anciens certificats..."
sudo rm -rf certbot/conf/live/$DOMAIN 2>/dev/null || true
sudo rm -rf certbot/conf/archive/$DOMAIN 2>/dev/null || true
sudo rm -rf certbot/conf/renewal/$DOMAIN.conf 2>/dev/null || true

# Créer une configuration Nginx temporaire sans SSL
echo "🔧 Configuration Nginx temporaire (HTTP seulement)..."
cat > nginx-temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;
        
        # Challenge Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
            try_files \$uri =404;
        }
        
        # Application
        location / {
            proxy_pass http://liturgy-app:80;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

# Créer un docker-compose temporaire
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
    container_name: nginx-temp-proxy
    ports:
      - "80:80"
    volumes:
      - ./nginx-temp.conf:/etc/nginx/nginx.conf:ro
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
      - ./certbot/conf:/etc/letsencrypt:rw
      - ./certbot/www:/var/www/certbot:rw
    command: certonly --webroot -w /var/www/certbot --email $EMAIL -d $DOMAIN --agree-tos --non-interactive --verbose
    profiles:
      - ssl-setup

networks:
  liturgy-network:
    driver: bridge
EOF

# Démarrer avec la configuration temporaire
echo "🚀 Démarrage avec configuration temporaire..."
$COMPOSE_CMD -f docker-compose-temp.yml up -d liturgy-app nginx-proxy

# Attendre que Nginx soit prêt
echo "⏳ Attente du démarrage de Nginx..."
sleep 15

# Vérifier que l'application répond
echo "🔍 Vérification de l'application..."
if ! curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "❌ L'application ne répond pas sur le port 80"
    $COMPOSE_CMD -f docker-compose-temp.yml logs --tail=20
    exit 1
fi

# Tester l'accès au domaine
echo "🌐 Test de l'accès au domaine..."
if ! curl -f "http://$DOMAIN" > /dev/null 2>&1; then
    echo "⚠️  Le domaine $DOMAIN ne pointe pas vers ce serveur"
    echo "   Test avec nslookup:"
    nslookup $DOMAIN || true
    echo "   IP de ce serveur:"
    curl -s ifconfig.me || curl -s ipinfo.io/ip || true
    echo ""
    read -p "   Continuer quand même ? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Obtenir le certificat SSL
echo "🔒 Obtention du certificat SSL..."
if $COMPOSE_CMD -f docker-compose-temp.yml --profile ssl-setup run --rm certbot; then
    echo "✅ Certificat SSL obtenu avec succès"
    
    # Vérifier que les certificats existent
    echo "🔍 Vérification des certificats..."
    if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ] && [ -f "certbot/conf/live/$DOMAIN/privkey.pem" ]; then
        echo "✅ Certificats trouvés:"
        ls -la certbot/conf/live/$DOMAIN/
        
        # Vérifier les permissions
        echo "🔍 Permissions des certificats:"
        sudo ls -la certbot/conf/live/$DOMAIN/
        
        # Corriger les permissions si nécessaire
        echo "🔧 Correction des permissions..."
        sudo chown -R root:root certbot/conf/
        sudo chmod -R 644 certbot/conf/live/$DOMAIN/*.pem
        sudo chmod 600 certbot/conf/live/$DOMAIN/privkey.pem
        
    else
        echo "❌ Certificats non trouvés"
        echo "📋 Contenu du répertoire certbot:"
        find certbot/ -type f -name "*.pem" 2>/dev/null || echo "Aucun fichier .pem trouvé"
        exit 1
    fi
    
    # Arrêter la configuration temporaire
    echo "🛑 Arrêt de la configuration temporaire..."
    $COMPOSE_CMD -f docker-compose-temp.yml down
    
    # Créer la configuration HTTPS finale
    echo "🔧 Configuration HTTPS finale..."
    cat > nginx-https-final.conf << EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    # Optimisations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    server_tokens off;

    # Compression gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # Configuration SSL
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
        ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;

        # Headers de sécurité
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
            
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            
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

    # Créer le docker-compose final
    cat > docker-compose-final.yml << EOF
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
      - ./nginx-https-final.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - liturgy-app
    networks:
      - liturgy-network
    restart: unless-stopped

networks:
  liturgy-network:
    driver: bridge
EOF

    # Démarrer avec HTTPS
    echo "🚀 Démarrage avec HTTPS..."
    $COMPOSE_CMD -f docker-compose-final.yml up -d
    
    # Attendre et tester
    echo "⏳ Test HTTPS..."
    sleep 10
    
    if curl -k -f "https://$DOMAIN" > /dev/null 2>&1; then
        echo "✅ HTTPS fonctionne !"
        echo "🌐 Site accessible sur: https://$DOMAIN"
    else
        echo "❌ Problème HTTPS"
        echo "📋 Logs Nginx:"
        $COMPOSE_CMD -f docker-compose-final.yml logs nginx-proxy
    fi
    
    # Configuration du renouvellement
    echo "⚙️ Configuration du renouvellement automatique..."
    cat > renew-ssl.sh << EOF
#!/bin/bash
cd "\$(dirname "\$0")"
$COMPOSE_CMD -f docker-compose-final.yml run --rm -v ./certbot/conf:/etc/letsencrypt:rw -v ./certbot/www:/var/www/certbot:rw certbot/certbot renew
$COMPOSE_CMD -f docker-compose-final.yml restart nginx-proxy
EOF
    
    chmod +x renew-ssl.sh
    
    echo "✅ Configuration SSL terminée !"
    echo "🌐 Site: https://$DOMAIN"
    echo "🔄 Renouvellement: ./renew-ssl.sh"
    
else
    echo "❌ Échec de l'obtention du certificat SSL"
    echo "📋 Logs Certbot:"
    $COMPOSE_CMD -f docker-compose-temp.yml logs certbot
    exit 1
fi

# Nettoyer les fichiers temporaires
rm -f nginx-temp.conf docker-compose-temp.yml

echo "📊 Statut final:"
$COMPOSE_CMD -f docker-compose-final.yml ps