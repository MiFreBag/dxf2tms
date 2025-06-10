#!/bin/sh
# Ensure directories exist
mkdir -p /var/www/certbot /etc/letsencrypt
# Start cron in background for certbot renewals if installed
crond
# Start nginx
nginx -g 'daemon off;'
