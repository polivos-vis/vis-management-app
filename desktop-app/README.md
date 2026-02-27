# INSAIDEM Desktop MVP

This desktop wrapper opens the tasks-focused UI at `/desktop` from your existing frontend.

## Run locally

1. Start backend (`http://localhost:3001`)
2. Start frontend (`http://localhost:3000`)
3. Run desktop app:

```bash
cd desktop-app
npm install
npm run start:local
```

## Build installers

```bash
cd desktop-app
npm install
npm run dist:mac    # macOS: dmg + zip
npm run dist:win    # Windows: nsis + zip
```

Artifacts are generated in `desktop-app/release`.

## Publish download links in web app

Set these variables in frontend production:

- `VITE_DESKTOP_MAC_URL`
- `VITE_DESKTOP_WIN_URL`

Then redeploy frontend so the download CTA points to real installers.

## Session behavior

- Login is email/password from your existing auth API.
- Session is persisted in Electron's `persist:insaidem-desktop` partition.
- User must log out to be prompted for credentials again.
