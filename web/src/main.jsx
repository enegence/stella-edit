import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StellaEditor, StellaViewer, createEmptyDocument } from './stella-editor';
import './stella-editor/styles/stella-editor.css';

function Demo() {
  const [doc, setDoc] = useState(() => createEmptyDocument({ title: 'Stella Editor Demo' }));

  return (
    <main className="demo-shell">
      <section>
        <h1>Stella Editor</h1>
        <StellaEditor value={doc} onChange={setDoc} placeholder="Start writing..." />
      </section>
      <section>
        <h2>Viewer</h2>
        <StellaViewer value={doc} />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Demo />);
