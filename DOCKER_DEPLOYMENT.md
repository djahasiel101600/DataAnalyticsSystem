# Docker Deployment

This deployment runs the React/Vite frontend and Django API in one container.
The app is stateless on the server: there is no database, uploaded-file
directory, or server-side dataset volume. Dataset and saved-session data are
kept in the user's browser storage.

## Requirements

On the Ubuntu Server, install Docker Engine and the Docker Compose plugin. The
existing Cloudflare Tunnel container must be running and connected to the
externally managed `jdp-network` Docker network.

## Transfer the project

On the server, clone this repository or transfer the project source, including
the root `Dockerfile`, `compose.yaml`, and the `backend/` and `frontend/`
directories. Do not transfer `node_modules`, virtual environments, build
outputs, or local `.env` files.

## Configure production environment

Run these commands on the Ubuntu Server from the project root:

```bash
cp .env.example .env
openssl rand -base64 48
chmod 600 .env
```

Edit `.env`:

- Set `DJANGO_SECRET_KEY` to the generated random value.
- Set `DJANGO_ALLOWED_HOSTS` to the exact public hostname configured for the
  Cloudflare route (hostnames only, comma-separated; no scheme).
- Set `DJANGO_CSRF_TRUSTED_ORIGINS` to the corresponding HTTPS origin(s),
  including the scheme.
- Keep `DJANGO_DEBUG=0` and `DJANGO_SECURE_SSL_REDIRECT=1`.
- Set `OPENAI_API_KEY` only if the AI operation should be enabled.
- Set the optional `VITE_GOOGLE_*` identifiers before building if Google Drive
  import is required. They are browser-visible configuration, not secrets.

If configuring Google Drive import, also add the public hostname to the
authorized JavaScript origins in the Google Cloud project and restrict the API
key to the required Google APIs and domains.

## Verify the existing network and deploy

All commands in this section run on the Ubuntu Server:

```bash
docker network inspect jdp-network
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
```

The Compose file references `jdp-network` as an external network. It will fail
if that network does not already exist; it will not create or replace the
network or Cloudflare Tunnel. The app container publishes no host ports.

Check the app's health status:

```bash
docker inspect --format='{{.State.Health.Status}}' data-analytics-system
docker compose logs --tail=100 data-analytics-system
```

The health endpoint is available only inside the Docker network at
`http://data-analytics-system:8090/api/health/`.

## Configure Cloudflare Tunnel

In the Cloudflare Zero Trust Dashboard, add or update the public hostname route
on the **existing** Tunnel. Set the service/origin to:

```text
http://data-analytics-system:8090
```

This is the only service requiring a public route: it serves both the SPA and
the `/api/` endpoints. Do not add a `cloudflared` Compose service or a host
port mapping. The intended flow is:

```text
Internet -> Cloudflare -> existing Tunnel -> jdp-network -> data-analytics-system:8090
```

The Django allowed-host setting must include the public hostname that the
Tunnel forwards in the HTTP `Host` header. Django trusts the proxy's
`X-Forwarded-Proto` header to identify HTTPS requests. Keep Cloudflare's public
hostname set to HTTPS. HSTS is off by default; enable it only after confirming
the hostname is consistently HTTPS.

## Operations and updates

Run on the Ubuntu Server from the project root:

```bash
docker compose logs -f data-analytics-system
docker compose restart data-analytics-system
docker compose down
git pull
docker compose build --pull
docker compose up -d
```

`docker compose down` removes the app container but leaves the externally
managed `jdp-network` and existing Tunnel untouched.

There are no database migrations or server-side persistent volumes for this
project. User datasets and saved sessions reside in browser storage, so they
are scoped to the browser and public origin. Export important data from the
application before clearing browser storage or changing the public hostname.
Deploying a new container does not back up or migrate browser data.

## Troubleshooting

- **Compose reports that `jdp-network` is missing:** Run
  `docker network ls` and verify the existing Tunnel's network name. Do not
  create a replacement network without coordinating with the server owner.
- **Tunnel reports a connection/DNS error:** Confirm the app container is
  running and healthy, that it is attached to `jdp-network`, and that the
  Dashboard origin is exactly `http://data-analytics-system:8090`.
- **Django returns `DisallowedHost`:** Add the public hostname (without
  `https://`) to `DJANGO_ALLOWED_HOSTS` in `.env`, then run
  `docker compose up -d`.
- **HTTPS redirect loops:** Confirm the request is arriving through the
  Cloudflare Tunnel and that the proxy forwards `X-Forwarded-Proto: https`.
  For diagnosis, inspect Cloudflare/Tunnel and app logs; do not disable
  production host validation or other security settings.
- **Static page loads without styles/scripts:** Check the app health/logs and
  rebuild with `docker compose build --no-cache` so the Vite assets are rebuilt
  and collected by Django/WhiteNoise.
- **AI operation reports an unconfigured key:** Set `OPENAI_API_KEY` in `.env`
  and recreate the service with `docker compose up -d`.
- **Google Drive import is unavailable:** Set the Google Picker/OAuth
  identifiers in `.env`, rebuild the image, and verify authorized JavaScript
  origins and API-key restrictions in Google Cloud.
