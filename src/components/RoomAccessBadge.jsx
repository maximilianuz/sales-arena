import React from 'react';
import { Share2 } from 'lucide-react';

export default function RoomAccessBadge({ ownerIsPaid, userIsPaid, ownerLoading }) {
  // Si el usuario no es Pro pero el propietario sí, mostrar que heredó acceso
  if (ownerLoading || userIsPaid || !ownerIsPaid) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'rgba(48,209,88,0.15)',
        border: '1px solid rgba(48,209,88,0.4)',
        borderRadius: '0.5rem',
        padding: '0.4rem 0.8rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'rgba(48,209,88,0.9)',
        whiteSpace: 'nowrap'
      }}
      title="Acceso Pro heredado del propietario de la sala"
    >
      <Share2 size={12} />
      Acceso Pro compartido
    </div>
  );
}
