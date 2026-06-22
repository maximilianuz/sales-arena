export const DEFAULT_STAGES = [
  { 
    id: 'apertura_rapport', 
    label: '1. Apertura / Rapport', 
    estimatedTime: 5,
    objective: 'Antes de convencer, conectar. Generar sintonía emocional mediante la validación y evitar juicios prematuros.', 
    indicator: 'El prospecto baja la guardia y se muestra genuino, no defensivo.',
    baseQuestions: '¿De dónde te conectas? \n(Principio: Sintonía Emocional. Hablar a su ritmo. Validar sin condescendencia. Si se queja, empatizar para abrir la conversación, no saltar a la solución).',
    baseObjections: 'Defensivas por miedo inicial: "Solo vine a ver precios". (Responder con validación: "Totalmente comprensible, no te preocupes por el precio ahora, primero veamos si te podemos ayudar").'
  },
  { 
    id: 'cualificacion_diagnostico', 
    label: '2. Cualificación', 
    estimatedTime: 20,
    objective: 'Diagnosticar el dolor real, el deseo y la urgencia usando el Checklist Consultivo.', 
    indicator: 'El prospecto admite un punto de hartazgo emocional y reconoce la brecha.',
    baseQuestions: `CHECKLIST OPERATIVO DE CUALIFICACIÓN:
1. Razón real: ¿Qué te hizo agendar justo ahora? (Buscar evento detonante/trauma).
2. Origen: ¿Dónde nos viste y qué te resonó?
3. Dolor Real (Maslow): ¿Cómo te afecta esto en tu día a día? (Llevarlo al presente).
4. Brecha Temporal: ¿Hace cuánto vienes así y qué probaste que no funcionó?
5. Confianza: ¿Qué viste en nosotros para pensar que esta vez será diferente?`,
    baseObjections: 'Superficiales: "Quiero vender más" (Buscar la raíz: "¿Qué patrón de acciones te llevó a no vender?"). Resistencias: Dar respuestas monosilábicas (Falta de marco: Recordarle que tú lideras y necesitas la verdad para ayudarlo).'
  },
  { 
    id: 'costo_oportunidad', 
    label: '3. Costo Oportunidad', 
    estimatedTime: 5,
    objective: 'Hacer visible el precio de seguir igual o tomar acción imperfecta.', 
    indicator: 'Expresa urgencia por resolverlo. Disonancia latente se vuelve explícita.',
    baseQuestions: 'Si no haces esto ahora, ¿en qué momento sí? ¿Cuánto dinero/tiempo estás perdiendo cada mes por no resolver esto? Si sigues igual, ¿cómo te ves en 6 meses?',
    baseObjections: 'Mentiras de tiempo/prioridad. "¿Por qué dejarías que esto siga robándote energía?"'
  },
  { 
    id: 'recapitulacion', 
    label: '4. Recapitulación', 
    estimatedTime: 2,
    objective: 'Ordenar el caos mental del lead y generar disonancia cognitiva explícita.', 
    indicator: 'Asiente y dice "Exacto, eso es lo que me pasa".',
    baseQuestions: `Permíteme ordenar esto:
1. Contexto: Estás en X hace Y tiempo.
2. Detonante: Agendaste porque pasó Z.
3. Cuellos: Te frena A, B y C.
4. Consecuencia: Si sigues igual, pasará D.
5. Sueño: Lo que realmente quieres es E. ¿Es correcto?`,
    baseObjections: ''
  },
  { 
    id: 'presentacion_vehiculo', 
    label: '5. Presentación', 
    estimatedTime: 10,
    objective: 'Mostrar el mapa lógico del vehículo (paso a paso) anclado a su emoción.', 
    indicator: 'Visualiza su éxito dentro de nuestro vehículo.',
    baseQuestions: 'Déjame mostrarte cómo te llevamos de A a B. [Explicar Fases de tu programa]. Esto mismo hicimos con [Caso de Éxito]. La idea no es solo X, es que recuperes el control (Anclaje Emocional).',
    baseObjections: 'No presentar si no hay dolor claro. Presentar el paso a paso elimina objeciones de "No sé si funcionará".'
  },
  { 
    id: 'cierre_transicion', 
    label: '6. Cierre', 
    estimatedTime: 10,
    objective: 'Micro-cierre de intención, pedir la inversión y manejar objeciones desde la Identidad.', 
    indicator: 'Pago realizado o agenda siguiente paso claro.',
    baseQuestions: '¿Lo ves funcionando para ti? ¿Sientes que esto es lo que necesitas? Entonces, la inversión es de X. ¿Cuál crees que es la mejor decisión a tomar hoy?',
    baseObjections: `Manejar objeciones bajo el enfoque de Venta Consultiva Avanzada (identidad y criterio, no regateo):
- "Lo tengo que pensar" -> Redefinir "pensar" como falta de confianza.
- "No tengo dinero" -> Inversión vs Gasto. Hacerlo sin dinero forma carácter.
- "Socio / Pareja" -> Evaluar autonomía. ¿Busca aprobación o validación?
- "Caro" -> Costo de oportunidad de no hacerlo.
- "No confío en mí" -> La confianza es resultado de actuar, no requisito.
- "No tengo tiempo" -> ¿Qué tipo de persona quieres ser? La que apaga incendios o la que toma el control.
- "No confío en ustedes" -> Apelar a su propio criterio y mostrar pruebas.`
  }
];
