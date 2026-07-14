# Modelos NVIDIA - Guía de Referencia

## Resumen de Cambios
- **Proveedor Principal**: NVIDIA (en lugar de Flowise)
- **Fallback**: Groq
- **Configuración Actual (Equipos)**:
  - Fast tier: `meta/llama-3.1-8b-instruct`
  - Smart tier: `meta/llama-3.1-70b-instruct`

---

## Modelos Recomendados por Caso de Uso

### Para Equipos (Configuración Actual - Recomendado)
Estos modelos balancean velocidad, costo y capacidad para gestión de equipamiento:

| Modelo | Tamaño | Caso de Uso | Velocidad | Capacidad |
|--------|--------|-----------|-----------|-----------|
| `meta/llama-3.1-8b-instruct` | 8B | Fast - scoring, análisis rápido | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| `meta/llama-3.1-70b-instruct` | 70B | Smart - diálogos, análisis complejos | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### Alternativas Ligeras (Para optimizar costos)
Si necesitas reducir latencia y costo:

| Modelo | Tamaño | Velocidad | Capacidad | Notas |
|--------|--------|-----------|-----------|-------|
| `meta/llama-3.2-3b-instruct` | 3B | ⭐⭐⭐⭐⭐ | ⭐⭐ | Ultra rápido, ideal para scoring |
| `microsoft/phi-4-mini-instruct` | 3.8B | ⭐⭐⭐⭐⭐ | ⭐⭐ | Muy eficiente, buen para instrucciones |
| `meta/llama-3.1-8b-instruct` | 8B | ⭐⭐⭐⭐ | ⭐⭐⭐ | Buen balance |

### Alternativas Potentes (Para análisis muy complejos)
Si necesitas máxima capacidad:

| Modelo | Tamaño | Velocidad | Capacidad | Notas |
|--------|--------|-----------|-----------|-------|
| `meta/llama-3.1-70b-instruct` | 70B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Actual para Smart |
| `meta/llama-3.3-70b-instruct` | 70B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Versión mejorada de 3.1 |
| `mistralai/mixtral-8x22b-instruct` | 176B | ⭐⭐ | ⭐⭐⭐⭐⭐ | Muy potente (MoE) |
| `nvidia/nemotron-3-ultra-550b-a55b` | 550B | ⭐ | ⭐⭐⭐⭐⭐ | Ultra potente (no recomendado para equipos) |

---

## Cómo Cambiar Modelos

### Opción 1: Variables de Entorno (Recomendado)
```bash
# Fast tier
export NVIDIA_MODEL_FAST=meta/llama-3.2-3b-instruct

# Smart tier
export NVIDIA_MODEL_SMART=meta/llama-3.1-70b-instruct
```

### Opción 2: Editar `netlify/functions/lib/llm.js`
Cambiar la línea 37:
```javascript
'meta/llama-3.1-8b-instruct', 'meta/llama-3.1-70b-instruct'
```

---

## Modelos por Proveedor (Todos los Disponibles)

### Meta (Llama)
- `meta/llama2-70b` - Versión anterior (no recomendada)
- `meta/llama-3.1-8b-instruct` ✅ Usado actualmente (Fast)
- `meta/llama-3.1-70b-instruct` ✅ Usado actualmente (Smart)
- `meta/llama-3.2-1b-instruct` - Muy ligero
- `meta/llama-3.2-3b-instruct` - Ligero
- `meta/llama-3.3-70b-instruct` - Versión mejorada

### Mistral
- `mistralai/mistral-nemotron` - Especializado
- `mistralai/mixtral-8x7b-instruct` - Modelo MoE pequeño
- `mistralai/mixtral-8x22b-instruct` - Modelo MoE potente

### Microsoft
- `microsoft/phi-4-mini-instruct` - Muy ligero y eficiente
- `microsoft/phi-4-mini-flash-reasoning` - Con razonamiento

### Google
- `google/codegemma-7b` - Para código
- `google/gemma-2-2b-it` - Ligero
- `google/gemma-7b` - General

### NVIDIA (Nemotron)
- `nvidia/nemotron-3-nano-30b-a3b` - Pequeño
- `nvidia/nemotron-3-super-120b-a12b` - Potente
- `nvidia/nemotron-3-ultra-550b-a55b` - Ultra potente
- `nvidia/llama-3.3-nemotron-super-49b-v1.5` - Versión mejorada, buen balance
- `nvidia/llama-3.1-nemotron-ultra-253b-v1` - Muy potente

### Otros Proveedores
- Qwen, Deepseek, Bytedance, OpenAI (OSS), etc.

---

## Recomendaciones por Situación

### Máxima Velocidad (Scoring rápido)
```
NVIDIA_MODEL_FAST=meta/llama-3.2-3b-instruct
```

### Máxima Capacidad (Análisis profundo)
```
NVIDIA_MODEL_SMART=meta/llama-3.3-70b-instruct
```

### Balance Óptimo (Recomendado - Actual)
```
NVIDIA_MODEL_FAST=meta/llama-3.1-8b-instruct
NVIDIA_MODEL_SMART=meta/llama-3.1-70b-instruct
```

### Costo Mínimo (Para MVP/Testing)
```
NVIDIA_MODEL_FAST=microsoft/phi-4-mini-instruct
NVIDIA_MODEL_SMART=meta/llama-3.1-8b-instruct
```

---

## Notas Importantes

1. **API Key**: Necesitas `NVIDIA_API_KEY` para usar los modelos
2. **URL**: Por defecto es `https://integrate.api.nvidia.com/v1/chat/completions`
3. **Fallback**: Si NVIDIA no responde, automáticamente usa Groq
4. **Timeout**: 8 segundos por defecto
5. **JSON Mode**: Disponible en todos los modelos OpenAI-compatible
