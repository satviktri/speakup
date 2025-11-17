import { useEffect, useRef, useState } from 'react';

const REFERENCES_MARKER = '\n\nReferences\n';

export default function Home() {
  const [content, setContent] = useState('');
  const [listening, setListening] = useState(false);
  const [citationResults, setCitationResults] = useState([]);
  const [selectedCitationStyle] = useState('APA');
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleSpeechResult = async (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) {
        transcript += result[0].transcript + ' ';
      }
    }
    const clean = transcript.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (lower.startsWith('cite ')) {
      const query = clean.slice(5).trim();
      if (query) await searchCitations(query);
      return;
    }
    if (lower.startsWith('add citation ')) {
      const query = clean.slice(13).trim();
      if (query) await searchCitations(query);
      return;
    }
    setContent((prev) => {
      if (!prev.trim()) {
        return clean;
      }
      const needsSpace = /[\s\n]$/.test(prev);
      return `${prev}${needsSpace ? '' : ' '}${clean}`;
    });
  };

  const handleToggleDictation = () => {
    if (listening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = handleSpeechResult;
    recognition.start();
    recognitionRef.current = recognition;
  };

  const searchCitations = async (query) => {
    try {
      const res = await fetch('/api/cite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setCitationResults(data.results || []);
    } catch (err) {
      console.error(err);
      setCitationResults([]);
    }
  };

  const handleInsertCitation = async (item) => {
    try {
      const res = await fetch('/api/formatCitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, style: selectedCitationStyle })
      });
      const data = await res.json();
      const inText = ` (${data.inText})`;
      setContent((prev) => {
        const textarea = textareaRef.current;
        const marker = REFERENCES_MARKER;
        let body = prev;
        let refs = '';
        const markerIndex = prev.indexOf(marker);
        if (markerIndex !== -1) {
          body = prev.slice(0, markerIndex);
          refs = prev.slice(markerIndex + marker.length);
        }
        let start = body.length;
        let end = body.length;
        if (textarea) {
          start = Math.min(textarea.selectionStart, body.length);
          end = Math.min(textarea.selectionEnd, body.length);
        }
        const before = body.slice(0, start);
        const after = body.slice(end);
        const updatedBody = `${before}${inText}${after}`;
        const trimmedBody = updatedBody.trimEnd();
        const trimmedRefs = refs.trim();
        const updatedRefs = trimmedRefs ? `${trimmedRefs}\n${data.full}` : data.full;
        const finalText = `${trimmedBody}${marker}${updatedRefs}\n`;
        setTimeout(() => {
          if (textarea) {
            const pos = start + inText.length;
            textarea.selectionStart = pos;
            textarea.selectionEnd = pos;
            textarea.focus();
          }
        }, 0);
        return finalText;
      });
      setCitationResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImproveParagraph = async () => {
    if (!content.trim()) return;
    const marker = REFERENCES_MARKER;
    let body = content;
    let refs = '';
    const markerIndex = content.indexOf(marker);
    if (markerIndex !== -1) {
      body = content.slice(0, markerIndex);
      refs = content.slice(markerIndex);
    }
    const paragraphs = body.split(/\n\n+/);
    const last = paragraphs.pop();
    if (!last || !last.trim()) return;
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: last })
      });
      const data = await res.json();
      paragraphs.push(data.improvedText || last);
      const newBody = paragraphs.join('\n\n');
      setContent(`${newBody}${refs}`);
    } catch (err) {
      console.error(err);
    }
  };

  const renderCitationResults = () => {
    if (!citationResults.length) {
      return (
        <div className="text-sm text-gray-500">
          Citation suggestions will appear here when you say "cite ...".
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {citationResults.map((item) => (
          <div key={item.doi} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="text-xs text-gray-600">{item.authors}</div>
            <div className="text-xs text-gray-600">{item.journal}</div>
            <div className="text-xs text-gray-600">{item.year}</div>
            <button
              className="mt-3 rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-100"
              onClick={() => handleInsertCitation(item)}
            >
              Insert Citation
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
        <h1 className="text-lg font-semibold">Academic Voice Writer</h1>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium border ${
            listening ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}
          onClick={handleToggleDictation}
        >
          {listening ? 'Stop Dictation' : 'Start Dictation'}
        </button>
      </header>
      <main className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
        <section className="md:col-span-2 space-y-4">
          <textarea
            ref={textareaRef}
            className="h-96 w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm focus:outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start dictating or type your academic manuscript here..."
          />
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={handleImproveParagraph}
          >
            Improve Last Paragraph
          </button>
        </section>
        <aside className="md:col-span-1 rounded-lg border border-dashed border-gray-300 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Citations ({selectedCitationStyle})</h2>
          <div className="mt-4">{renderCitationResults()}</div>
        </aside>
      </main>
    </div>
  );
}
