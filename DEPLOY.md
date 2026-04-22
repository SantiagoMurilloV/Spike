# Deploy — Vercel (frontend) + Railway (backend + Postgres)

Este proyecto tiene dos servicios:

- **Frontend** — React + Vite + PWA → Vercel
- **Backend** — Express + Postgres + uploads en disco → Railway

Vercel corre funciones serverless, lo cual no encaja bien con el Express persistente y el disco de uploads. Railway, en cambio, corre el backend como proceso normal y te da Postgres con un click. Es el camino pragmático.

---

## 1. Subir el backend a Railway

1. Entra a <https://railway.app>, crea un proyecto nuevo → **Deploy from GitHub repo** → elige `SantiagoMurilloV/Spike`.
2. En el servicio que crea, abre **Settings**:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. Añade el plugin de base de datos: **+ New → Database → Add PostgreSQL**. Railway inyecta automáticamente la variable `DATABASE_URL` en tu servicio.
4. En **Variables**, añade:

   | Nombre                 | Valor                                                                                          |
   | ---------------------- | ---------------------------------------------------------------------------------------------- |
   | `NODE_ENV`             | `production`                                                                                   |
   | `JWT_SECRET`           | ≥16 caracteres aleatorios (`openssl rand -hex 32`)                                             |
   | `CORS_ORIGINS`         | la URL de Vercel (después del paso 2)                                                          |
   | `PUBLIC_URL`           | URL pública de Railway, ej. `https://spk-cup-api.up.railway.app`                               |
   | `SUPER_ADMIN_USERNAME` | opcional, default `superadmin`                                                                 |
   | `SUPER_ADMIN_PASSWORD` | **obligatorio en prod**, ≥8 chars con letra y número. Se lee una sola vez para crear la cuenta |

   > `DATABASE_URL`, `PORT` y `RAILWAY_STATIC_URL` los inyecta Railway solo.
   >
   > El super administrador se crea automáticamente al primer boot. Una vez creado podés borrar
   > `SUPER_ADMIN_PASSWORD` de Railway — la cuenta sigue existiendo. Para cambiar la contraseña,
   > usá el flujo desde la misma app.

5. Railway construye, corre las migraciones (lo hace el mismo backend al bootear) y te da una URL pública tipo `https://spk-cup-api.up.railway.app`. **Guarda esa URL.**

### Verificar

```bash
curl https://spk-cup-api.up.railway.app/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## 2. Subir el frontend a Vercel

1. Entra a <https://vercel.com> → **Add New → Project** → importa `SantiagoMurilloV/Spike`.
2. Vercel detecta Vite automáticamente. Verifica:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (el repo root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. **Antes del primer deploy**, abre `vercel.json` en el repo (está en la raíz) y reemplaza `REPLACE_WITH_RAILWAY_URL` por el host de Railway del paso anterior (sin `https://`, solo el host):

   ```jsonc
   {
     "rewrites": [
       { "source": "/api/:path*",     "destination": "https://spk-cup-api.up.railway.app/api/:path*" },
       { "source": "/uploads/:path*", "destination": "https://spk-cup-api.up.railway.app/uploads/:path*" }
     ]
   }
   ```

   Commit + push. Vercel re-deploya automáticamente.

4. Vercel te da una URL tipo `https://spk-cup.vercel.app`.

### Cerrar el circuito: actualizar CORS_ORIGINS

Vuelve a Railway → Variables y pon en `CORS_ORIGINS` **la URL que te dio Vercel**:

```
CORS_ORIGINS=https://spk-cup.vercel.app
```

Railway redeploya el backend. Ya pueden hablar.

---

## 3. Opcional: dominio personalizado

- En Vercel, **Settings → Domains**, añade `tu-dominio.com`.
- En Railway, **Settings → Domains**, añade `api.tu-dominio.com` (o usa el subdominio que quieras).
- Actualiza `CORS_ORIGINS` y `vercel.json` con los dominios finales.

---

## 4. Datos iniciales

La primera vez que Railway arranca el backend, corre todas las migraciones (incluida `005_team_delete_cascades.sql`) y el seed si existe. Si quieres cargar datos de demo:

```bash
# Conéctate a la DB de Railway con el cliente psql o cualquier GUI
# y corre el SQL que tengas preparado.
```

---

## 5. Checklist antes de lanzar

- [ ] `DATABASE_URL` creada por el plugin de Postgres en Railway
- [ ] `JWT_SECRET` con ≥ 16 chars aleatorios
- [ ] `NODE_ENV=production` en Railway
- [ ] `CORS_ORIGINS` apunta al dominio Vercel (y al dominio custom si aplica)
- [ ] `PUBLIC_URL` apunta al dominio Railway
- [ ] `vercel.json` con el host Railway real (no `REPLACE_WITH_...`)
- [ ] `curl /api/health` del backend responde 200
- [ ] Abrir el frontend en Vercel → Login admin → crear torneo → funciona

## Troubleshooting

| Síntoma                                              | Causa probable                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| Frontend carga pero `/api/*` da 404                  | `vercel.json` no tiene el host Railway correcto                       |
| Backend responde 500 con `CORS: origin X not allowed`| `CORS_ORIGINS` no incluye la URL de Vercel                            |
| Login funciona pero 2ª request da 401                | El frontend no está mandando el `Authorization`. Limpia localStorage. |
| Uploads guardan pero las imágenes dan 404            | `PUBLIC_URL` mal configurado, o olvidaste el rewrite `/uploads/*`     |
| Cold start de 2–5s en Railway free                   | Normal en free tier. Upgrade a Hobby si es problema.                  |
