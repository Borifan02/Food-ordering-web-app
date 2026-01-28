# Production Deployment Guide

## Environment Setup

### Required Environment Variables
```bash
# Production .env
NODE_ENV=production
PORT=5000
Mongo_URL=mongodb+srv://your_production_db_connection
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
STRIPE_SECRET_KEY=sk_live_your_live_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_key
CLIENT_URL=https://yourdomain.com
```

### Security Checklist
- [x] Rate limiting implemented
- [x] Helmet security headers
- [x] CORS properly configured
- [x] Strong JWT secret (32+ characters)
- [x] Input validation
- [ ] SSL/HTTPS certificate
- [ ] Environment variables secured

### Performance Optimizations
- [x] Socket.IO for real-time updates
- [x] Database indexing
- [x] Image optimization
- [ ] CDN integration
- [ ] Caching layer (Redis)
- [ ] Load balancing

### Monitoring & Logging
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Database monitoring
- [ ] Uptime monitoring

## Deployment Steps

### 1. Server Setup (Ubuntu/CentOS)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt-get install nginx
```

### 2. Application Deployment
```bash
# Clone repository
git clone your-repo-url
cd your-app

# Install dependencies
npm run install-all

# Build frontend
cd frontend && npm run build

# Start with PM2
pm2 start backend/index.js --name "foodie-api"
pm2 startup
pm2 save
```

### 3. Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL Certificate (Let's Encrypt)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Cost Estimation (Monthly)

### Basic Setup
- **VPS Server**: $20-50 (DigitalOcean/Linode)
- **MongoDB Atlas**: $25-100 (M10 cluster)
- **Domain**: $10-15/year
- **SSL Certificate**: Free (Let's Encrypt)

### Enhanced Setup
- **Load Balancer**: $10-20
- **CDN**: $5-20 (CloudFlare)
- **Monitoring**: $25-50 (New Relic/DataDog)
- **Backup Storage**: $5-15

**Total Monthly Cost**: $85-270

## Scaling Considerations

### Database Scaling
- MongoDB sharding for large datasets
- Read replicas for better performance
- Connection pooling

### Application Scaling
- Horizontal scaling with load balancer
- Microservices architecture
- Caching layer (Redis)

### Infrastructure Scaling
- Auto-scaling groups
- Container orchestration (Docker/Kubernetes)
- CDN for static assets

## Maintenance Tasks

### Daily
- Monitor server resources
- Check error logs
- Verify backup completion

### Weekly
- Update dependencies
- Review performance metrics
- Security patch updates

### Monthly
- Database optimization
- Cost analysis
- Performance review