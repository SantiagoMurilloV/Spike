import { Plus, Search, Filter, Edit, Trash2, Users, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { TeamFormModal } from '../../components/admin/TeamFormModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Team } from '../../types';
import type { CreateTeamDto, UpdateTeamDto } from '../../services/api';

export function AdminTeams() {
  const { teams, loading, error, addTeam, updateTeam, deleteTeam, refreshTeams } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.initials.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setEditingTeam(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setDeletingId(id);
    try {
      await deleteTeam(id);
      toast.success('Equipo eliminado correctamente');
      setPendingDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar equipo');
      throw err; // keep dialog open so the user can retry
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (team: Team) => {
    if (editingTeam) {
      const dto: UpdateTeamDto = {
        name: team.name,
        initials: team.initials,
        logo: team.logo,
        primaryColor: team.colors.primary,
        secondaryColor: team.colors.secondary,
        city: team.city,
        department: team.department,
        category: team.category,
      };
      await updateTeam(editingTeam.id, dto);
      toast.success('Equipo actualizado correctamente');
    } else {
      const dto: CreateTeamDto = {
        name: team.name,
        initials: team.initials,
        logo: team.logo,
        primaryColor: team.colors.primary,
        secondaryColor: team.colors.secondary,
        city: team.city,
        department: team.department,
        category: team.category,
      };
      await addTeam(dto);
      toast.success('Equipo creado correctamente');
    }
  };

  if (loading.teams && teams.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-spk-red" />
      </div>
    );
  }

  if (error.teams && teams.length === 0) {
    return (
      <div className="p-6 text-center py-16">
        <p className="text-red-600 mb-4">{error.teams}</p>
        <button
          onClick={() => refreshTeams()}
          className="px-4 py-2 bg-spk-red text-white rounded-sm hover:bg-spk-red-dark transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            GESTIÓN DE EQUIPOS
          </h1>
          <p className="text-black/60">
            Administra los equipos registrados en el sistema
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }} className="uppercase font-bold">Crear Equipo</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border border-black/10 rounded-sm px-3 py-2 text-center">
          <div className="text-xl font-bold leading-none" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {teams.length}
          </div>
          <div className="text-[10px] text-black/60 mt-1">Registrados</div>
        </div>
        <div className="bg-white border border-black/10 rounded-sm px-3 py-2 text-center">
          <div className="text-xl font-bold leading-none" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {new Set(teams.map(t => t.category).filter(Boolean)).size}
          </div>
          <div className="text-[10px] text-black/60 mt-1">Categorías</div>
        </div>
        <div className="bg-white border border-black/10 rounded-sm px-3 py-2 text-center">
          <div className="text-xl font-bold leading-none" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {new Set(teams.map(t => t.city).filter(Boolean)).size}
          </div>
          <div className="text-[10px] text-black/60 mt-1">Ciudades</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
          <input
            type="text"
            placeholder="Buscar equipos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#E31E24]/50"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 rounded-sm transition-colors font-medium">
          <Filter className="w-4 h-4" />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }} className="uppercase font-bold">Filtros</span>
        </button>
      </div>

      {/* Teams Table */}
      <div className="bg-white border-2 border-black/10 rounded-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-black/5 border-b-2 border-black/10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>EQUIPO</th>
              <th className="px-6 py-4 text-left text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>INICIALES</th>
              <th className="px-6 py-4 text-left text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>CATEGORÍA</th>
              <th className="px-6 py-4 text-left text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>UBICACIÓN</th>
              <th className="px-6 py-4 text-right text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black/10">
            {filteredTeams.map((team) => (
              <tr key={team.id} className="hover:bg-black/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="w-10 h-10 rounded-sm object-cover border-2 border-black/10"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: team.colors.primary, fontFamily: 'Barlow Condensed, sans-serif' }}
                      >
                        {team.initials}
                      </div>
                    )}
                    <span className="font-medium">{team.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-lg" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{team.initials}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-black/70">{team.category || '—'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-black/70">
                    {team.city || team.department ? (
                      <>
                        {team.city && <span>{team.city}</span>}
                        {team.city && team.department && <span>, </span>}
                        {team.department && <span className="text-black/50">{team.department}</span>}
                      </>
                    ) : '—'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(team)}
                      aria-label={`Editar ${team.name}`}
                      title={`Editar ${team.name}`}
                      className="p-2 hover:bg-spk-blue/10 text-spk-blue rounded-sm transition-colors"
                    >
                      <Edit className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(team.id)}
                      disabled={deletingId === team.id}
                      aria-label={`Eliminar ${team.name}`}
                      title={`Eliminar ${team.name}`}
                      className="p-2 hover:bg-spk-red/10 text-spk-red rounded-sm transition-colors disabled:opacity-50"
                    >
                      {deletingId === team.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredTeams.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-black/40" />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              No se encontraron equipos
            </h3>
            <p className="text-black/60">Intenta con otros términos de búsqueda</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <TeamFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        team={editingTeam}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Eliminar equipo"
        description="¿Estás seguro de que quieres eliminar este equipo? Esta acción no se puede deshacer. No podrás eliminarlo si tiene partidos programados o en vivo."
        confirmLabel="Eliminar"
        loading={deletingId !== null}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
