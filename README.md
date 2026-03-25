Web del club ciclista feta amb Next.js.

## Executar en local

```bash
npm install
npm run dev
```

Obri:

```bash
http://localhost:3000
```

## Base de dades

El projecte usa SQLite.

- En local: `dev.db`
- En Railway: `DATABASE_URL=file:/app/data/dev.db`

Si Railway detecta l'entorn i no tens `DATABASE_URL` definit, l'app intenta usar automàticament `/app/data/dev.db`.

## Desplegament en Railway

- Crea un `Volume`
- Munta'l a `/app/data`
- Defineix `DATABASE_URL=file:/app/data/dev.db`

## Producció local

```bash
npm run build
npm run start
```
