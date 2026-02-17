#!/bin/bash
# Free Backup Strategy - Only backup data, not entire instance
# Run this weekly on your Lightsail instance

set -e

BACKUP_DIR="/var/backups/pelangi"
DATE=$(date +%Y%m%d)

echo "=== Free Backup Strategy ==="
echo "Date: $(date)"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Backup Database (PostgreSQL dump)
echo "📦 Backing up database..."
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database-$DATE.sql"
gzip "$BACKUP_DIR/database-$DATE.sql"
echo "✅ Database backed up: database-$DATE.sql.gz"

# 2. Backup WhatsApp session files
echo "📦 Backing up WhatsApp session..."
tar -czf "$BACKUP_DIR/whatsapp-session-$DATE.tar.gz" \
    /var/www/pelangi/RainbowAI/auth/ \
    /var/www/pelangi/RainbowAI/.rainbow-kb/ 2>/dev/null || true
echo "✅ WhatsApp session backed up"

# 3. Backup uploaded files/objects
echo "📦 Backing up uploaded files..."
if [ -d "/var/www/pelangi/server/Storage/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads-$DATE.tar.gz" \
        /var/www/pelangi/server/Storage/uploads/
    echo "✅ Uploads backed up"
else
    echo "⚠️  No uploads directory found"
fi

# 4. Backup .env files (important!)
echo "📦 Backing up configuration..."
tar -czf "$BACKUP_DIR/config-$DATE.tar.gz" \
    /var/www/pelangi/server/.env \
    /var/www/pelangi/RainbowAI/.env \
    /var/www/pelangi/ecosystem.config.cjs 2>/dev/null || true
echo "✅ Configuration backed up"

# 5. Keep only last 4 backups (delete old ones)
echo "🧹 Cleaning old backups..."
cd "$BACKUP_DIR"
ls -t database-*.sql.gz 2>/dev/null | tail -n +5 | xargs -r rm
ls -t whatsapp-session-*.tar.gz 2>/dev/null | tail -n +5 | xargs -r rm
ls -t uploads-*.tar.gz 2>/dev/null | tail -n +5 | xargs -r rm
ls -t config-*.tar.gz 2>/dev/null | tail -n +5 | xargs -r rm

# Show backup size
echo ""
echo "=== Backup Summary ==="
du -sh "$BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -n +2

echo ""
echo "✅ Backup complete"
echo "Location: $BACKUP_DIR"
echo ""
echo "To restore:"
echo "  Database:  gunzip -c database-$DATE.sql.gz | psql \$DATABASE_URL"
echo "  WhatsApp:  tar -xzf whatsapp-session-$DATE.tar.gz -C /"
echo "  Uploads:   tar -xzf uploads-$DATE.tar.gz -C /"
