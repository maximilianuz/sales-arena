// Ayudas de accesibilidad para elementos que hacen de botón sin serlo.
//
// Hay filas clickeables que NO pueden ser <button> porque adentro llevan
// contenido con sus propios controles, y anidar interactivos es inválido. La
// alternativa correcta es role="button" + tabIndex + teclado, que es
// exactamente lo que un <button> te da gratis.
//
// El CSS global ya dibuja el anillo de foco para [role="button"], así que con
// esto la fila queda alcanzable, activable y visible al navegar con teclado.

// Enter y Espacio activan, igual que un botón nativo. Espacio además cancela el
// scroll de página, que es lo que haría por defecto.
export function teclasDeBoton(alActivar) {
  return (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    alActivar(e);
  };
}

// Las props completas de una fila que se comporta como botón.
export function propsDeFila(alActivar, { expandido = undefined, etiqueta } = {}) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: alActivar,
    onKeyDown: teclasDeBoton(alActivar),
    'aria-expanded': expandido,
    'aria-label': etiqueta,
  };
}
