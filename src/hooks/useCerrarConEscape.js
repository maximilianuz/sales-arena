import { useEffect } from 'react';

// Cerrar un modal con la tecla Escape.
//
// Existe porque cinco de los seis modales de la app solo se podían cerrar
// clickeando el fondo o la X. Clickear el fondo es un gesto de mouse: con
// teclado no hay forma de hacerlo, y quien navega así quedaba encerrado en el
// diálogo. `RoleOnboarding` ya lo resolvía a mano — esto es lo mismo, una vez.
//
// El listener va en `document` y no en el nodo del modal a propósito: el foco
// puede estar en cualquier parte del diálogo (o todavía en el body, si el modal
// se abrió sin mover el foco), y un handler local no vería la tecla.
export function useCerrarConEscape(onClose, activo = true) {
  useEffect(() => {
    if (!activo || typeof onClose !== 'function') return;
    const alPresionar = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onClose, activo]);
}

export default useCerrarConEscape;
