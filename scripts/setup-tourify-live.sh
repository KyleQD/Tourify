#!/bin/bash

# 🌍 Tourify.live Production Setup Script
# This script configures your server for https://tourify.live deployment

set -e

echo "🎵 Setting up Tourify.live Production Environment"
echo "================================================"

# Configuration
DOMAIN="tourify.live"
APP_DIR="/var/www/tourify"
SERVICE_NAME="tourify-live"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Don't run this script as root. Use a user with sudo privileges."
        exit 1
    fi
}

# Install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    # Update system
    sudo apt update && sudo apt upgrade -y
    
    # Install essential packages
    sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
    # Install Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    
    # Install PM2 for process management
    sudo npm install -g pm2
    
    # Install Caddy for reverse proxy and SSL
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update && sudo apt install -y caddy
    
    # Install Docker (optional, for container deployment)
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
    
    print_success "Dependencies installed successfully!"
}

# Setup application directory
setup_app_directory() {
    print_status "Setting up application directory..."
    
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    print_success "Application directory created: $APP_DIR"
}

# Configure Caddy for SSL and reverse proxy
setup_caddy() {
    print_status "Configuring Caddy for tourify.live..."
    
    # Create Caddyfile
    sudo tee /etc/caddy/Caddyfile > /dev/null << EOF
# Tourify.live Production Configuration
tourify.live {
    reverse_proxy localhost:3000
    
    # Enable compression
    encode gzip
    
    # Security headers
    header {
        # Enable XSS protection
        X-XSS-Protection "1; mode=block"
        
        # Prevent MIME type sniffing
        X-Content-Type-Options "nosniff"
        
        # Enable clickjacking protection
        X-Frame-Options "DENY"
        
        # Enable HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # CSP header for additional security
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https: wss:; media-src 'self' https:;"
    }
    
    # Handle static files efficiently
    @static {
        path /_next/static/*
        path /favicon.ico
        path /robots.txt
        path /sitemap.xml
    }
    
    handle @static {
        header Cache-Control "public, max-age=31536000, immutable"
        reverse_proxy localhost:3000
    }
    
    # Handle API routes
    handle /api/* {
        reverse_proxy localhost:3000
    }
    
    # Handle all other routes
    handle {
        reverse_proxy localhost:3000
    }
}

# Redirect www to non-www
www.tourify.live {
    redir https://tourify.live{uri} permanent
}
EOF
    
    # Enable and start Caddy
    sudo systemctl enable caddy
    sudo systemctl restart caddy
    
    print_success "Caddy configured for automatic SSL on tourify.live!"
}

# Create production environment file
create_env_file() {
    print_status "Creating production environment file..."
    
    cat > $APP_DIR/.env.production << EOF
# Tourify.live Production Configuration
NODE_ENV=production
DOMAIN=https://tourify.live
NEXT_PUBLIC_SITE_URL=https://tourify.live
PORT=3000

# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=https://auqddrodjezjlypkzfpi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Performance Configuration
CACHE_TTL=3600
MAX_CONCURRENT_USERS=10000
SESSION_SECRET=$(openssl rand -base64 32)

# Optional: Redis for caching (install separately)
# REDIS_URL=redis://localhost:6379

# Security
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_REQUESTS_PER_HOUR=1000

# File Upload
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,audio/mpeg,audio/wav

# Feature Flags
ENABLE_REAL_TIME_CHAT=true
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_SOCIAL_SHARING=true
EOF
    
    print_warning "Don't forget to update the Supabase keys in $APP_DIR/.env.production"
    print_success "Environment file created!"
}

# Setup PM2 ecosystem file
setup_pm2() {
    print_status "Setting up PM2 process manager..."
    
    cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    cwd: '$APP_DIR',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/$SERVICE_NAME-error.log',
    out_file: '/var/log/pm2/$SERVICE_NAME-out.log',
    log_file: '/var/log/pm2/$SERVICE_NAME.log',
    time: true,
    autorestart: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: 10000
  }]
};
EOF
    
    # Create log directory
    sudo mkdir -p /var/log/pm2
    sudo chown $USER:$USER /var/log/pm2
    
    print_success "PM2 ecosystem configured!"
}

# Create deployment script
create_deploy_script() {
    print_status "Creating deployment script..."
    
    cat > $APP_DIR/deploy.sh << 'EOF'
#!/bin/bash

# Tourify.live Deployment Script
echo "🚀 Deploying Tourify.live..."

# Change to app directory
cd /var/www/tourify

# Pull latest changes
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Restart application with PM2
pm2 restart ecosystem.config.js

# Reload Caddy configuration
sudo systemctl reload caddy

echo "✅ Deployment complete! Tourify.live is updated."
echo "🌍 Live at: https://tourify.live"
EOF
    
    chmod +x $APP_DIR/deploy.sh
    
    print_success "Deployment script created at $APP_DIR/deploy.sh"
}

# Setup firewall
setup_firewall() {
    print_status "Configuring firewall..."
    
    sudo ufw --force enable
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    print_success "Firewall configured!"
}

# Display final instructions
show_final_instructions() {
    print_success "🎉 Tourify.live server setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Point your tourify.live domain DNS to this server's IP"
    echo "2. Clone your repository to $APP_DIR"
    echo "3. Update Supabase keys in $APP_DIR/.env.production"
    echo "4. Run the deployment:"
    echo ""
    echo "   cd $APP_DIR"
    echo "   git clone <your-repo-url> ."
    echo "   npm install"
    echo "   npm run build"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 startup"
    echo "   pm2 save"
    echo ""
    echo "🌍 Your site will be live at: https://tourify.live"
    echo "📊 Health check: https://tourify.live/api/health"
    echo "🎵 Discovery page: https://tourify.live/discover"
    echo ""
    echo "For future deployments, just run: $APP_DIR/deploy.sh"
}

# Main execution
main() {
    echo "Starting tourify.live production setup..."
    
    check_root
    install_dependencies
    setup_app_directory
    setup_caddy
    create_env_file
    setup_pm2
    create_deploy_script
    setup_firewall
    show_final_instructions
}

# Run main function
main "$@" 