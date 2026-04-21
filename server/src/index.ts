import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { checkConnection, runMigrations } from './config/database';
import { ensureReady as ensurePushReady } from './services/push.service';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth.routes';
import tournamentRoutes from './routes/tournament.routes';
import teamRoutes from './routes/team.routes';
import matchRoutes from './routes/match.routes';
import settingsRoutes from './routes/settings.routes';
import userRoutes from './routes/user.routes';
import pushRoutes from './routes/push.routes';
import adminRoutes from './routes/admin.routes';

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
// JSON body limit raised so team / tournament payloads can carry a
// base64-encoded logo (up to ~10 MB raw → ~14 MB encoded plus room for
// other fields).
app.use(express.json({ limit: '20mb' }));

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

// File upload endpoint — stores the image inline as a base64 data URL
// instead of writing to disk. Railway's default filesystem is ephemeral
// (wiped on every redeploy) so disk storage silently lost every upload.
// Data URLs live in Postgres (logo / cover_image are TEXT columns) so
// images survive deploys and Postgres restarts.
//
// Accept any MIME starting with `image/` — phones upload HEIC/HEIF, PCs
// send PNG/JPEG/WEBP/GIF, design tools export SVG, and occasionally the
// platform sends `application/octet-stream` (we validate that by falling
// back to the file extension).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    // Some mobile browsers / mail clients strip the MIME — fall back to
    // the extension so the upload isn't rejected for a benign reason.
    const ext = path.extname(file.originalname).toLowerCase();
    const imageExts = [
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.gif',
      '.svg',
      '.bmp',
      '.avif',
      '.heic',
      '.heif',
    ];
    cb(null, imageExts.includes(ext));
  },
});

/** Best-effort MIME inference from the original filename when the client sent a generic one. */
function mimeFromFilename(name: string): string | null {
  const ext = path.extname(name).toLowerCase();
  switch (ext) {
    case '.png':  return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif':  return 'image/gif';
    case '.svg':  return 'image/svg+xml';
    case '.bmp':  return 'image/bmp';
    case '.avif': return 'image/avif';
    case '.heic': return 'image/heic';
    case '.heif': return 'image/heif';
    default:      return null;
  }
}

app.post('/api/upload/logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No se proporcionó un archivo de imagen válido' });
    return;
  }
  const mime =
    req.file.mimetype && req.file.mimetype !== 'application/octet-stream'
      ? req.file.mimetype
      : mimeFromFilename(req.file.originalname) || 'image/jpeg';
  const base64 = req.file.buffer.toString('base64');
  const url = `data:${mime};base64,${base64}`;
  res.json({ url });
});

// Document upload — PDF (used for player identity documents). Same
// base64-in-Postgres strategy as images since Railway's FS is ephemeral.
// 10 MB cap so people can't dump full scanned folders into a TEXT column.
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ext === '.pdf');
  },
});

app.post('/api/upload/document', documentUpload.single('document'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'Se requiere un archivo PDF válido' });
    return;
  }
  const base64 = req.file.buffer.toString('base64');
  const url = `data:application/pdf;base64,${base64}`;
  res.json({ url });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);

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
      // Resolve / generate / persist VAPID keys right after migrations so
      // app_config exists. Safe to call before any request comes in;
      // getVapidPublicKey() / sendToAll() use the cached pair.
      await ensurePushReady();
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
