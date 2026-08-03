# 🔀 Configuración Dual NVIDIA + Groq

## Descripción General

Esta configuración proporciona **máxima redundancia y flexibilidad**:
- 2 APIs de NVIDIA con modelos diferentes
- Groq como fallback final
- Conmutación automática en caso de fallo

```
┌─────────────────────────────────────────────────────┐
│  Solicitud de IA                                     │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   NVIDIA #1 (API 1)  │  meta/llama-3.1-70b
        │   nvapi_KEY_1        │  (Principal)
        └──────────┬──────────┘
                   │ ✓ OK → Respuesta
                   │ ✗ Falla (429, 5xx, timeout)
                   │
        ┌──────────▼──────────┐
        │   NVIDIA #2 (API 2)  │  meta/llama-3.3-70b
        │   nvapi_KEY_2        │  (Modelo diferente)
        └──────────┬──────────┘
                   │ ✓ OK → Respuesta
                   │ ✗ Falla
                   │
        ┌──────────▼──────────┐
        │    Groq (Fallback)   │  llama-3.3-70b-versatile
        │    gsk_KEY           │
        └──────────┬──────────┘
                   │ ✓ OK → Respuesta
                   │ ✗ Todos flan → Error
                   ▼
```

---

## Configuración Paso a Paso

### Paso 1: Obtener 2 API Keys de NVIDIA

```bash
# Ir a https://build.nvidia.com/
# Puede usar la MISMA cuenta para obtener múltiples keys

1. Login a https://build.nvidia.com/
2. Ir a "API Keys" o "My Account"
3. Generar API Key #1 → Copiar
4. Generar API Key #2 → Copiar (puede ser la misma cuenta)
```

### Paso 2: Configurar Variables de Entorno

#### Opción A: `.env.local` (Recomendado)
```bash
# NVIDIA #1 - Principal
NVIDIA_API_KEY=nvapi_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NVIDIA_URL=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_MODEL_FAST=meta/llama-3.1-8b-instruct
NVIDIA_MODEL_SMART=meta/llama-3.1-70b-instruct

# NVIDIA #2 - Secundaria con modelo diferente
NVIDIA_API_KEY_2=nvapi_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
NVIDIA_URL_2=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_2_MODEL_FAST=meta/llama-3.2-3b-instruct
NVIDIA_2_MODEL_SMART=meta/llama-3.3-70b-instruct

# Groq - Fallback final
GROQ_API_KEY=gsk_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
```

#### Opción B: Variables de Entorno del Sistema
```bash
export NVIDIA_API_KEY="nvapi_xxx"
export NVIDIA_API_KEY_2="nvapi_yyy"
export GROQ_API_KEY="gsk_zzz"
export NVIDIA_2_MODEL_SMART="meta/llama-3.3-70b-instruct"
```

#### Opción C: Netlify Environment
Si usas Netlify, agregar en:
```
Netlify Dashboard → Site settings → Build & deploy → Environment
```

### Paso 3: Verificar Configuración

```bash
# Test que la configuración es correcta
# (Dentro de un script o función Netlify)

console.log('NVIDIA #1 configurado:', !!process.env.NVIDIA_API_KEY);
console.log('NVIDIA #2 configurado:', !!process.env.NVIDIA_API_KEY_2);
console.log('Groq configurado:', !!process.env.GROQ_API_KEY);
```

---

## Estrategias de Configuración

### 📊 Estrategia 1: Máxima Redundancia (Recomendada)
Dos instancias idénticas, máxima confiabilidad:
```bash
# NVIDIA #1
NVIDIA_MODEL_FAST=meta/llama-3.1-8b-instruct
NVIDIA_MODEL_SMART=meta/llama-3.1-70b-instruct

# NVIDIA #2
NVIDIA_2_MODEL_FAST=meta/llama-3.1-8b-instruct
NVIDIA_2_MODEL_SMART=meta/llama-3.1-70b-instruct
```

**Ventaja**: Si #1 falla, #2 tiene capacidad similar
**Caso de uso**: Producción, máxima disponibilidad

---

### ⚡ Estrategia 2: Balance Costo/Velocidad
#1 rápido/barato, #2 potente:
```bash
# NVIDIA #1 - Rápido y económico
NVIDIA_MODEL_FAST=meta/llama-3.2-3b-instruct
NVIDIA_MODEL_SMART=meta/llama-3.1-8b-instruct

# NVIDIA #2 - Más potente si #1 no es suficiente
NVIDIA_2_MODEL_FAST=meta/llama-3.1-8b-instruct
NVIDIA_2_MODEL_SMART=meta/llama-3.1-70b-instruct
```

**Ventaja**: Reduce costos usando #1, fallback potente en #2
**Caso de uso**: Producción con presupuesto limitado

---

### 🚀 Estrategia 3: Máxima Velocidad
Dos instancias rápidas:
```bash
# NVIDIA #1 - Muy rápido
NVIDIA_MODEL_FAST=meta/llama-3.2-3b-instruct
NVIDIA_MODEL_SMART=meta/llama-3.1-8b-instruct

# NVIDIA #2 - También rápido
NVIDIA_2_MODEL_FAST=meta/llama-3.2-1b-instruct
NVIDIA_2_MODEL_SMART=meta/llama-3.2-3b-instruct
```

