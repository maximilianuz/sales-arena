export function getObjectionsPrompt({ baseProfile, targetObjection, language, specificObjectionFramework, level }) {
  const contextSummary = `
    - Cargo e Industria: ${baseProfile.demographics.role} en ${baseProfile.demographics.industry}
    - Problema Actual: ${baseProfile.currentSituation.problem}
    - Miedo Principal: ${baseProfile.psychology.primaryFear}
    - Deseo Principal: ${baseProfile.psychology.primaryDesire}
  `;

  let secondaryObjectionsInstruction = '';
  if (level === 'Principiante') {
    secondaryObjectionsInstruction = '1 objeción secundaria sencilla y fácil de rebatir.';
  } else if (level === 'Intermedio') {
    secondaryObjectionsInstruction = 'De 3 a 5 objeciones secundarias variadas (ej. tiempo, duda técnica, consultar con socio).';
  } else {
    secondaryObjectionsInstruction = 'Un arsenal masivo de 6 a 10 objeciones secundarias hostiles y desafiantes, buscando todas las excusas posibles para no comprar.';
  }

  return `
    Eres un experto entrenador de ventas y un Master High Ticket Closer.
    Basado en el siguiente resumen de un prospecto (Lead):
    ${contextSummary}

    Tu tarea es generar sus objeciones específicas (un arsenal) y una guía de actuación (roleplay) coherente con su perfil.
    
    - Idioma de respuesta: ${language === 'es' ? 'Español' : 'Inglés'}
    - Objeción Principal Esperada: "${targetObjection}"

    FRAMEWORK ESPECÍFICO PARA ESTA SIMULACIÓN (DEBE APLICARSE A LA OBJECIÓN PRINCIPAL):
    ${specificObjectionFramework}

    Además de la objeción principal, el prospecto tendrá un arsenal de objeciones secundarias para disparar. 
    INSTRUCCIÓN DE CANTIDAD SEGÚN DIFICULTAD (${level}): Genera ${secondaryObjectionsInstruction}

    Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
    {
      "visibleObjection": "La excusa fácil que dirá primero (debe reflejar o apuntar a la Objeción Principal Esperada)",
      "secondaryObjections": [
        "Objeción secundaria 1",
        "Objeción secundaria 2"
      ],
      "hiddenObjection": "La verdadera razón oculta por la que no compraría (información para el facilitador, conectada a su miedo principal)",
      "roleplayGuide": {
        "moneyBelief": "Creencia limitante sobre el dinero en 1 frase corta (ej. 'No tengo flujo de caja', 'Si invierto y fallo, me hundo')",
        "competingGoal": "Conflicto interno en 1 frase corta (ej. 'Quiero delegar PERO no confío en nadie')",
        "vendorFatigue": "Por qué desconfía de los vendedores en 1 frase corta",
        "actorAdvice": "INSTRUCCIÓN DIRECTA, CORTA Y ACCIONABLE PARA EL ACTOR/ACTRIZ. Debe poder leerla en 5 segundos y entrar en personaje. Indica: 1. Tono de voz, 2. Postura corporal/actitud, 3. Nivel de resistencia inicial. (Ej. 'Tono cortante y apurado. Brazos cruzados. Estás a la defensiva pero en el fondo desesperado por una solución.')"
      }
    }
  `;
}
