# kovalov.uk — Dmitry Kovalov

Personal portfolio site with a retro 80s sci-fi terminal aesthetic — and a deliberate DevOps playground. The site itself is plain static HTML/CSS/JS; the interesting part is how it's built, shipped, and run.

**Live:** https://kovalov.uk

## Architecture

```
 git push (src/)
      │
      ▼
 GitHub Actions ── build-image.yml
   1. docker build → push to GHCR (:latest + :<sha>)
   2. SSH as non-root deploy user → kubectl set image :<sha>
      (least-privilege ServiceAccount) → rolling update
      │
      ▼
 Internet → Cloudflare → host nginx → NodePort 30080 → k3s Service → Deployment
 (kovalov.uk)                          (Hetzner VPS)                  2 replicas
                                                                     probes + limits
```

- `kovalov.uk` goes through **Cloudflare**, hits **host nginx** on the Hetzner box, and is proxied into a **single-node k3s** cluster via a NodePort.
- The site runs as a **Kubernetes Deployment** — 2 replicas, readiness/liveness probes, resource requests/limits — behind a **Service**.
- Every `git push` touching `src/` triggers **GitHub Actions**: build the image, push it to **GHCR**, then deploy the immutable `:<sha>` tag to k3s with a **rolling update**, using a **ServiceAccount that can only patch the `web` Deployment** (not cluster-admin).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML / CSS / JS, Canvas 2D animations — no frameworks |
| Container | Docker image (`nginx:alpine` base), stored in GHCR |
| Orchestration | k3s (lightweight Kubernetes) on a Hetzner VPS |
| Edge | Cloudflare (DNS + TLS) → host nginx |
| CI/CD | GitHub Actions → GHCR → `kubectl` rolling update |
| IaC | Kubernetes manifests in `k8s/` |
| OS / hardening | Ubuntu 24.04, key-only SSH, non-root deploy, `PermitRootLogin no`, fail2ban, ufw |

## Repository layout

```
src/                    # the static site (baked into the container image)
  index.html
  css/style.css
  js/main.js
Dockerfile              # image built by CI and pushed to GHCR
nginx.conf              # nginx config baked into the image
k8s/                    # production Kubernetes manifests (applied to k3s)
  web-deployment.yaml   #   Deployment: image, probes, resource limits
  web-service.yaml      #   Service: NodePort 30080
  ci-rbac.yaml          #   least-privilege ServiceAccount for the CI deployer
  local-kind/           # local-dev only — a kind cluster on the laptop
    kind-config.yaml
    web-ingress.yaml
.github/workflows/
  build-image.yml       # CI/CD: build → GHCR → deploy to k3s
docker-compose.yml      # convenience: run the image locally / recovery fallback
```

## Deploy

Push to `main`. If `src/` (or `Dockerfile` / `nginx.conf`) changed, GitHub Actions builds the image, pushes it to GHCR, and rolls it out to k3s — no manual steps.

Secrets (GitHub → Settings → Secrets):
- `SSH_HOST` — server IP
- `SSH_PRIVATE_KEY` — deploy key for the non-root `deploy` user

## Local development

Just the site — open `src/index.html` in a browser (no build step).

Full Kubernetes loop on a laptop with [kind](https://kind.sigs.k8s.io/):
```bash
kind create cluster --name kovalov --config k8s/local-kind/kind-config.yaml
docker build -t kovalov-site:dev .
kind load docker-image kovalov-site:dev --name kovalov
kubectl apply -f k8s/web-deployment.yaml -f k8s/web-service.yaml
```

Or run the container directly:
```bash
docker compose up --build   # served at http://localhost:8080
```

## Notes

This repo doubles as a hands-on DevOps polygon: the aim was to run a real production site the way an engineer would — containerized, orchestrated on Kubernetes, deployed automatically from git, least-privilege, and fully reproducible from source.
