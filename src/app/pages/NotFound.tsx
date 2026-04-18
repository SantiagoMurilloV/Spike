import { useNavigate } from 'react-router';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        {/* 404 Graphic */}
        <div className="mb-8">
          <h1 
            className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#E31E24] to-[#003087]"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            404
          </h1>
        </div>

        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          PÁGINA NO ENCONTRADA
        </h2>
        
        <p className="text-muted-foreground mb-8">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-sm hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-spk-red text-white rounded-sm hover:bg-spk-red-dark transition-colors"
          >
            <Home className="w-5 h-5" />
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
