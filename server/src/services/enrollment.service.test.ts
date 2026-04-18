import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrollmentService } from './enrollment.service';

// Mock the database module
vi.mock('../config/database', () => ({
  getPool: vi.fn(),
}));

import { getPool } from '../config/database';

const service = new EnrollmentService();

// Helper to create a mock pool with a query function
function mockPool(queryFn: ReturnType<typeof vi.fn>) {
  (getPool as ReturnType<typeof vi.fn>).mockReturnValue({ query: queryFn });
  return queryFn;
}

// A sample enrolled-team DB row (JOIN of tournament_teams + teams)
function enrolledRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'enroll-1',
    tournament_id: 'tourn-1',
    team_id: 'team-1',
    team_name: 'Equipo A',
    team_initials: 'EA',
    team_logo: null,
    team_primary_color: '#FF0000',
    team_secondary_color: '#0000FF',
    team_city: 'Bogotá',
    team_department: 'Cundinamarca',
    team_category: 'Sub-14 Masculino',
    ...overrides,
  };
}

describe('EnrollmentService.getEnrolledTeamsByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should group teams by their category', async () => {
    const queryFn = mockPool(vi.fn()
      // Tournament exists check
      .mockResolvedValueOnce({ rows: [{ id: 'tourn-1' }] })
      // Enrolled teams query
      .mockResolvedValueOnce({
        rows: [
          enrolledRow({ id: 'e1', team_id: 't1', team_name: 'Team A', team_category: 'Sub-14 Masculino' }),
          enrolledRow({ id: 'e2', team_id: 't2', team_name: 'Team B', team_category: 'Sub-14 Masculino' }),
          enrolledRow({ id: 'e3', team_id: 't3', team_name: 'Team C', team_category: 'Sub-16 Femenino' }),
        ],
      })
    );

    const result = await service.getEnrolledTeamsByCategory('tourn-1');

    expect(result).toHaveLength(2);
    const sub14 = result.find(g => g.category === 'Sub-14 Masculino');
    const sub16 = result.find(g => g.category === 'Sub-16 Femenino');
    expect(sub14).toBeDefined();
    expect(sub14!.teams).toHaveLength(2);
    expect(sub16).toBeDefined();
    expect(sub16!.teams).toHaveLength(1);
  });

  it('should map null/undefined category to "Sin Categoría"', async () => {
    mockPool(vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'tourn-1' }] })
      .mockResolvedValueOnce({
        rows: [
          enrolledRow({ id: 'e1', team_id: 't1', team_name: 'Team A', team_category: null }),
          enrolledRow({ id: 'e2', team_id: 't2', team_name: 'Team B', team_category: undefined }),
          enrolledRow({ id: 'e3', team_id: 't3', team_name: 'Team C', team_category: 'Mayores' }),
        ],
      })
    );

    const result = await service.getEnrolledTeamsByCategory('tourn-1');

    const sinCategoria = result.find(g => g.category === 'Sin Categoría');
    expect(sinCategoria).toBeDefined();
    expect(sinCategoria!.teams).toHaveLength(2);
    expect(sinCategoria!.teams[0].team.name).toBe('Team A');
    expect(sinCategoria!.teams[1].team.name).toBe('Team B');
  });

  it('should not lose or duplicate any teams during grouping', async () => {
    const inputRows = [
      enrolledRow({ id: 'e1', team_id: 't1', team_name: 'Team 1', team_category: 'Cat A' }),
      enrolledRow({ id: 'e2', team_id: 't2', team_name: 'Team 2', team_category: 'Cat B' }),
      enrolledRow({ id: 'e3', team_id: 't3', team_name: 'Team 3', team_category: 'Cat A' }),
      enrolledRow({ id: 'e4', team_id: 't4', team_name: 'Team 4', team_category: null }),
      enrolledRow({ id: 'e5', team_id: 't5', team_name: 'Team 5', team_category: 'Cat B' }),
    ];

    mockPool(vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'tourn-1' }] })
      .mockResolvedValueOnce({ rows: inputRows })
    );

    const result = await service.getEnrolledTeamsByCategory('tourn-1');

    // Flatten all teams from all groups
    const allTeamIds = result.flatMap(g => g.teams.map(t => t.id));
    expect(allTeamIds).toHaveLength(inputRows.length);
    // Every input enrollment id should appear exactly once
    const inputIds = inputRows.map(r => r.id);
    expect(allTeamIds.sort()).toEqual(inputIds.sort());
  });

  it('should sort categories alphabetically with "Sin Categoría" last', async () => {
    mockPool(vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'tourn-1' }] })
      .mockResolvedValueOnce({
        rows: [
          enrolledRow({ id: 'e1', team_id: 't1', team_category: 'Sub-16 Femenino' }),
          enrolledRow({ id: 'e2', team_id: 't2', team_category: null }),
          enrolledRow({ id: 'e3', team_id: 't3', team_category: 'Mayores Masculino' }),
          enrolledRow({ id: 'e4', team_id: 't4', team_category: 'Sub-14 Masculino' }),
        ],
      })
    );

    const result = await service.getEnrolledTeamsByCategory('tourn-1');

    const categories = result.map(g => g.category);
    expect(categories).toEqual([
      'Mayores Masculino',
      'Sub-14 Masculino',
      'Sub-16 Femenino',
      'Sin Categoría',
    ]);
  });

  it('should return empty array when no teams are enrolled', async () => {
    mockPool(vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'tourn-1' }] })
      .mockResolvedValueOnce({ rows: [] })
    );

    const result = await service.getEnrolledTeamsByCategory('tourn-1');

    expect(result).toEqual([]);
  });
});
