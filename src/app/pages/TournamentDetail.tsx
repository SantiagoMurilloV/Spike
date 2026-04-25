import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { RefreshCw } from 'lucide-react';
import { useTournamentData } from './tournament-detail/useTournamentData';
import { Header } from './tournament-detail/Header';
import { Hero } from './tournament-detail/Hero';
import { TabNav } from './tournament-detail/TabNav';
import { Footer } from './tournament-detail/Footer';
import { TeamsTab } from './tournament-detail/tabs/TeamsTab';
import { GruposTab } from './tournament-detail/tabs/GruposTab';
import { MatchesTab } from './tournament-detail/tabs/MatchesTab';
import { StandingsTab } from './tournament-detail/tabs/StandingsTab';
import { BracketTab } from './tournament-detail/tabs/BracketTab';
import { InfoTab } from './tournament-detail/tabs/InfoTab';
import type { TabDescriptor, TabId } from './tournament-detail/tabs/types';

/**
 * Public tournament-detail page. Orchestrates the data hook + 5 tab
 * components split out under ./tournament-detail/. Owns only:
 *   · active tab + follow toggle (UI state)
 *   · early-return loading / error / not-found screens
 *
 * Every visual piece (header, hero, tabs, footer) is in its own file
 * so this orchestrator stays under ~150 lines.
 */
export function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('teams');
  const [isFollowing, setIsFollowing] = useState(false);

  const {
    tournament,
    matches,
    standings,
    bracket,
    enrolledTeams,
    loading,
    error,
    reload,
    lastRefreshedAt,
  } = useTournamentData(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20 px-6 md:px-12">
        <div className="max-w-[1600px] mx-auto">
          <div className="h-[50vh] bg-black/5 rounded animate-pulse mb-8" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-black/5 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="text-5xl mb-6">⚠️</div>
          <p
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            ERROR AL CARGAR TORNEO
          </p>
          <p className="text-black/60 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold hover:bg-black/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-black/10 text-black font-bold hover:bg-black/20 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <p
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            TORNEO NO ENCONTRADO
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-white text-black rounded-sm font-bold hover:bg-white/90 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const liveMatches = matches.filter((m) => m.status === 'live');

  const tabs: TabDescriptor[] = [
    {
      id: 'teams',
      label: 'Equipos',
      count: standings.length || enrolledTeams.length || tournament.teamsCount,
    },
    { id: 'grupos', label: 'Grupos', count: standings.length },
    { id: 'matches', label: 'Partidos', count: matches.length },
    { id: 'standings', label: 'Clasificación', count: standings.length },
    { id: 'bracket', label: 'Bracket' },
    { id: 'info', label: 'Info' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header
        tournamentName={tournament.name}
        isFollowing={isFollowing}
        onToggleFollow={() => setIsFollowing((v) => !v)}
      />

      <Hero
        tournament={tournament}
        matchesCount={matches.length}
        liveMatchesCount={liveMatches.length}
        enrolledCount={enrolledTeams.length}
      />

      <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-12 md:py-20">
        {activeTab === 'teams' && (
          <TeamsTab standings={standings} enrolledTeams={enrolledTeams} />
        )}
        {activeTab === 'grupos' && <GruposTab matches={matches} standings={standings} />}
        {activeTab === 'matches' && <MatchesTab matches={matches} />}
        {activeTab === 'standings' && (
          <StandingsTab
            matches={matches}
            standings={standings}
            bracketMode={tournament.bracketMode}
            lastRefreshedAt={lastRefreshedAt}
          />
        )}
        {activeTab === 'bracket' && <BracketTab bracketMatches={bracket} />}
        {activeTab === 'info' && (
          <InfoTab
            tournament={tournament}
            enrolledCount={enrolledTeams.length}
            matchesCount={matches.length}
          />
        )}
      </div>

      <Footer />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
