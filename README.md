# Dmitry Kovalov — Portfolio Site

Personal DevOps business card website with a retro 80s sci-fi terminal aesthetic.

## Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript — no frameworks, no dependencies
- **Animations**: Canvas 2D API (radar, UFOs, comets, welding effects)
- **Container**: Docker + nginx:alpine
- **Reverse proxy**: nginx on host → Docker container (port 8080)
- **CI/CD**: GitHub Actions — push to `main` → auto-deploy to VPS
- **DNS & HTTPS**: Cloudflare

## Project structure

```
src/
├── index.html       # Entry point
├── css/style.css    # All styles
└── js/main.js       # Canvas animations, UI logic, window controls
```

## Local development

Open `src/index.html` directly in a browser — no build step required.

## Deployment

Push to `main`. GitHub Actions copies files to the VPS via SCP, then SSH rebuilds the Docker container.

Secrets required in GitHub repository settings:
- `SSH_HOST` — VPS IP address
- `SSH_PRIVATE_KEY` — deploy private key

## Docker

```bash
docker compose up --build
```

Site is served at `http://localhost:8080`.
