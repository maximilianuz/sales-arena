import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';

export default function StagesEditor({ stages, setStages }) {
  const [expandedId, setExpandedId] = useState(null);
  const fileInputRef = useRef(null);

  const addStage = () => {
    const newStage = {
      id: `stage_${Date.now()}`,
      label: 'Nueva Etapa',
      objective: '',
      indicator: '',
      baseQuestions: '',
      baseObjections: ''
    };
    setStages([...stages, newStage]);
    setExpandedId(newStage.id);
  };

  const removeStage = (id) => {
    setStages(stages.filter(s => s.id !== id));
  };

  const updateStage = (id, field, value) => {
    setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const moveStage = (index, direction) => {
    const newStages = [...stages];
    if (direction === 'up' && index > 0) {
      [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
    } else if (direction === 'down' && index < newStages.length - 1) {
      [newStages[index + 1], newStages[index]] = [newStages[index], newStages[index + 1]];
    }
    setStages(newStages);
  };

  const exportMyStages = () => {
    const headers = ['Etapa', 'Tiempo Estimado', 'Objetivo', 'Indicador de Éxito', 'Preguntas Base', 'Objeciones Base'];
    const rows = stages.map(s => [
      s.label,
      s.estimatedTime || '',
      s.objective,
      s.indicator,
      s.baseQuestions,
      s.baseObjections
    ].map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','));
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mis_etapas_ventas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const headers = ['Etapa', 'Tiempo Estimado', 'Objetivo', 'Indicador de Éxito', 'Preguntas Base', 'Objeciones Base'];
    const genericStages = [
      ['1. Apertura', '5', 'Crear un ambiente de confianza y romper el hielo.', 'El cliente responde de forma relajada.', '¿De dónde nos acompañas hoy? ¿Cómo va tu semana?', '"Solo quiero saber el precio" -> (Aclarar que primero necesitan ver si pueden ayudar)'],
      ['2. Calificación', '15', 'Entender el problema actual del cliente y sus necesidades.', 'El cliente expresa claramente su desafío.', '¿Cuál es el mayor desafío que enfrentas hoy? ¿Qué has intentado para solucionarlo?', '"No tengo mucho tiempo" -> (Asegurar que la llamada será directa al punto)'],
      ['3. Presentación', '15', 'Mostrar cómo el servicio/producto resuelve el problema.', 'El cliente asiente y muestra interés en la solución.', 'En base a lo que me cuentas, así es como podemos ayudarte...', '"No sé si funcionará en mi caso" -> (Mostrar un ejemplo similar)'],
      ['4. Propuesta y Cierre', '10', 'Presentar la oferta económica y próximos pasos.', 'El cliente acepta la propuesta o pide el contrato.', 'El valor de la inversión es X. ¿Te gustaría que avancemos?', '"Es muy caro" / "Tengo que pensarlo" -> (Volver al valor y aclarar dudas)']
    ];
    
    const rows = genericStages.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','));
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_ejemplo_etapas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const importFromCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Simple CSV parser supporting quotes
      const rows = [];
      let currentRow = [];
      let currentCell = '';
      let insideQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          currentRow.push(currentCell);
          currentCell = '';
        } else if ((char === '\\n' || (char === '\\r' && nextChar === '\\n')) && !insideQuotes) {
          if (char === '\\r') i++; // skip \\n
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
      }

      // First row is headers. Map remaining rows to stages
      const newStages = rows.slice(1).filter(r => r.length >= 1 && r.some(c => c.trim() !== '')).map((row, idx) => ({
        id: `stage_${Date.now()}_${idx}`,
        label: row[0] || '',
        estimatedTime: parseInt(row[1]) || 5,
        objective: row[2] || '',
        indicator: row[3] || '',
        baseQuestions: row[4] || '',
        baseObjections: row[5] || ''
      }));

      if (newStages.length > 0) {
        setStages(newStages);
        alert('Plantilla cargada correctamente.');
      } else {
        alert('El archivo CSV parece estar vacío o no es válido.');
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Etapas del Embudo</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={importFromCSV} 
            style={{ display: 'none' }} 
          />
          <button className="btn btn-outline" onClick={handleImportClick} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            <Upload size={16} /> Subir CSV
          </button>
          <button className="btn btn-outline" onClick={downloadTemplate} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}>
            <Download size={16} /> Bajar Plantilla Ejemplo
          </button>
          <button className="btn btn-outline" onClick={exportMyStages} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--success)', color: 'var(--success)' }}>
            <Download size={16} /> Exportar Mis Etapas
          </button>
          <button className="btn btn-outline" onClick={addStage} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
            <Plus size={16} /> Añadir Etapa
          </button>
        </div>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {stages.map((stage, index) => {
          const isExpanded = expandedId === stage.id;

          return (
            <div key={stage.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--glass-border)' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : stage.id)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginRight: '0.5rem' }}>
                  <button onClick={(e) => { e.stopPropagation(); moveStage(index, 'up'); }} disabled={index === 0} style={{ background: 'transparent', border: 'none', color: index === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)', cursor: index === 0 ? 'default' : 'pointer' }}><ChevronUp size={14}/></button>
                  <button onClick={(e) => { e.stopPropagation(); moveStage(index, 'down'); }} disabled={index === stages.length - 1} style={{ background: 'transparent', border: 'none', color: index === stages.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)', cursor: index === stages.length - 1 ? 'default' : 'pointer' }}><ChevronDown size={14}/></button>
                </div>
                
                <div style={{ flex: 1, fontWeight: 'bold', color: 'var(--primary)' }}>
                  {index + 1}. {stage.label || 'Sin Título'}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.25rem', border: 'none', color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); removeStage(stage.id); }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 3 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Nombre de la Etapa</label>
                      <input type="text" value={stage.label} onChange={e => updateStage(stage.id, 'label', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tiempo (min)</label>
                      <input type="number" min="1" value={stage.estimatedTime || ''} onChange={e => updateStage(stage.id, 'estimatedTime', parseInt(e.target.value) || 0)} placeholder="Ej. 5" style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Objetivo</label>
                      <input type="text" value={stage.objective} onChange={e => updateStage(stage.id, 'objective', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Indicador de Éxito</label>
                      <input type="text" value={stage.indicator} onChange={e => updateStage(stage.id, 'indicator', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Información Base: Estructura de Preguntas</label>
                    <textarea 
                      value={stage.baseQuestions} 
                      onChange={e => updateStage(stage.id, 'baseQuestions', e.target.value)} 
                      placeholder="Ej. Preguntas para romper el hielo..."
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '60px', resize: 'vertical' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Información Base: Objeciones Esperadas</label>
                    <textarea 
                      value={stage.baseObjections} 
                      onChange={e => updateStage(stage.id, 'baseObjections', e.target.value)} 
                      placeholder="Ej. 'Me parece caro'. Resolución: Aislar y buscar la falta de valor..."
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '80px', resize: 'vertical' }} 
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
