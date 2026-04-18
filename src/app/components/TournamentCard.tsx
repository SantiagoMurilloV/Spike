import { Tournament } from '../types';
import { Calendar, Users, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const getStatusBadge = () => {
    switch (tournament.status) {
      case 'live':
      case 'ongoing':
        return (
          <div className="absolute top-4 right-4 z-20">
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 bg-[#E31E24] text-white rounded-sm text-xs font-bold uppercase tracking-wider"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              <motion.div
                className="w-1.5 h-1.5 bg-white rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              EN VIVO
            </motion.div>
          </div>
        );
      case 'upcoming':
        return (
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-1.5 bg-black text-white rounded-sm text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              PRÓXIMO
            </div>
          </div>
        );
      case 'completed':
        return (
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-1.5 bg-black/60 text-white rounded-sm text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              FINALIZADO
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      className="group bg-white overflow-hidden cursor-pointer"
      onClick={onClick}
      whileHover={{ borderColor: 'rgba(0, 0, 0, 0.3)' }}
      transition={{ duration: 0.2 }}
      style={{ border: '1px solid rgba(0, 0, 0, 0.1)' }}
    >
      {/* Image Section */}
      <div className="relative h-56 bg-black overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
        
        {/* Background pattern */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(45deg, #E31E24 25%, transparent 25%, transparent 75%, #E31E24 75%, #E31E24), linear-gradient(45deg, #E31E24 25%, transparent 25%, transparent 75%, #E31E24 75%, #E31E24)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px'
          }}
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.4 }}
        />

        {/* Status Badge */}
        {getStatusBadge()}

        {/* Tournament Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
          <motion.h3
            className="text-2xl font-bold text-white mb-2 leading-tight"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            initial={{ y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {tournament.name}
          </motion.h3>
        </div>

        {/* Hover overlay */}
        <motion.div
          className="absolute inset-0 bg-[#E31E24] z-0"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 0.1 }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        {/* Description */}
        <p className="text-sm text-black/60 line-clamp-2 leading-relaxed">
          {tournament.description}
        </p>

        {/* Info Grid */}
        <div className="space-y-3 pt-2 border-t border-black/10">
          <div className="flex items-center gap-3 text-sm text-black/80">
            <Calendar className="w-4 h-4 text-black/40" />
            <span className="font-medium">
              {format(tournament.startDate, 'd MMM', { locale: es })} - {format(tournament.endDate, 'd MMM', { locale: es })}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm text-black/80">
            <Users className="w-4 h-4 text-black/40" />
            <span className="font-medium">{tournament.teamsCount} equipos participantes</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-black/80">
            <MapPin className="w-4 h-4 text-black/40" />
            <span className="font-medium">{tournament.courts.length} {tournament.courts.length === 1 ? 'cancha' : 'canchas'}</span>
          </div>
        </div>

        {/* CTA */}
        <motion.div
          className="pt-4"
          initial={{ x: 0 }}
          whileHover={{ x: 5 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-sm font-bold uppercase tracking-wider text-black flex items-center gap-2">
            Ver detalles
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              whileHover={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              →
            </motion.span>
          </div>
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="h-1"
        style={{ backgroundColor: '#E31E24', originX: 0 }}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}