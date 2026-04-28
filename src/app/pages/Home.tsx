import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { HomeHeader } from './home/HomeHeader';
import { HeroSection } from './home/HeroSection';
import { LiveMatchesSection } from './home/LiveMatchesSection';
import { DirectorySection } from './home/DirectorySection';
import { HomeFooter } from './home/HomeFooter';
import { useFilterDeepLink, type StatusFilter } from './home/useFilterDeepLink';

/**
 * Public home page — composes the header + hero + (optional) live
 * matches + tournaments directory + footer. All presentational logic
 * lives in ./home/ so this file only wires data from DataContext into
 * each section.
 */
export function Home() {
  const { tournaments, matches, loading, error, refreshTournaments } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  useFilterDeepLink(setFilterStatus);

  const statusCounts = useMemo(
    () => ({
      all: tournaments.length,
      ongoing: tournaments.filter((t) => t.status === 'ongoing').length,
      upcoming: tournaments.filter((t) => t.status === 'upcoming').length,
      completed: tournaments.filter((t) => t.status === 'completed').length,
    }),
    [tournaments],
  );

  const filteredTournaments = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tournaments.filter((t) => {
      const matchesSearch =
        q === '' || t.name.toLowerCase().includes(q) || t.club.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tournaments, searchQuery, filterStatus]);

  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === 'live'),
    [matches],
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <HomeHeader />

      <HeroSection
        totalTournaments={statusCounts.all}
        ongoingTournaments={statusCounts.ongoing}
        onViewTournaments={() =>
          window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
        }
      />

      <LiveMatchesSection liveMatches={liveMatches} />

      <DirectorySection
        tournaments={filteredTournaments}
        statusCounts={statusCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        loading={loading.tournaments}
        error={error.tournaments}
        onRetry={refreshTournaments}
      />

      <HomeFooter />
    </div>
  );
}
