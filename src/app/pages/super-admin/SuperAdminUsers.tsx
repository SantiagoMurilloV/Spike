import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  X as XIcon,
  Edit3,
  Pencil,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api, type PlatformUser } from '../../services/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CreateUserModal } from '../../components/super-admin/CreateUserModal';
import { EditUserModal } from '../../components/super-admin/EditUserModal';
import { NewPasswordModal } from '../../components/super-admin/NewPasswordModal';
import { useAuth } from '../../context/AuthContext';
import { isAdmin, roleLabel } from '../../lib/roles';
import { getErrorMessage } from '../../lib/errors';

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

  const [createModalOpen, setCreateModalOpen] = useState(false);
  /** Set when the super_admin clicks the pencil on a row. null = closed. */
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  /** When a create/reset generates a new plaintext password we hold it
   *  here just long enough for NewPasswordModal to show it once. */
  const [newPasswordReceipt, setNewPasswordReceipt] = useState<{
    username: string;
    password: string;
  } | null>(null);

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
      setError(getErrorMessage(err, 'Error al cargar usuarios'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      toast.error(getErrorMessage(err, 'Error al eliminar'));
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
      toast.error(getErrorMessage(err, 'Error al guardar'));
    } finally {
      setQuotaSaving(null);
    }
  };

  const admins = users.filter((u) => isAdmin(u.role));

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
      {/* Header with create-user CTA */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
        <motion.button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-spk-red hover:bg-spk-red-dark text-white rounded-sm font-bold transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}
            className="uppercase"
          >
            Crear usuario
          </span>
        </motion.button>
      </div>

      {/* Users table — no repeating "Usuarios" header, the page title
          already reads USUARIOS. Count lives implicitly in the rows. */}
      <section className="bg-white border-2 border-black/10 rounded-sm overflow-hidden">
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
                      {isAdmin(u.role) ? (
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
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          aria-label={`Editar ${u.username}`}
                          title="Editar usuario y contraseña"
                          className="p-2 bg-spk-blue/10 text-spk-blue rounded-sm hover:bg-spk-blue/20"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
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
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={async ({ newPassword }) => {
          // Reload the table first so the new row is visible underneath,
          // then surface the show-once password receipt on top.
          await load();
          // We don't have the username from the server response here,
          // but listUsers() just reloaded — find the freshest row.
          const created = (await api.listPlatformUsers())
            .slice()
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
          setNewPasswordReceipt({
            username: created?.username ?? 'nuevo usuario',
            password: newPassword,
          });
        }}
        admins={admins}
      />

      <EditUserModal
        isOpen={editingUser !== null}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={async ({ newPassword }) => {
          await load();
          if (newPassword && editingUser) {
            setNewPasswordReceipt({
              username: editingUser.username,
              password: newPassword,
            });
          }
        }}
      />

      <NewPasswordModal
        username={newPasswordReceipt?.username ?? ''}
        password={newPasswordReceipt?.password ?? null}
        onClose={() => setNewPasswordReceipt(null)}
      />

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

const ROLE_BADGE_STYLE: Record<string, string> = {
  super_admin: 'bg-spk-red text-white',
  admin: 'bg-spk-blue/10 text-spk-blue border border-spk-blue/30',
  judge: 'bg-black/5 text-black/70 border border-black/10',
  team_captain: 'bg-spk-gold/15 text-spk-gold border border-spk-gold/30',
};

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_BADGE_STYLE[role] ?? ROLE_BADGE_STYLE.judge;
  const label = roleLabel(role);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[11px] font-bold uppercase ${style}`}
      style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
    >
      {label}
    </span>
  );
}
