// ─────────────────────────────────────────────────────────────────────────────
// Plantillas por nicho.
// Cada plantilla es un punto de partida: precarga apertura, oportunidades típicas,
// objeciones frecuentes y encuadre de oferta para ese rubro. El closer después
// edita todo a gusto. Los [corchetes] son huecos para completar.
//
// Se fusionan sobre emptyProposal(): { ...emptyProposal(ownerName), ...template }.
// ─────────────────────────────────────────────────────────────────────────────

export const NICHES = [
  {
    id: 'wellness',
    label: 'Wellness / Fitness',
    emoji: '🏋️',
    accent: '16,185,129',
    blurb: 'Coaches, gimnasios, nutrición, entrenadores.',
    template: {
      intro: 'Hola [nombre], vengo siguiendo [tu cuenta/tu marca] y veo que tenés una comunidad muy comprometida. El problema no es la audiencia: es que hoy no hay un sistema que convierta esas consultas en ventas cerradas. Te preparé esta propuesta con lo que detecté y cómo lo resolvería.',
      auditPoints: [
        { title: 'Consultas sin seguimiento', detail: 'Llegan DMs y consultas, pero se enfrían sin un proceso claro de cierre.' },
        { title: 'Objeción de precio mal manejada', detail: 'El "es caro" corta la venta en vez de reencuadrarse hacia el valor y el resultado.' },
        { title: 'Sin oferta escalonada', detail: 'Falta un ascenso de valor (de plan básico a acompañamiento premium) que suba el ticket.' }
      ],
      objections: [
        { q: 'Ya tengo a alguien respondiendo mensajes', a: 'Responder no es cerrar. Yo entro a la etapa donde el prospecto está caliente y hay que llevarlo a la decisión sin que se enfríe.' },
        { q: 'Mi producto se vende solo', a: 'Los que ya están convencidos, sí. Yo trabajo el 70% que duda: los que sin un cierre profesional se van a pensarlo y no vuelven.' }
      ],
      offer: {
        summary: 'Me sumo como closer de tu equipo: tomo las consultas calientes, hago el seguimiento y cierro. Vos te enfocás en el producto y el contenido.',
        price: '15% por venta',
        priceNote: 'Primeras 2 semanas a prueba, sin fijo.'
      }
    }
  },
  {
    id: 'coaching',
    label: 'Coaching / Infoproductos',
    emoji: '🎓',
    accent: '134,59,255',
    blurb: 'Mentores, creadores de cursos, formaciones high-ticket.',
    template: {
      intro: 'Hola [nombre], tu formación tiene una propuesta muy fuerte y una audiencia que confía en vos. Donde veo plata sobre la mesa es en el proceso de venta del programa high-ticket: hoy depende mucho de vos y no escala. Te dejo el detalle.',
      auditPoints: [
        { title: 'El cierre depende del fundador', detail: 'Vos cerrás mejor que nadie, pero eso te vuelve el cuello de botella y limita el volumen.' },
        { title: 'Aplicaciones que no se agendan', detail: 'Gente que aplica al programa pero nunca llega a la llamada por falta de seguimiento.' },
        { title: 'Sin manejo estructurado de objeciones', detail: 'Precio, "no tengo tiempo" y "lo consulto con mi pareja" se llevan ventas que se podían cerrar.' }
      ],
      objections: [
        { q: '¿Vas a saber vender MI programa?', a: 'Me formo en tu método y tu promesa antes de tomar una sola llamada. Te muestro role-plays para que valides cómo lo comunico.' },
        { q: 'Ya probé con vendedores y no funcionó', a: 'La diferencia es el proceso: rúbrica de cierre, seguimiento y reporte de cada llamada. No es "salir a vender", es un sistema medible.' }
      ],
      offer: {
        summary: 'Cierro tus llamadas de aplicación al programa high-ticket. Tomo las aplicaciones, agendo, cierro y te reporto cada caso.',
        price: '10-15% + fijo',
        priceNote: 'A convenir según ticket y volumen.'
      }
    }
  },
  {
    id: 'b2b',
    label: 'B2B / SaaS',
    emoji: '💼',
    accent: '71,191,255',
    blurb: 'Software, servicios y ventas a empresas.',
    template: {
      intro: 'Hola [nombre], vi lo que están construyendo en [empresa] y el producto pinta sólido. Mi lectura es que el bottleneck no es el producto sino el pipeline: leads que entran y no avanzan por falta de un proceso de cierre consistente. Acá va mi propuesta.',
      auditPoints: [
        { title: 'Ciclo de venta largo sin seguimiento', detail: 'Deals que quedan en "lo estamos viendo" y mueren por falta de follow-up estructurado.' },
        { title: 'Demos que no convierten', detail: 'Se hacen demos pero sin un cierre claro ni next-step concreto al final.' },
        { title: 'Pipeline sin priorización', detail: 'Se trabaja todo por igual en vez de enfocar en los deals con mayor probabilidad.' }
      ],
      objections: [
        { q: 'Nuestro ciclo es muy técnico', a: 'Por eso primero me interiorizo en el producto y el ICP. Manejo la conversación comercial y escalo lo técnico cuando corresponde.' },
        { q: 'Ya tenemos un equipo de ventas', a: 'Perfecto, entro a reforzar el cierre y el seguimiento, que es donde se pierden la mayoría de los deals calientes.' }
      ],
      offer: {
        summary: 'Me integro a tu pipeline como closer: priorizo deals, hago seguimiento y cierro. Reporte semanal de estado y forecast.',
        price: 'Comisión por deal cerrado',
        priceNote: 'Estructura a definir según ACV.'
      }
    }
  },
  {
    id: 'realestate',
    label: 'Inmobiliaria',
    emoji: '🏠',
    accent: '245,158,11',
    blurb: 'Desarrollos, brokers, inversión inmobiliaria.',
    template: {
      intro: 'Hola [nombre], el flujo de consultas que genera [tu desarrollo/tu cartera] es bueno, pero veo que muchas se enfrían antes de la visita o la reserva. Ahí es donde entro yo. Te dejo lo que detecté.',
      auditPoints: [
        { title: 'Leads que no llegan a la visita', detail: 'Consultas que se pierden entre el primer contacto y la visita por falta de seguimiento.' },
        { title: 'Sin calificación previa', detail: 'Se invierte tiempo en prospectos que no tienen capacidad o intención real de compra.' },
        { title: 'Objeción de financiación sin encuadre', detail: 'El tema precio/financiación frena la decisión en lugar de convertirse en un plan.' }
      ],
      objections: [
        { q: 'Esto necesita conocer el producto a fondo', a: 'Me capacito en la cartera, zonas y condiciones antes de tomar consultas. Puedo mostrarte cómo manejo una llamada tipo.' },
        { q: 'Trabajamos con referidos, no con leads fríos', a: 'Ideal, los referidos convierten más. Yo me aseguro de que ninguno se enfríe por falta de seguimiento profesional.' }
      ],
      offer: {
        summary: 'Tomo tus consultas, califico, agendo visitas y acompaño hasta la reserva. Vos cerrás la operación con prospectos ya calificados.',
        price: 'A convenir por operación',
        priceNote: 'Según ticket y tipo de propiedad.'
      }
    }
  },
  {
    id: 'ecommerce',
    label: 'E-commerce / Marcas',
    emoji: '🛍️',
    accent: '236,72,153',
    blurb: 'Tiendas, marcas de producto, DTC.',
    template: {
      intro: 'Hola [nombre], la marca comunica muy bien y el producto se nota cuidado. Donde veo oportunidad es en el ticket alto y la venta consultiva: hay clientes dispuestos a gastar más si alguien los acompaña en la decisión. Te muestro cómo.',
      auditPoints: [
        { title: 'Carritos de alto valor abandonados', detail: 'Compras grandes que se abandonan sin nadie que retome el contacto y cierre.' },
        { title: 'Sin venta consultiva para tickets altos', detail: 'Productos premium que se venderían mejor con una conversación 1 a 1.' },
        { title: 'Mayoristas / B2B sin seguimiento', detail: 'Consultas de compra por volumen que no se trabajan como el deal que son.' }
      ],
      objections: [
        { q: 'Nosotros vendemos por la web, no por llamada', a: 'La web cubre el ticket bajo. Yo entro en el cliente de alto valor y el mayorista, donde una conversación multiplica el pedido.' },
        { q: 'No quiero que se sienta invasivo', a: 'No es perseguir, es acompañar. Contacto cálido y en el momento justo, cuidando la experiencia de tu marca.' }
      ],
      offer: {
        summary: 'Trabajo tus consultas de alto ticket y mayoristas: retomo carritos grandes, asesoro y cierro. Cuido el tono de tu marca en cada contacto.',
        price: '10% por venta cerrada',
        priceNote: 'Foco en ticket alto y B2B.'
      }
    }
  },
  {
    id: 'agency',
    label: 'Agencias / Servicios',
    emoji: '📈',
    accent: '99,102,241',
    blurb: 'Marketing, diseño, consultoría, freelancers.',
    template: {
      intro: 'Hola [nombre], los servicios de [tu agencia] tienen resultados que hablan solos. El problema clásico en agencias es que el que produce también tiene que vender, y eso frena el crecimiento. Ahí es donde yo aporto. Te dejo el detalle.',
      auditPoints: [
        { title: 'El fundador vende y produce', detail: 'La venta compite con la entrega y ninguna de las dos recibe el foco completo.' },
        { title: 'Propuestas enviadas y sin respuesta', detail: 'Presupuestos que se mandan y quedan sin seguimiento hasta que el lead se enfría.' },
        { title: 'Sin proceso de cierre repetible', detail: 'Cada venta se maneja distinto, sin un método que se pueda medir y mejorar.' }
      ],
      objections: [
        { q: 'Nuestro servicio es muy a medida para tercerizar la venta', a: 'Por eso no vendo humo: me formo en tu servicio y tu diferencial. Vos entregás, yo me ocupo de que entren los clientes correctos.' },
        { q: 'Ya nos llegan clientes por recomendación', a: 'Buenísimo, eso es base. Yo me aseguro de que ninguna recomendación ni propuesta enviada se pierda por falta de seguimiento.' }
      ],
      offer: {
        summary: 'Me ocupo de la venta: seguimiento de propuestas, llamadas de cierre y reporte. Vos volvés a enfocarte 100% en entregar resultados.',
        price: '15-20% por contrato',
        priceNote: 'Según ticket y recurrencia.'
      }
    }
  },
  {
    id: 'blank',
    label: 'Desde cero',
    emoji: '✨',
    accent: '148,163,184',
    blurb: 'Empezá con una propuesta en blanco y armala a tu gusto.',
    template: {}
  }
];

export function getNiche(id) {
  return NICHES.find((n) => n.id === id) || null;
}
