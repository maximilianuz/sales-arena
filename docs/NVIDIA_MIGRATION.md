# Migración: Flowise → NVIDIA para Equipos

## Resumen del Cambio

Se ha reemplazado **Flowise** como proveedor principal de LLM por **NVIDIA** (con soporte para 2 APIs), manteniendo **Groq** como fallback final. Esta configuración está optimizada exclusivamente para la funcionalidad de **equipos** (equipment management).

**Cadena de Proveedores**:
1. **NVIDIA #1** (API principal)
2. **NVIDIA #2** (API secundaria - si #1 falla)
3. **Groq** (fallback final)

**Estado de Operación**:
- ✅ Equipos: Totalmente funcional (100%)
- 🔕 Cobros/Billing: Opacado (no funcional por el momento)
- 🔕 Features individuales: Opacado (no funcional por el momento)

---

## Cambios Técnicos

### 1. Archivo: `netlify/functions/lib/llm.js`

#### Antes (Flowise como principal):
```javascript
// Orden: Flowise (principal) → NVIDIA → Groq (fallback)
// 1. Flowise (proveedor principal)
if (process.env.FLOWISE_URL && process.env.FLOWISE_API_KEY && process.env.FLOWISE_CHATFLOW_ID) {
  const fw = createFlowiseProvider(...);
  if (fw) chain.push(fw);
}
// 2. NVIDIA (fallback)
add('nvidia', 'NVIDIA', ...);
// 3. Groq (último fallback)
add('groq', 'GROQ', ...);
```

#### Ahora (NVIDIA como principal):
```javascript
// Orden: NVIDIA (principal) → Groq (fallback)
// 1. NVIDIA (proveedor principal) - Optimizado para equipos
add('nvidia', 'NVIDIA', ...);
// 2. Groq (fallback)
add('groq', 'GROQ', ...);
```

### 2. Modelos Seleccionados

Para optimizar la experiencia en equipos:

| Tier | Modelo | Razón |
|------|--------|-------|
| **Fast** | `meta/llama-3.1-8b-instruct` | Rápido, eficiente, buen para scoring |
| **Smart** | `meta/llama-3.1-70b-instruct` | Potente, preciso para análisis complejos |

### 3. Cambios en Configuración

#### `.env.example` (Actualizado):
```diff
- # LLM Providers (Flowise → NVIDIA → Groq chain)
- FLOWISE_URL=https://flowise.your-domain.com
- FLOWISE_API_KEY=your_flowise_bearer_token
- FLOWISE_CHATFLOW_ID=your_chatflow_id

+ # LLM Providers Chain: NVIDIA (primary) → Groq (fallback)
+ NVIDIA_API_KEY=your_nvidia_api_key
+ NVIDIA_URL=https://integrate.api.nvidia.com/v1/chat/completions
```

---

## Archivos Afectados

### Modificados
- ✅ `netlify/functions/lib/llm.js` - Reordenación de cadena de proveedores

### Creados
- ✅ `docs/NVIDIA_MODELS_REFERENCE.md` - Guía de modelos NVIDIA disponibles
- ✅ `docs/NVIDIA_MIGRATION.md` - Este documento
- ✅ `.env.example.nvidia` - Ejemplo de configuración NVIDIA
- ✅ `.env.example` - Actualizado

### No Modificados
- `netlify/functions/lib/flowise-adapter.js` - Mantenido (legacy, no usado)
- Todas las funciones que llaman `llmChat()` siguen funcionando igual

---

## Configuración Requerida

### Opción 1: Una API de NVIDIA (Recomendado para empezar)

```bash
# Mínimo requerido:
NVIDIA_API_KEY=nvapi_xxxxxxxxxxxx

# Groq como fallback:
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

### Opción 2: Dos APIs de NVIDIA (Redundancia completa)

```bash
# NVIDIA #1 (Principal)
NVIDIA_API_KEY=nvapi_xxxxxxx1_here
NVIDIA_MODEL_FAST=meta/llama-3.1-8b-instruct
NVIDIA_MODEL_SMART=meta/llama-3.1-70b-instruct

# NVIDIA #2 (Fallback - si #1 falla)
NVIDIA_API_KEY_2=nvapi_xxxxxxx2_here
NVIDIA_2_MODEL_FAST=meta/llama-3.2-3b-instruct     # Modelo diferente - más rápido
NVIDIA_2_MODEL_SMART=meta/llama-3.3-70b-instruct  # Modelo diferente - versión mejorada

# Groq (Fallback final - si ambas NVIDIA fallan)
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

**Flujo de Fallback Automático**:
```
Solicitud → NVIDIA #1 (api_key_1) 
         ↓ (si falla)
         → NVIDIA #2 (api_key_2, modelo diferente)
         ↓ (si falla)
         → Groq (fallback final)
```

### Casos de Uso para Dual NVIDIA

| Caso | NVIDIA #1 | NVIDIA #2 | Groq |
|------|-----------|-----------|------|
| **Máxima Redundancia** | Llama 70B | Llama 33B | Fallback |
| **Balance Costo/Velocidad** | Llama 8B | Llama 70B | Fallback |
| **Máxima Velocidad** | Llama 3B | Llama 8B | Fallback |
| **Testing** | Llama 70B | Mistral 8x22B | Fallback |

### Obtener API Keys de NVIDIA

1. Ir a https://build.nvidia.com/
2. Registrarse/iniciar sesión
3. Generar API Key (puede generar múltiples)
4. Copiar y agregar a variables de entorno

### Quitar Variables de Flowise (Opcional)
Puedes remover estas variables si ya no usas Flowise:
```bash
# FLOWISE_URL
# FLOWISE_API_KEY
# FLOWISE_CHATFLOW_ID
```

---

## Compatibilidad

### ✅ Compatible
- Todas las funciones Netlify que usan `llmChat()`
- Análisis de sesiones
- Generación de escenarios
- Roleplay turns

### ❌ No Compatible
- Flowise como proveedor principal (reemplazado)
- Features de cobros (opacado)
- Features individuales (opacado)

---

## Cómo Cambiar Modelos

Si deseas experimentar con otros modelos de NVIDIA:

### Opción 1: Variables de Entorno
```bash
export NVIDIA_MODEL_FAST=meta/llama-3.2-3b-instruct  # Más rápido
export NVIDIA_MODEL_SMART=meta/llama-3.3-70b-instruct  # Más potente
```

### Opción 2: Editar Directamente
Edita `netlify/functions/lib/llm.js` línea 37:
```javascript
'meta/llama-3.1-8b-instruct',  // Fast
'meta/llama-3.1-70b-instruct'  // Smart
```

Ver `docs/NVIDIA_MODELS_REFERENCE.md` para lista completa de modelos disponibles.

---

## Rollback (Si es necesario)

Para volver a Flowise como proveedor principal:

1. Revertir cambios en `netlify/functions/lib/llm.js`
2. Restaurar variables de Flowise en `.env`
3. Volver a desplegar

```bash
git checkout HEAD -- netlify/functions/lib/llm.js
```

---

## Monitoreo

Para verificar que todo funciona:

1. Revisar logs de Netlify Functions
2. Buscar mensajes como: `"provider": "nvidia"`
3. En error, verificar que Groq está disponible como fallback

---

## Próximos Pasos (Opcional)

1. **Integrar Groq completamente**: Actualmente es fallback, se puede hacer principal
2. **Agregar más opciones**: Añadir soporte para otros proveedores (OpenAI, Anthropic, etc.)
3. **Optimizar para costo**: Usar modelos más ligeros para scoring
4. **Habilitar features de cobros**: Una vez NVIDIA esté estable
