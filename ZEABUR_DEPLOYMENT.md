# Zeabur Deployment Guide for PelangiManager

## ✅ Setup Complete

Your project is now configured for Zeabur deployment with:
- ✅ Zeabur MCP server installed in Claude Desktop
- ✅ `zbpack.json` configuration (single-service deployment)
- ✅ Node.js 20.x specified in `package.json`
- ✅ PORT configuration verified in `server/index.ts`

## 🚀 Deployment Options

### Option 1: Deploy via Claude Code (MCP)

Since you have the Zeabur MCP server installed, you can deploy directly from Claude Code:

```
Claude, deploy this project to Zeabur
```

The MCP server will handle:
- Project creation
- Service deployment
- Environment variable configuration
- Domain setup

### Option 2: Deploy via Zeabur Dashboard

1. **Login to Zeabur**: https://zeabur.com/dashboard
2. **Create New Project**: Click "New Project"
3. **Connect Repository**:
   - Link your GitHub/GitLab repository
   - Or use CLI to deploy from local
4. **Automatic Detection**: Zeabur will detect Node.js and configure automatically
5. **Add PostgreSQL Service** (Optional):
   - In the same project, click "Add Service"
   - Select "PostgreSQL" from templates
   - DATABASE_URL will be automatically available to your app

### Option 3: Deploy via Zeabur CLI

```bash
# Install Zeabur CLI
npm install -g @zeabur/cli

# Login
zeabur auth login

# Deploy
zeabur deploy
```

## 🔧 Required Environment Variables

Configure these in your Zeabur service settings:

### Essential Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | Secure random string for sessions | `your-secure-random-string-here` |
| `DATABASE_URL` | PostgreSQL connection string | Auto-set when using Zeabur PostgreSQL |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | For email notifications |
| `SENDGRID_FROM_EMAIL` | Sender email address |
| `GOOGLE_CLIENT_ID` | For Google OAuth login |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth login |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL |

## 📦 What Happens During Deployment

1. **Build Phase** (`npm run build`):
   - Vite builds React frontend → `dist/client`
   - esbuild bundles Express backend → `dist/index.js`

2. **Start Phase** (`npm start`):
   - Single Node.js process serves both frontend and API
   - Express serves static files from `dist/client`
   - API endpoints available at `/api/*`

3. **Health Check**:
   - Zeabur monitors `/health` endpoint
   - Returns storage type (database or memory) and status

## 🗄️ Database Setup

### Using Zeabur PostgreSQL (Recommended)

1. In your Zeabur project, click "Add Service"
2. Search for "PostgreSQL" and select official template
3. PostgreSQL deploys in ~30 seconds
4. `DATABASE_URL` automatically available to your app via private networking
5. Your app will automatically use database storage instead of in-memory

### Connection String Format
```
postgresql://username:password@hostname:port/database
```

Zeabur exposes this via `${POSTGRES_CONNECTION_STRING}` variable.

## 🌐 Domain Configuration

After deployment, Zeabur provides:
- **Default Domain**: `your-service-name.zeabur.app`
- **Custom Domain**: Add via dashboard → Domains tab

## 📊 Monitoring & Logs

Access via Zeabur Dashboard:
- **Deployment Logs**: Real-time build and deployment output
- **Runtime Logs**: Application console output (console.log, errors)
- **Metrics**: CPU, Memory, Network usage

## 🔐 Security Checklist

- [ ] Set strong `SESSION_SECRET` (min 32 characters)
- [ ] Update default admin password after first login
- [ ] Configure CORS if needed for external clients
- [ ] Use environment variables for all secrets (never commit)
- [ ] Enable HTTPS (automatic with Zeabur domains)

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version matches `engines` in `package.json`
- Verify all dependencies are in `package.json` (not just devDependencies)
- Check build logs for specific errors

### App Won't Start
- Verify `PORT` environment variable is respected
- Check runtime logs for startup errors
- Ensure database migrations run successfully

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Ensure services are in same project (for private networking)

### Performance Issues
- Monitor memory usage (increase if needed)
- Check for database connection leaks
- Review slow query logs

## 📚 Additional Resources

- [Zeabur Documentation](https://zeabur.com/docs)
- [Node.js Deployment Guide](https://zeabur.com/docs/en-US/guides/nodejs)
- [PostgreSQL Setup](https://zeabur.com/templates/B20CX0)
- [Environment Variables](https://zeabur.com/docs/en-US/deploy/variables)

## 🎯 Next Steps

1. **Generate SESSION_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Push to Git** (if not already):
   ```bash
   git add .
   git commit -m "feat: configure Zeabur deployment"
   git push
   ```

3. **Deploy via your preferred method** (MCP, Dashboard, or CLI)

4. **Add PostgreSQL service** to your Zeabur project

5. **Configure environment variables** in Zeabur dashboard

6. **Test deployment** by visiting your Zeabur URL

---

*Deployment configured on 2026-01-28*
