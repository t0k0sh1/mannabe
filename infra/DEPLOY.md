# VPS deploy (manual, blue/green)

Production shape: **nginx** → **two** Next.js processes on **127.0.0.1:3001** and **127.0.0.1:3002**. One slot is **live**; the other is **idle** for the next release.

## One-command flow

On the server (after SSH), run the sketch in [`deploy.sh`](./deploy.sh) — adapt paths, user, and nginx include to your host.

Summary:

1. Determine **idle** port (opposite of the current live port; persist in e.g. `/var/lib/mannabe/active-slot`).
2. `git pull` (or unpack release) into the app directory.
3. `pnpm install --frozen-lockfile` and `pnpm build`.
4. Apply **Drizzle** migrations when needed (`pnpm db:migrate` or your production command), using **backward-compatible** SQL if old and new binaries overlap.
5. Start the **idle** service with `PORT=<idle>` and `HOSTNAME=127.0.0.1` (systemd unit or equivalent).
6. Wait for `GET http://127.0.0.1:<idle>/healthz` → **200**.
7. Update nginx **upstream** to the idle port and `nginx -s reload`.
8. After a short drain, **SIGTERM** the previous live process.

## Environment

Set on the server (not in Git):

- `DATABASE_URL` — native Postgres on the VPS
- `BETTER_AUTH_SECRET` — long random secret
- `BETTER_AUTH_URL` — public `https://…` origin
- `NEXT_PUBLIC_APP_URL` — same public origin as above

## systemd

Provide **two** units (e.g. `mannabe@3001.service` and `mannabe@3002.service`) or one template unit with `PORT` in the instance name. Ensure **`ExecStart`** runs `next start` (or `node server.js` if using standalone output) with the correct `PORT`.

## Notes

- Keep **GitHub Actions** for CI only unless you add a gated deploy workflow later.
- First-time server setup (TLS certs, Postgres roles, firewall) is outside this sketch.
