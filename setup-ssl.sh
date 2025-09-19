#!/bin/bash

# Script de configuration SSL pour l'application Messe
# Usage: ./setup-ssl.sh votre-domaine.com votre-email@example.com

set -e

DOMAIN=${1:-"votre-domaine.com"}
EMAIL=${2:-"votre-email@example.com"}

echo "🔧 Configuration SSL pour le domaine: $DOMAIN"
echo "📧 Email: $EMAIL"

# Vérifier que Docker et Docker Compose sont installés
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Créer les répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p ssl

# Remplacer le domaine dans les fichiers de configuration
echo "🔄 Configuration du domaine..."
sed -i "s/votre-domaine\.com/$DOMAIN/g" nginx-https.conf
sed -i "s/votre-email@example\.com/$EMAIL/g" docker-compose.prod.yml
sed -i "s/votre-domaine\.com/$DOMAIN/g" docker-compose.prod.yml

# Démarrer l'application sans SSL d'abord
echo "🚀 Démarrage de l'application..."
docker-compose -f docker-compose.prod.yml up -d liturgy-app nginx-proxy

# Attendre que Nginx soit prêt
echo "⏳ Attente du démarrage de Nginx..."
sleep 10

# Obtenir le certificat SSL
echo "🔒 Obtention du certificat SSL..."
docker-compose -f docker-compose.prod.yml --profile ssl-setup run --rm certbot

# Redémarrer Nginx avec SSL
echo "🔄 Redémarrage avec SSL..."
docker-compose -f docker-compose.prod.yml restart nginx-proxy

# Configuration du renouvellement automatique
echo "⚙️ Configuration du renouvellement automatique..."
cat > renew-ssl.sh << EOF
#!/bin/bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx-proxy
EOF

chmod +x renew-ssl.sh

# Ajouter au crontab (renouvellement tous les 3 mois)
(crontab -l 2>/dev/null; echo "0 3 1 */3 * $(pwd)/renew-ssl.sh") | crontab -

echo "✅ Configuration SSL terminée !"
echo "🌐 Votre site est maintenant accessible en HTTPS sur: https://$DOMAIN"
echo "🔄 Le certificat se renouvellera automatiquement tous les 3 mois"

# Vérifier le statut
echo "📊 Statut des conteneurs:"
docker-compose -f docker-compose.prod.yml ps