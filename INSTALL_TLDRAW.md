# Installing tldraw

There's an npm permissions issue preventing automatic installation. Please run these commands manually:

## Fix npm permissions:
```bash
sudo chown -R $(whoami) ~/.npm
```

## Install tldraw:
```bash
npm install tldraw --legacy-peer-deps
```

## Verify installation:
```bash
npm list tldraw
```

After installation, restart your Next.js dev server.

