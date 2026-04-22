import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  X as XIcon,
  Edit3,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  type PlatformUser,
  type CreatePlatformUserDto,
} from '../../services/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

/**
 * Super-admin user management page. Lives on `/super-admin/users` to keep
 * the Dashboard visually clean. Contains:
 *   · a create-user form (role picker dynamically shows quota / parent-admin fields)
 *   · a users table with inline quota edit + delete
 */
export function SuperAdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreatePlatformUserDto>({
    username: '',
    password: '',
    role: 'admin',
    displayName: '',
    tournamentQuota: 1,
    createdBy: null,
  });
  const [creating, setCreating] = useState(false);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [quotaDraft, setQuotaDraft] = useState<Record<string, string>>({});
  const [quotaSaving, setQuotaSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await api.listPlatformUsers();
      setUsers(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const dto: CreatePlatformUserDto = {
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        displayName: form.displayName?.trim() || undefined,
        tournamentQuota:
          form.role === 'admin' ? Number(form.tournamentQuota ?? 1) : undefined,
        createdBy: form.role === 'judge' ? form.createdBy ?? null : null,
      };
      await api.createPlatformUser(dto);
      toast.success(`Usuario ${dto.username} creado`);
      setForm({
        username: '',
        password: '',
        role: 'admin',
        displayName: '',
        tournamentQuota: 1,
        createdBy: null,
      });
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err as Error).message;
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setDeleting(id);
    try {
      await api.deletePlatformUser(id);
      toast.success('Usuario eliminado');
      setPendingDeleteId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
      throw err;
    } finally {
      setDeleting(null);
    }
  };

  const handleQuotaSave = async (id: string) => {
    const raw = quotaDraft[id];
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      toast.error('El cupo debe ser un entero >= 0');
      return;
    }
    setQuotaSaving(id);
    try {
      await api.updatePlatformUser(id, { tournamentQuota: n });
      toast.success('Cupo actualizado');
      setQuotaDraft((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setQuotaSaving(null);
    }
  };

  const admins = users.filter((u) => u.role === 'admin');

  if (loading && users.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-spk-red" aria-hidden="true" />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-6">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          USUARIOS
        </h1>
        <p className="text-black/60">
          Creá, editá y eliminá administradores, jueces y otros super administradores.
        </p>
      </div>

      {/* Create user form */}
      <section className="bg-white border-2 border-black/10 rounded-sm overflow-hidden">
        <div className="bg-black text-white px-4 sm:px-5 py-3">
          <h2
            className="font-bold uppercase text-sm sm:text-base"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          >
            Crear usuario
          </h2>
        </div>
        <form
          onSubmit={handleCreate}
          className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          noValidate
        >
          <Field label="Usuario *">
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Ej: juan.perez"
              autoComplete="off"
              className="w-full px-3 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>
          <Field label="Contraseña *">
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mín 8 chars, con letra y número"
              autoComplete="new-password"
              className="w-full px-3 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>
          <Field label="Nombre visible">
            <input
              type="text"
              value={form.displayName ?? ''}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Opcional"
              className="w-full px-3 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>
          <Field label="Rol *">
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as CreatePlatformUserDto['role'],
                })
              }
              className="w-full px-3 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red bg-white"
            >
              <option value="admin">Administrador de torneos</option>
              <option value="judge">Juez</option>
              <option value="super_admin">Super administrador</option>
            </select>
          </Field>
          {form.role === 'admin' && (
            <Field label="Cupo de torneos">
              <input
                type="number"
                min={0}
                value={form.tournamentQuota ?? 1}
                onChange={(e) =>
                  setForm({ ...form, tournamentQuota: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
              />
            </Field>
          )}
          {form.role === 'judge' && (
            <Field label="Admin dueño del juez">
              <select
                value={form.createdBy ?? ''}
                onChange={(e) =>
                  setForm({ ...form, createdBy: e.target.value || null })
                }
                className="w-full px-3 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red bg-white"
              >
                <option value="">Sin admin (plataforma)</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.username}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <motion.button
              type="submit"
              disabled={creating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-spk-red hover:bg-spk-red-dark text-white rounded-sm font-bold uppercase disabled:opacity-50"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear usuario
            </motion.button>
          </div>
        </form>
      </section>

      {/* Users table */}
      <section className="bg-white border-2 border-black/10 rounded-sm overflow-hidden">
        <div className="bg-black text-white px-4 sm:px-5 py-3">
          <h2
            className="font-bold uppercase text-sm sm:text-base"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          >
            Usuarios ({users.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 border-b-2 border-black/10">
              <tr>
                <Th>Usuario</Th>
                <Th>Rol</Th>
                <Th>Cupo / torneos</Th>
                <Th>Creado por</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const parent = users.find((x) => x.id === u.createdBy);
                const editingQuota = quotaDraft[u.id] !== undefined;
                return (
                  <tr key={u.id} className="hover:bg-black/[0.02]">
                    <Td>
                      <div className="flex flex-col">
                        <span
                          className="font-bold"
                          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                        >
                          {u.username}
                        </span>
                        {u.displayName && (
                          <span className="text-xs text-black/50">{u.displayName}</span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <RoleBadge role={u.role} />
                    </Td>
                    <Td>
                      {u.role === 'admin' ? (
                        editingQuota ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={quotaDraft[u.id]}
                              onChange={(e) =>
                                setQuotaDraft((prev) => ({ ...prev, [u.id]: e.target.value }))
                              }
                              className="w-20 px-2 py-1 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuotaSave(u.id)}
                              disabled={quotaSaving === u.id}
                              aria-label="Guardar cupo"
                              className="p-1.5 bg-spk-win/10 text-spk-win rounded-sm hover:bg-spk-win/20"
                            >
                              {quotaSaving === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setQuotaDraft((prev) => {
                                  const next = { ...prev };
                                  delete next[u.id];
                                  return next;
                                })
                              }
                              aria-label="Cancelar edición"
                              className="p-1.5 bg-black/5 text-black/60 rounded-sm hover:bg-black/10"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums font-medium">
                              {u.ownedTournamentsCount} / {u.tournamentQuota}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setQuotaDraft((prev) => ({
                                  ...prev,
                                  [u.id]: String(u.tournamentQuota),
                                }))
                              }
                              aria-label="Editar cupo"
                              className="p-1 text-black/40 hover:text-spk-red"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </Td>
                    <Td className="text-black/60">
                      {parent ? parent.username : <span className="text-black/30">—</span>}
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(u.id)}
                        disabled={deleting === u.id || isSelf}
                        aria-label={`Eliminar ${u.username}`}
                        title={isSelf ? 'No podés eliminarte a vos mismo' : 'Eliminar usuario'}
                        className="p-2 bg-spk-red/10 text-spk-red rounded-sm hover:bg-spk-red/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {deleting === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(openDialog) => {
          if (!openDialog) setPendingDeleteId(null);
        }}
        title="Eliminar usuario"
        description="Esta acción no se puede deshacer. Se perderá el acceso del usuario al sistema."
        confirmLabel="Eliminar"
        loading={deleting !== null}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-xs font-bold uppercase tracking-wider mb-1"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
    >
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function RoleBadge({ role }: { role: string }) {
  const style =
    role === 'super_admin'
      ? 'bg-spk-red text-white'
      : role === 'admin'
        ? 'bg-spk-blue/10 text-spk-blue border border-spk-blue/30'
        : 'bg-black/5 text-black/70 border border-black/10';
  const label =
    role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Juez';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase ${style}`}
      style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
    >
      {label}
    </span>
  );
}
