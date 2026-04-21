import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { checkConnection, runMigrations } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth.routes';
import tournamentRoutes from './routes/tournament.routes';
import teamRoutes from './routes/team.routes';
import matchRoutes from './routes/match.routes';
import settingsRoutes from './routes/settings.routes';
import userRoutes from './routes/user.routes';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── CORS whitelist ────────────────────────────────────────────────
// Accepts three buckets of origins, in order:
//   1. Anything in the explicit `CORS_ORIGINS` env var (comma-separated).
//   2. Any `https://*.vercel.app` origin — we deploy the frontend there
//      and Vercel rotates preview URLs per deployment. Hardcoding each
//      one is painful, so we trust the whole subdomain family.
//   3. In non-production (`NODE_ENV !== 'production'`), everything.
// Requests without an Origin header (same-origin, curl, server-to-server)
// are always allowed.
const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/** Returns true when the origin looks like `https://<anything>.vercel.app`. */
function isVercelOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

const corsOptions: cors.CorsOptions = IS_PROD
  ? {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, true);
        if (isVercelOrigin(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(express.json());

// Auth middleware — protects POST/PUT/DELETE (except login)
app.use(authMiddleware);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve uploaded files with path-traversal guard ───────────────
// We resolve the requested file against the uploads root and refuse to serve
// anything that would escape it via "..", absolute paths, or symlinks.
const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');
// Ensure the directory exists to avoid 500s on first run
fs.mkdirSync(path.join(UPLOADS_ROOT, 'logos'), { recursive: true });

app.get('/uploads/*', (req: Request, res: Response, next: NextFunction) => {
  try {
    const requested = req.params[0] ?? '';
    // Reject any request that contains a null byte or looks like a URL
    if (requested.includes('\0')) {
      return res.status(400).send('Invalid path');
    }

    const safePath = path.resolve(UPLOADS_ROOT, requested);
    // Confirm the resolved path is inside UPLOADS_ROOT
    if (!safePath.startsWith(UPLOADS_ROOT + path.sep) && safePath !== UPLOADS_ROOT) {
      return res.status(403).send('Forbidden');
    }

    // Resolve symlinks and re-check containment
    fs.realpath(safePath, (err, realPath) => {
      if (err) return res.status(404).send('Not found');
      if (!realPath.startsWith(UPLOADS_ROOT + path.sep) && realPath !== UPLOADS_ROOT) {
        return res.status(403).send('Forbidden');
      }
      res.sendFile(realPath, (sendErr) => {
        if (sendErr) next(sendErr);
      });
    });
  } catch (err) {
    next(err);
  }
});

// File upload endpoint
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../uploads/logos')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});
app.post('/api/upload/logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No se proporcionó un archivo válido' });
    return;
  }
  // PUBLIC_URL lets Railway expose absolute URLs so the Vercel-hosted
  // frontend can load images from the backend origin. Falls back to a
  // relative path in local dev (proxied by Vite).
  const publicBase = process.env.PUBLIC_URL?.replace(/\/$/, '') ?? '';
  const url = `${publicBase}/uploads/logos/${req.file.filename}`;
  res.json({ url });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);

// Error handler — must be last. Registering it up here (outside startServer)
// ensures it catches errors even if boot-time migration fails.
app.use(errorHandler);

async function startServer() {
  try {
    const connected = await checkConnection();
    if (!connected) {
      console.error('No se pudo conectar a la base de datos. Iniciando sin DB...');
    } else {
      console.log('Conexión a PostgreSQL establecida.');
      await runMigrations();
      console.log('Migraciones ejecutadas correctamente.');
    }
  } catch (error) {
    console.error('Error durante la inicialización de la base de datos:', error);
  }

  app.listen(PORT, () => {
    console.log(`Servidor SPK-CUP corriendo en puerto ${PORT}`);
  });
}

// In Vercel / Lambda-like environments we'd skip listen() and export app;
// Railway runs this as a long-lived process so we always boot.
startServer();

export default app;
