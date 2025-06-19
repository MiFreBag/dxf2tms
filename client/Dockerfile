# ---- Build-Stage ----
FROM node:18-alpine AS builder

# Arbeitsverzeichnis
WORKDIR /app

# Nur die Lockfiles kopieren (aus dem client-Verzeichnis!)
COPY package.json package-lock.json ./

# Dependencies sauber installieren
RUN npm ci

# Rest des Quellcodes aus dem client-Verzeichnis
COPY . .

# Produktion-Build
RUN npm run build

# ---- Production-Stage ----
FROM nginx:stable-alpine AS production

# Statisches Build ins nginx-Verzeichnis kopieren
COPY --from=builder /app/dist /usr/share/nginx/html

# Port freigeben
EXPOSE 80

# nginx im Vordergrund starten
CMD ["nginx", "-g", "daemon off;"]
