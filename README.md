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

## Fitxers multimèdia (trofeu/equipacions/fotos/gpx)

- Per defecte, les pujades de media es guarden en el mateix volum que la base de dades quan `DATABASE_URL` és un path absolut.
- En Railway amb volum muntat a `/app/data`, les pujades queden en `/app/data/trofeu/uploads`, `/app/data/equipacions/uploads`, `/app/data/fotos/uploads` i `/app/data/gpx/uploads`.
- Si vols forçar un directori específic, pots definir:
  - `TROFEU_MEDIA_DIR=/ruta/persistent/trofeu/uploads`
  - `EQUIPACIONS_MEDIA_DIR=/ruta/persistent/equipacions/uploads`
  - `FOTOS_MEDIA_DIR=/ruta/persistent/fotos/uploads`
  - `GPX_MEDIA_DIR=/ruta/persistent/gpx/uploads`

## Desplegament en Railway

- Crea un `Volume`
- Munta'l a `/app/data`
- Defineix `DATABASE_URL=file:/app/data/dev.db`

## Producció local

```bash
npm run build
npm run start
```
