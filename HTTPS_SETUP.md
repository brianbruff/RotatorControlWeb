# HTTPS Setup with Nginx

This configuration adds HTTPS support to RotatorControlWeb using Nginx as a reverse proxy with self-signed certificates.

## Features

- HTTPS access on port 8443
- Self-signed SSL certificates
- Nginx reverse proxy with proper WebSocket support for real-time updates
- Secure session handling

## Quick Start

1. The self-signed certificates are already included in the `certs/` directory
2. Start the services:
   ```bash
   docker compose up -d
   ```
3. Access the application at: https://localhost:8443

## Certificate Warning

Since we're using self-signed certificates, your browser will show a security warning. This is expected. You can safely proceed by:
- Chrome/Edge: Click "Advanced" → "Proceed to localhost (unsafe)"
- Firefox: Click "Advanced" → "Accept the Risk and Continue"

## Configuration

- HTTPS port: 8443 (configured in docker-compose.yml)
- Application port: 3000 (internal, not exposed)
- Certificates location: `./certs/`

## Generating New Certificates

If you need to generate new self-signed certificates:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/selfsigned.key \
  -out certs/selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Using Your Own Certificates

To use certificates from a Certificate Authority:
1. Replace `certs/selfsigned.crt` with your certificate
2. Replace `certs/selfsigned.key` with your private key
3. Restart the containers

## Architecture

```
[Browser] --HTTPS:8443--> [Nginx] --HTTP:3000--> [RotatorControlWeb]
```

Nginx handles:
- SSL termination
- Reverse proxying
- WebSocket upgrade for Server-Sent Events (SSE)
- Proper header forwarding