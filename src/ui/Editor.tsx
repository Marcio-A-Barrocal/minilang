// Quadro 1 — editor do código MiniLang, com numeração de linhas e marcas de erro.
import { useRef } from 'react';
import type { RefObject } from 'react';

interface Props {
  codigo: string;
  aoMudar: (novo: string) => void;
  /** linha -> severidade, para pintar o número da linha */
  marcas: Map<number, 'erro' | 'aviso'>;
  areaRef: RefObject<HTMLTextAreaElement>;
}

export default function Editor({ codigo, aoMudar, marcas, areaRef }: Props) {
  const numerosRef = useRef<HTMLDivElement>(null);
  const total = codigo.split('\n').length;

  return (
    <section className="painel" aria-label="Código MiniLang">
      <h2>Código MiniLang</h2>
      <div className="editor-corpo">
        <div className="numeros" ref={numerosRef} aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`n ${marcas.get(i + 1) ?? ''}`}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={areaRef}
          value={codigo}
          spellCheck={false}
          wrap="off"
          aria-label="Código da regra em MiniLang"
          onChange={(e) => aoMudar(e.target.value)}
          onScroll={(e) => {
            if (numerosRef.current) numerosRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
        />
      </div>
    </section>
  );
}
