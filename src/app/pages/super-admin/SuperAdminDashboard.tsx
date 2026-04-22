import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Trophy,
  Shield,
  UserPlus,
  Trash2,
  Loader2,
  RefreshCw,
  Pencil,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  type PlatformStats,
  type PlatformUser,
  type CreatePlatformUserDto,
} from '../../services/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

/**
 * Super-admin platform console. Shows the 3 global counters (tournaments,
 * teams, users by role) and a users table with inline role + quota editing
 * and a create / delete flow.
 *
 * Everything here goes through `/api/platform/*` endpoints which are
 * gated by `requireRole('super_admin')` on the backend. A regular admin
 * who somehow lands here gets 401s and sees an error state.
 */
export function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, u] = await Promise.all([api.getPlatformStats(), api.listPlatformUsers()]);
      setStats(s);
      setUsers(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la plataforma');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const admins = useMemo(() => users.filter((u) => u.role === 'admin'), [users]);

  const handleCreate = async (dto: CreatePlatformUserDto) => {
    const created = await api.createPlatformUser(dto);
    setUsers((prev) => [created, ...prev]);
    reload(); // refresh stats too
    toast.success('Usuario creado');
  };

  const handleUpdate = async (
    id: string,
    patch: { role?: PlatformUser['role']; tournamentQuota?: number; displayName?: string },
  ) => {
    const updated = await api.updatePlatformUser(id, patch);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    toast.success('Usuario actualizado');
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await api.deletePlatformUser(pendingDeleteId);
      setUsers((prev) => prev.filter((u) => u.id !== pendingDeleteId));
      reload();
      setPendingDeleteId(null);
      toast.success('Usuario eliminado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-spk-red" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6 text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={reload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-spk-red text-white rounded-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            PANEL DE PLATAFORMA
          </h1>
          <p className="text-black/60">
            Vista global del sistema. Creá, editá y borrá usuarios de toda la plataforma.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          <span
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}
            className="uppercase font-bold"
          >
            Crear Usuario
          </span>
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Trophy className="w-5 h-5 text-spk-red" />}
            label="Torneos"
            value={stats.tournaments}
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-spk-blue" />}
            label="Equipos únicos"
            value={stats.teams}
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-spk-blue" />}
            label="Jugadoras"
            value={stats.players}
          />
          <StatCard
            icon={<Shield className="w-5 h-5 text-spk-red" />}
            label="Usuarios totales"
            value={stats.users.total}
            breakdown={[
              { label: 'Super', value: stats.users.super_admin },
              { label: 'Admin', value: stats.users.admin },
              { label: 'Juez', value: stats.users.judge },
            ]}
          />
        </div>
      )}

      {/* Users table */}
      <div className="bg-white border border-black/10 rounded-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/10 bg-black/[0.03]">
          <h2
            className="text-base sm:text-lg font-bold uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
          >
            Usuarios ({users.length})
          </h2>
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.04] text-black/60">
              <tr>
                <Th>Usuario</Th>
                <Th>Rol</Th>
                <Th>Cupo de torneos</Th>
                <Th>Torneos creados</Th>
                <Th>Creado por</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-black/[0.02]">
                  <Td>
                    <div className="font-bold">{u.username}</div>
                    {u.displayName && (
                      <div className="text-xs text-black/50">{u.displayName}</div>
                    )}
                  </Td>
                  <Td>
                    <RoleBadge role={u.role} />
                  </Td>
                  <Td>{u.role === 'admin' ? u.tournamentQuota : '—'}</Td>
                  <Td>{u.ownedTournamentsCount}</Td>
                  <Td>
                    {u.createdBy
                      ? users.find((other) => other.id === u.createdBy)?.username ?? '—'
                      : '—'}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => setEditing(u)}
                        aria-label={`Editar ${u.username}`}
                        className="p-2 bg-spk-blue/10 text-spk-blue rounded-sm hover:bg-spk-blue/20"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(u.id)}
                        aria-label={`Eliminar ${u.username}`}
                        className="p-2 bg-spk-red/10 text-spk-red rounded-sm hover:bg-spk-red/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden divide-y divide-black/5">
          {users.map((u) => (
            <div key={u.id} className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{u.username}</span>
                  <RoleBadge role={u.role} />
                </div>
                <div className="text-xs text-black/60 mt-1 space-y-0.5">
                  {u.role === 'admin' && (
                    <div>
                      Torneos {u.ownedTournamentsCount}/{u.tournamentQuota}
                    </div>
                  )}
                  {u.createdBy && (
                    <div>
                      Creado por:{' '}
                      {users.find((other) => other.id === u.createdBy)?.username ?? '—'}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditing(u)}
                  aria-label={`Editar ${u.username}`}
                  className="p-2 bg-spk-blue/10 text-spk-blue rounded-sm"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPendingDeleteId(u.id)}
                  aria-label={`Eliminar ${u.username}`}
                  className="p-2 bg-spk-red/10 text-spk-red rounded-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {createOpen && (
        <CreateUserModal
          admins={admins}
          onClose={() => setCreateOpen(false)}
          onCreate={async (dto) => {
            await handleCreate(dto);
            setCreateOpen(false);
          }}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          admins={admins}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await handleUpdate(editing.id, patch);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Eliminar usuario"
        description="Esta acción no se puede deshacer. Los torneos que haya creado quedarán huérfanos (accesibles solo para el super admin)."
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ── Internals ──────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  breakdown,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  breakdown?: { label: string; value: number }[];
}) {
  return (
    <div className="bg-white border border-black/10 rounded-sm p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-black/60">
        {icon}
        {label}
      </div>
      <div
        className="mt-2 text-3xl sm:text-4xl font-bold tabular-nums"
        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
      >
        {value}
      </div>
      {breakdown && (
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-black/60">
          {breakdown.map((b) => (
            <span
              key={b.label}
              className="inline-flex items-center gap-1 bg-black/[0.04] px-2 py-0.5 rounded-full"
            >
              <span>{b.label}</span>
              <span className="font-bold">{b.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    super_admin: 'bg-spk-red/10 text-spk-red border-spk-red/30',
    admin: 'bg-spk-blue/10 text-spk-blue border-spk-blue/30',
    judge: 'bg-black/5 text-black/70 border-black/20',
  };
  const label =
    role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Juez';
  const cls = colors[role] ?? 'bg-black/5 text-black/60 border-black/20';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border rounded-full text-[10px] uppercase font-bold tracking-wider ${cls}`}
      style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
    >
      {label}
    </span>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
    >
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

// ── Create user modal ─────────────────────────────────────────────

function CreateUserModal({
  admins,
  onClose,
  onCreate,
}: {
  admins: PlatformUser[];
  onClose: () => void;
  onCreate: (dto: CreatePlatformUserDto) => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<CreatePlatformUserDto['role']>('admin');
  const [displayName, setDisplayName] = useState('');
  const [quota, setQuota] = useState(1);
  const [createdBy, setCreatedBy] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const dto: CreatePlatformUserDto = {
        username: username.trim(),
        password,
        role,
        displayName: displayName.trim() || undefined,
        tournamentQuota: role === 'admin' ? quota : undefined,
        createdBy: role === 'judge' ? createdBy || null : undefined,
      };
      await onCreate(dto);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al crear usuario',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-sm shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto my-4">
        <div className="sticky top-0 bg-white border-b border-black/10 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2
            className="text-lg sm:text-xl font-bold"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            CREAR USUARIO
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 hover:bg-black/5 rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4" noValidate>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
              {error}
            </div>
          )}

          <Field label="Usuario">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              required
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>
          <Field label="Contraseña (mín. 8, letras + números)">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>
          <Field label="Rol">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CreatePlatformUserDto['role'])}
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red bg-white"
            >
              <option value="admin">Admin · organiza torneos</option>
              <option value="judge">Juez · arbitra partidos</option>
              <option value="super_admin">Super admin · plataforma</option>
            </select>
          </Field>
          <Field label="Nombre visible (opcional)">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>
          {role === 'admin' && (
            <Field label="Cupo de torneos">
              <input
                type="number"
                min={0}
                value={quota}
                onChange={(e) => setQuota(Math.max(0, parseInt(e.target.value || '0', 10)))}
                className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
              />
              <p className="text-xs text-black/50 mt-1">
                Cantidad máxima de torneos que este admin puede crear.
              </p>
            </Field>
          )}
          {role === 'judge' && (
            <Field label="Admin propietario (opcional)">
              <select
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red bg-white"
              >
                <option value="">Sin admin (juez de plataforma)</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.username}
                  </option>
                ))}
              </select>
              <p className="text-xs text-black/50 mt-1">
                El juez solo verá los partidos en vivo de los torneos de este admin.
              </p>
            </Field>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-black/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="sm:flex-none px-4 py-2.5 bg-black/5 hover:bg-black/10 rounded-sm font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm font-bold uppercase inline-flex items-center justify-center gap-2"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  admins,
  onClose,
  onSave,
}: {
  user: PlatformUser;
  admins: PlatformUser[];
  onClose: () => void;
  onSave: (patch: {
    role?: PlatformUser['role'];
    tournamentQuota?: number;
    displayName?: string;
  }) => Promise<void>;
}) {
  const [role, setRole] = useState(user.role);
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [quota, setQuota] = useState(user.tournamentQuota);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        role: role as PlatformUser['role'],
        displayName: displayName.trim() || undefined,
        tournamentQuota: role === 'admin' ? quota : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-sm shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto my-4">
        <div className="sticky top-0 bg-white border-b border-black/10 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2
            className="text-lg sm:text-xl font-bold"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            EDITAR {user.username.toUpperCase()}
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 hover:bg-black/5 rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4" noValidate>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
              {error}
            </div>
          )}
          <Field label="Rol">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red bg-white"
            >
              <option value="admin">Admin</option>
              <option value="judge">Juez</option>
              <option value="super_admin">Super admin</option>
            </select>
          </Field>
          <Field label="Nombre visible">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>
          {role === 'admin' && (
            <Field label="Cupo de torneos">
              <input
                type="number"
                min={0}
                value={quota}
                onChange={(e) => setQuota(Math.max(0, parseInt(e.target.value || '0', 10)))}
                className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
              />
              <p className="text-xs text-black/50 mt-1">
                Torneos actualmente creados por este admin: {user.ownedTournamentsCount}.
              </p>
            </Field>
          )}

          {/* Placeholder for future: changing a judge's owning admin */}
          {role === 'judge' && user.createdBy && (
            <div className="text-xs text-black/50">
              Creado por:{' '}
              {admins.find((a) => a.id === user.createdBy)?.username ?? '—'}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-black/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="sm:flex-none px-4 py-2.5 bg-black/5 hover:bg-black/10 rounded-sm font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm font-bold uppercase inline-flex items-center justify-center gap-2"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-xs font-bold uppercase mb-1.5 text-black/70"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
