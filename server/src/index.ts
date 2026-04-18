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

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── CORS whitelist ────────────────────────────────────────────────
// CORS_ORIGINS is a comma-separated list, e.g. "https://spk-cup.com,https://admin.spk-cup.com".
// Empty list = same-origin only. In development (NODE_ENV !== 'production') we fall back
// to allowing all origins so local tooling keeps working without extra config.
const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = IS_PROD
  ? {
      origin: (origin, cb) => {
        // Allow same-origin (no Origin header) and whitelisted origins
        if (!origin || corsOrigins.includes(origin)) return cb(null, true);
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
  const url = `/uploads/logos/${req.file.filename}`;
  res.json({ url });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/settings', settingsRoutes);

async function startServer() {
  try {
    // Verificar conexión a la base de datos
    const connected = await checkConnection();
    if (!connected) {
      console.error('No se pudo conectar a la base de datos. Iniciando sin DB...');
    } else {
      console.log('Conexión a PostgreSQL establecida.');
      // Ejecutar migraciones pendientes
      await runMigrations();
      console.log('Migraciones ejecutadas correctamente.');
    }
  } catch (error) {
    console.error('Error durante la inicialización de la base de datos:', error);
  }

  // Serve frontend production build
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Error handler (must be registered after all routes)
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Servidor SPK-CUP corriendo en puerto ${PORT}`);
  });
}

startServer();

export default app;