**Ventaja**: Latencia muy baja
**Caso de uso**: Aplicaciones en tiempo real

---

### 🧪 Estrategia 4: Testing de Modelos
Probar diferentes modelos:
```bash
# NVIDIA #1 - Modelo establecido
NVIDIA_MODEL_FAST=meta/llama-3.1-8b-instruct
NVIDIA_MODEL_SMART=meta/llama-3.1-70b-instruct

# NVIDIA #2 - Modelo en testing
NVIDIA_2_MODEL_FAST=mistralai/mixtral-8x7b-instruct
NVIDIA_2_MODEL_SMART=mistralai/mixtral-8x22b-instruct
```

**Ventaja**: Experimenta sin afectar producción
**Caso de uso**: A/B testing, benchmarking

---

## Monitoreo y Logs

### Ver qué proveedor se está usando:

En los logs de Netlify, busca:
```
{ content: "...", provider: "nvidia-1", model: "..." }
{ content: "...", provider: "nvidia-2", model: "..." }
{ content: "...", provider: "groq", model: "..." }
```

### Interpretar fallbacks:

```
nvidia-1: HTTP 429    → Límite alcanzado, pasa a #2
nvidia-1: timeout     → Sin respuesta, pasa a #2
nvidia-2: HTTP 401    → API key inválida, pasa a Groq
groq: HTTP 500        → Error del servidor, retorna error
```

---

## Troubleshooting

### Problema: Ambas NVIDIA fallan, ¿por qué?

**Posibles causas**:
1. API keys inválidas/expiradas
2. Límite de uso alcanzado en ambas
3. Región/IP bloqueada
4. Modelos no disponibles

**Solución**:
- Verificar API keys en https://build.nvidia.com/
- Regenerar si es necesario
- Verificar cuota de uso
- Cambiar modelo a uno más popular

### Problema: NVIDIA #1 siempre falla

**Solución**:
1. Verificar API key: `NVIDIA_API_KEY`
2. Probar en playground: https://build.nvidia.com/
3. Si falla, usar solo #2 (comentar NVIDIA_API_KEY)
4. Groq como principal temporalmente

### Problema: Groq sobrecargado

**Solución**:
- Es normal en horas pico
- Volver a intentar en 60 segundos
- Considerar agregar más keys de NVIDIA

---

## Casos de Uso Reales

### 📱 Startup/MVP
```
NVIDIA #1: llama-3.1-8b (rápido)
NVIDIA #2: Sin configurar (opcional)
Groq: Como fallback
```

### 🏢 Producción Pequeña
```
NVIDIA #1: llama-3.1-70b (principal)
NVIDIA #2: llama-3.3-70b (redundancia)
Groq: Fallback final
```

### 🚀 Producción a Escala
```
NVIDIA #1: llama-3.1-70b (primario)
NVIDIA #2: llama-3.3-70b (redundancia)
Groq: Fallback
+ Posible agregación de más proveedores
```

### 🧪 Testing/Experimentación
```
NVIDIA #1: Modelo establec ido
NVIDIA #2: Modelo nuevo a probar
Groq: Fallback para comparar
```

---

## Diferencias de Modelos

| Modelo | Velocidad | Capacidad | Costo | Caso |
|--------|-----------|-----------|-------|------|
| `llama-3.2-1b` | ⭐⭐⭐⭐⭐ | ⭐ | $ | Ultra ligero |
| `llama-3.2-3b` | ⭐⭐⭐⭐ | ⭐⭐ | $ | Rápido |
| `llama-3.1-8b` | ⭐⭐⭐ | ⭐⭐⭐ | $$ | Balance |
| `llama-3.1-70b` | ⭐⭐ | ⭐⭐⭐⭐⭐ | $$$ | Potente |
| `llama-3.3-70b` | ⭐⭐ | ⭐⭐⭐⭐⭐ | $$$ | Mejorado |
| `mixtral-8x22b` | ⭐ | ⭐⭐⭐⭐⭐ | $$$$ | Ultra potente |

---

## Tips & Tricks

✅ **Usa el mismo modelo en ambas NVIDIA** si necesitas máxima disponibilidad
✅ **Usa modelos diferentes** si quieres A/B testing o redundancia con variedad
✅ **Monitorea logs** para ver qué proveedor está siendo más usado
✅ **Rota API keys** periódicamente por seguridad
✅ **Ten Groq como fallback** para máxima confiabilidad
❌ **No ignores errores de API key** - válida en build.nvidia.com
❌ **No confundas** NVIDIA_API_KEY con NVIDIA_API_KEY_2

---

## Próximos Pasos

1. ✅ Configurar NVIDIA #1 (básico)
2. ✅ Agregar NVIDIA #2 (redundancia)
3. ✅ Probar con equipos
4. 📊 Monitorear logs
5. 🔧 Ajustar modelos según necesidad
6. (Opcional) Agregar más proveedores
