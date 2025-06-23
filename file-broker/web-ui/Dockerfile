# Multi-stage build für optimierte Production-Images

# Build Stage
FROM node:18-alpine AS builder

# Arbeitsverzeichnis setzen
WORKDIR /app

# System-Dependencies installieren
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Package files kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm ci --only=production --silent

# Source Code kopieren
COPY . .

# Build-Argumente für Environment
ARG VITE_API_BASE_URL=/api
ARG VITE_WS_URL=/ws
ARG VITE_APP_VERSION
ARG VITE_BUILD_DATE

# Environment Variables setzen
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV