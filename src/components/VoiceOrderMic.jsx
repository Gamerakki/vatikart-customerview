import React, { useState, useEffect, useRef, useCallback } from 'react';

const LANGUAGE_LOCALES = [
  { label: '🇬🇧 English / Hinglish', value: 'en-IN' },
  { label: '🇮🇳 हिंदी (Hindi)', value: 'hi-IN' },
  { label: '🚩 मराठी (Marathi)', value: 'mr-IN' },
];

const FILLER_KEYWORDS = [
  'add', 'to', 'cart', 'please', 'want', 'buy', 'item', 'quantity', 'quantity of',
  'kar do', 'kar', 'do', 'chahiye', 'le lo', 'le', 'lo', 'daal do', 'daal', 'de', 'bhai', 'ek',
  'kara', 'pahije', 'paahije', 'ghya', 'dya', 'taak', 'ghe',
];

export default function VoiceOrderMic({ products, onAddToCart }) {
  const [isListening, setIsListening] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState('en-IN');
  const [transcript, setTranscript] = useState('');
  const [matchStatus, setMatchStatus] = useState('');
  const [recognition, setRecognition] = useState(null);
  const productsRef = useRef(products);
  const onAddToCartRef = useRef(onAddToCart);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    onAddToCartRef.current = onAddToCart;
  }, [onAddToCart]);

  const parseVoiceCommand = useCallback((rawText) => {
    const text = rawText.toLowerCase();

    const digitMatch = text.match(/\d+/);
    const qty = digitMatch ? parseInt(digitMatch[0], 10) : 1;

    let cleanText = text.replace(/\d+/g, '');
    FILLER_KEYWORDS.forEach((word) => {
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleanText = cleanText.replace(regex, '');
    });

    const keywords = cleanText.trim().split(/\s+/).filter((w) => w.length > 2);

    if (keywords.length === 0) {
      setMatchStatus('Could not identify product keyword.');
      return;
    }

    const matchedProduct = productsRef.current.find((prod) => {
      const prodName = prod.name.toLowerCase();
      return keywords.every((kw) => prodName.includes(kw));
    });

    if (matchedProduct) {
      onAddToCartRef.current(matchedProduct, qty);
      setMatchStatus(`Added ${qty}x ${matchedProduct.name} to cart! 🎉`);
    } else {
      setMatchStatus(`No match found for: "${keywords.join(' ')}"`);
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsListening(true);
      setMatchStatus('Listening...');
    };

    rec.onerror = () => {
      setIsListening(false);
      setMatchStatus('Error matching voice. Try again.');
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (e) => {
      const text = e.results[0][0].transcript || '';
      setTranscript(text);
      parseVoiceCommand(text);
    };

    setRecognition(rec);

    return () => {
      try {
        rec.abort();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [parseVoiceCommand]);

  const toggleListen = () => {
    if (!recognition) {
      alert('Voice recognition not supported in this browser. Try Chrome or Safari.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.lang = selectedLocale;
      recognition.start();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <select
          value={selectedLocale}
          onChange={(e) => setSelectedLocale(e.target.value)}
          style={styles.select}
        >
          {LANGUAGE_LOCALES.map((loc) => (
            <option key={loc.value} value={loc.value}>{loc.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={toggleListen}
          style={{
            ...styles.micBtn,
            backgroundColor: isListening ? '#EF4444' : '#0D9488',
          }}
        >
          {isListening ? '🛑 Stop' : '🎤 Order by Voice'}
        </button>
      </div>

      {transcript ? (
        <p style={styles.transcript}>
          Spoken: <i>&quot;{transcript}&quot;</i>
        </p>
      ) : null}

      {matchStatus ? (
        <p style={{
          ...styles.status,
          color: matchStatus.includes('Added') ? '#10B981' : '#F59E0B',
        }}
        >
          {matchStatus}
        </p>
      ) : null}
    </div>
  );
}

const styles = {
  container: { padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', marginBottom: '16px' },
  row: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  select: { padding: '8px', borderRadius: '6px', border: '1px solid var(--accent-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '12px' },
  micBtn: { padding: '8px 14px', borderRadius: '6px', color: '#FFF', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '12px' },
  transcript: { fontSize: '12px', marginTop: '6px', color: 'var(--text-secondary)' },
  status: { fontSize: '12px', fontWeight: 'bold', marginTop: '4px' },
};
