#!/bin/bash
# Setup Free Weekly Backups (no AWS snapshots needed)
# Run this once on your Lightsail instance

set -e

echo "=== Setting Up Free Weekly Backups ==="

# Install PostgreSQL client (for pg_dump)
echo "Installing PostgreSQL client..."
sudo apt update
sudo apt install -y postgresql-client

# Copy backup script
sudo cp backup-free.sh /usr/local/bin/backup-free
sudo chmod +x /usr/local/bin/backup-free

# Get database URL from .env (try multiple locations)
if [ -f /var/www/pelangi/.env ]; then
    DB_URL=$(grep DATABASE_URL /var/www/pelangi/.env | cut -d= -f2-)
elif [ -f /var/www/pelangi/RainbowAI/.env ]; then
    DB_URL=$(grep DATABASE_URL /var/www/pelangi/RainbowAI/.env | cut -d= -f2-)
else
    echo "❌ ERROR: Cannot find DATABASE_URL in .env files"
    echo "Checked locations:"
    echo "  - /var/www/pelangi/.env"
    echo "  - /var/www/pelangi/RainbowAI/.env"
    exit 1
fi

# Create environment file for cron
sudo tee /etc/cron.d/pelangi-backup > /dev/null <<EOF
# Pelangi Free Backup - Every Sunday at 2 AM
DATABASE_URL=$DB_URL
0 2 * * 0 root /usr/local/bin/backup-free >> /var/log/pelangi-backup.log 2>&1
EOF

# Create log file
sudo touch /var/log/pelangi-backup.log
sudo chmod 644 /var/log/pelangi-backup.log

echo "✅ Cron job configured"
echo ""

# Test backup now
echo "Testing backup..."
read -p "Run test backup now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    export DATABASE_URL="$DB_URL"
    sudo -E /usr/local/bin/backup-free
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Schedule: Every Sunday at 2:00 AM"
echo "Location: /var/backups/pelangi/"
echo "Retention: Last 4 backups (1 month)"
echo "Cost: $0/month (stored on Lightsail)"
echo ""
echo "Useful commands:"
echo "  View logs:      sudo tail -f /var/log/pelangi-backup.log"
echo "  Manual backup:  sudo /usr/local/bin/backup-free"
echo "  List backups:   ls -lh /var/backups/pelangi/"
echo ""
echo "💡 Download backups to your PC regularly using download-backups.sh"
