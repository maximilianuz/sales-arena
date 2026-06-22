export const getDefaultStages = (lng = 'es') => {
  if (typeof lng === 'string' && lng.startsWith('en')) {
    return [
      { 
        id: 'apertura_rapport', 
        label: '1. Opening / Rapport', 
        estimatedTime: 5,
        objective: 'Before convincing, connect. Generate emotional resonance through validation and avoid premature judgments.', 
        indicator: 'The prospect lowers their guard and is genuine, not defensive.',
        baseQuestions: 'Where are you connecting from? \n(Principle: Emotional resonance. Speak at their pace. Validate without condescension. If they complain, empathize to open the conversation, do not jump to the solution).',
        baseObjections: 'Defensive out of initial fear: "I just came to see prices". (Respond with validation: "Totally understandable, do not worry about the price right now, let us first see if we can help you").'
      },
      { 
        id: 'cualificacion_diagnostico', 
        label: '2. Qualification', 
        estimatedTime: 20,
        objective: 'Diagnose the real pain, desire, and urgency using the Consultative Checklist.', 
        indicator: 'The prospect admits a point of emotional exhaustion and recognizes the gap.',
        baseQuestions: `OPERATIONAL QUALIFICATION CHECKLIST:
1. Real reason: What made you schedule right now? (Look for triggering event/trauma).
2. Origin: Where did you see us and what resonated with you?
3. Real Pain (Maslow): How does this affect your day-to-day? (Bring it to the present).
4. Time Gap: How long have you been like this and what did you try that didn't work?
5. Trust: What did you see in us to think that this time will be different?`,
        baseObjections: 'Superficial: "I want to sell more" (Look for the root: "What pattern of actions led you to not sell?"). Resistances: Giving monosyllabic answers (Lack of framing: Remind them that you lead and need the truth to help them).'
      },
      { 
        id: 'costo_oportunidad', 
        label: '3. Opportunity Cost', 
        estimatedTime: 5,
        objective: 'Make visible the price of staying the same or taking imperfect action.', 
        indicator: 'Expresses urgency to solve it. Latent dissonance becomes explicit.',
        baseQuestions: 'If you do not do this now, when will you? How much money/time are you losing every month by not solving this? If you stay the same, where do you see yourself in 6 months?',
        baseObjections: 'Lies about time/priority. "Why would you let this continue to steal your energy?"'
      },
      { 
        id: 'recapitulation', 
        label: '4. Recapitulation', 
        estimatedTime: 2,
        objective: 'Organize the lead\'s mental chaos and generate explicit cognitive dissonance.', 
        indicator: 'Nods and says "Exactly, that is what happens to me".',
        baseQuestions: `Let me organize this:
1. Context: You have been in X for Y time.
2. Trigger: You scheduled because Z happened.
3. Bottlenecks: A, B, and C are stopping you.
4. Consequence: If you stay the same, D will happen.
5. Dream: What you really want is E. Is that correct?`,
        baseObjections: ''
      },
      { 
        id: 'presentacion_vehiculo', 
        label: '5. Presentation', 
        estimatedTime: 10,
        objective: 'Show the logical map of the vehicle (step by step) anchored to their emotion.', 
        indicator: 'Visualizes their success within our vehicle.',
        baseQuestions: 'Let me show you how we take you from A to B. [Explain Phases of your program]. We did this exact thing with [Success Case]. The idea is not just X, it is that you regain control (Emotional Anchor).',
        baseObjections: 'Do not present if there is no clear pain. Presenting the step-by-step eliminates "I do not know if it will work" objections.'
      },
      { 
        id: 'cierre_transicion', 
        label: '6. Close', 
        estimatedTime: 10,
        objective: 'Intention micro-close, ask for the investment, and handle objections from Identity.', 
        indicator: 'Payment made or next step clearly scheduled.',
        baseQuestions: 'Do you see this working for you? Do you feel this is what you need? Then, the investment is X. What do you think is the best decision to make today?',
        baseObjections: `Handle objections under the Advanced Consultative Sales approach (identity and criteria, not haggling):
- "I have to think about it" -> Redefine "thinking" as a lack of trust.
- "I do not have money" -> Investment vs Expense. Doing it without money builds character.
- "Partner / Spouse" -> Evaluate autonomy. Are they looking for approval or validation?
- "Expensive" -> Opportunity cost of not doing it.
- "I do not trust myself" -> Trust is a result of acting, not a requirement.
- "I do not have time" -> What kind of person do you want to be? One who puts out fires or one who takes control.
- "I do not trust you" -> Appeal to their own criteria and show proof.`
      }
    ];
  }

  // Español por defecto
  return [
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
};
