import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ProductPanel({ productPresentation, updateProductPresentation, isReadOnly }) {
  const { t } = useTranslation();
  const [text, setText] = useState(productPresentation || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(productPresentation || '');
  }, [productPresentation]);

  const handleSave = async () => {
    if (updateProductPresentation) {
      setIsSaving(true);
      await updateProductPresentation(text);
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={20} />
          {t('product.title')}
        </div>
        {!isReadOnly && updateProductPresentation && (
          <button 
            className="btn btn-primary" 
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? t('product.saving') : t('product.save')}
          </button>
        )}
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '1rem' }}>
        {isReadOnly ? (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1rem', padding: '0.5rem' }}>
            {productPresentation || t('product.empty')}
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('product.placeholder')}
            style={{
              flex: 1,
              width: '100%',
              minHeight: '150px',
              padding: '1rem',
              borderRadius: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              border: '1px solid var(--glass-border)',
              fontSize: '1rem',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        )}
      </div>
    </div>
  );
}
