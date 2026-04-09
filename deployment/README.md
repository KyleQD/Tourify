# 🚀 Tourify Deployment Guide

This guide covers deploying Tourify to both demo and production environments.

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Access to your Supabase project
- Domain names configured (optional but recommended)

## 🏗️ Quick Deployment

### 1. Initial Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd tourify-beta-K2

# Make deployment script executable
chmod +x scripts/deploy.sh

# Run initial setup
./scripts/deploy.sh setup
```

### 2. Configure Environment Variables

#### Production Environment
Edit `deployment/production.env`:
```bash
# Update these values with your actual configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
SESSION_SECRET=your_session_secret
```

#### Demo Environment
Edit `deployment/demo.env`:
```bash
# Same Supabase configuration as production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
SESSION_SECRET=your_session_secret
```

### 3. Deploy Applications

#### Deploy Production
```bash
./scripts/deploy.sh deploy production
```

#### Deploy Demo
```bash
./scripts/deploy.sh deploy demo
```

## 🎯 Deployment Commands

### Basic Commands
```bash
# Deploy to production (default)
./scripts/deploy.sh deploy

# Deploy to demo environment
./scripts/deploy.sh deploy demo

# Build only (no deployment)
./scripts/deploy.sh build production
./scripts/deploy.sh build demo

# Start application
./scripts/deploy.sh start production
./scripts/deploy.sh start demo

# Stop application
./scripts/deploy.sh stop production
./scripts/deploy.sh stop demo

# Restart application
./scripts/deploy.sh restart production
./scripts/deploy.sh restart demo

# Check status
./scripts/deploy.sh status production
./scripts/deploy.sh status demo

# View logs
./scripts/deploy.sh logs production
./scripts/deploy.sh logs demo
```

### Help
```bash
./scripts/deploy.sh help
```

## 🌐 Domain Configuration

### Vercel: keep demo + apex on the same app (simplest)

If CI deploys **one** Vercel project (see [`.github/README.md`](../.github/README.md)):

1. In that project → **Domains**, attach **`tourify.live`** and **`www.tourify.live`** (and keep **`demo.tourify.live`**).
2. Remove `tourify.live` from any older project (e.g. waitlist) so DNS resolves to this app.
3. Set **Production** env `NEXT_PUBLIC_SITE_URL` to your canonical URL.
4. Run **`npm run verify:ci`** locally before merging to `main` to match GitHub CI.

Optional: enable the separate **Deploy Production** workflow only when you use a **second** Vercel project ID (`VERCEL_PROJECT_ID_PRODUCTION`).

### Production Domain
- **Domain**: `tourify.live`
- **Port**: 3000
- **URL**: `https://tourify.live`

### Demo Domain
- **Domain**: `demo.tourify.live`
- **Port**: 3001
- **URL**: `https://demo.tourify.live`

## 🔧 Environment Differences

### Production Features
- Full feature set enabled
- Real authentication
- Complete data persistence
- Performance optimizations
- Analytics enabled
- Full file upload support

### Demo Features
- Demo mode banner
- Limited data persistence
- Demo user creation
- Reduced rate limits
- Demo tour available
- Data reset functionality

## 📊 Monitoring & Logs

### Log Locations
- **Production**: `logs/production.log`
- **Demo**: `logs/demo.log`

### Health Checks
```bash
# Check production health
curl https://tourify.live/api/health

# Check demo health
curl https://demo.tourify.live/api/health
```

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next
rm -rf node_modules
npm install
./scripts/deploy.sh build production
```

#### Port Conflicts
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001

# Kill conflicting processes
kill -9 <PID>
```

#### Environment Issues
```bash
# Verify environment files
ls -la deployment/
cat deployment/production.env
cat deployment/demo.env
```

### Performance Optimization

#### Production Optimizations
- Enable Redis caching
- Configure CDN
- Enable compression
- Optimize images
- Enable monitoring

#### Demo Optimizations
- Reduced data limits
- Faster session timeouts
- Limited file uploads
- Demo-specific features

## 🔒 Security Considerations

### Production Security
- HTTPS enforcement
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection

### Demo Security
- Limited functionality
- Demo data isolation
- Session timeouts
- No real payments
- Demo user restrictions

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Multiple instances
- Database connection pooling
- Redis clustering

### Vertical Scaling
- Memory optimization
- CPU optimization
- Database optimization
- Asset optimization

## 🚀 Advanced Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t tourify .

# Run production
docker run -p 3000:3000 --env-file deployment/production.env tourify

# Run demo
docker run -p 3001:3000 --env-file deployment/demo.env tourify
```

### PM2 Deployment
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "tourify-production" -- start
pm2 start npm --name "tourify-demo" -- start
```

## 📞 Support

For deployment issues:
1. Check logs: `./scripts/deploy.sh logs production`
2. Verify environment: `cat deployment/production.env`
3. Check status: `./scripts/deploy.sh status production`
4. Review this documentation

## 🎉 Success Indicators

### Production Success
- ✅ Application accessible at `https://tourify.live`
- ✅ Health check returns 200
- ✅ All features working
- ✅ Performance metrics good
- ✅ No errors in logs

### Demo Success
- ✅ Application accessible at `https://demo.tourify.live`
- ✅ Demo banner visible
- ✅ Demo features working
- ✅ Data resets properly
- ✅ No production data affected
