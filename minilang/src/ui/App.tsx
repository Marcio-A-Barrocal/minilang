// Tela principal: só junta os três quadros e guarda o estado (código e entrada).
import { useMemo, useRef, useState } from 'react';
import { compilar, EXEMPLOS } from '../compiler';
import type { Diagnostico } from '../compiler';
import Analise from './Analise';
import Editor from './Editor';
import Saida from './Saida';

export default function App() {
  const [codigo, setCodigo] = useState(EXEMPLOS[2].codigo);
  const [entrada, setEntrada] = useState(EXEMPLOS[2].entrada ?? '');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Toda a inteligência está em compiler/; aqui só chamamos compilar().
  const resultado = useMemo(() => compilar(codigo, entrada), [codigo, entrada]);

  const marcas = new Map<number, 'erro' | 'aviso'>();
  for (const d of resultado.diagnosticos) {
    if (marcas.get(d.linha) !== 'erro') marcas.set(d.linha, d.severidade);
  }

  const irPara = (d: Diagnostico) => {
    const ta = areaRef.current;
    if (!ta) return;
    const linhas = codigo.split('\n');
    let desloc = d.coluna - 1;
    for (let i = 0; i < d.linha - 1 && i < linhas.length; i++) desloc += linhas[i].length + 1;
    ta.focus();
    ta.setSelectionRange(desloc, Math.min(desloc + 1, codigo.length));
  };

  const carregar = (id: string) => {
    const ex = EXEMPLOS.find((e) => e.id === id);
    if (!ex) return;
    setCodigo(ex.codigo);
    setEntrada(ex.entrada ?? '');
  };

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>MiniLang</h1>
          <p>Escreva a regra, confira se está correta e veja o resultado antes de enviá-la ao equipamento.</p>
        </div>
        <label className="exemplos">
          Carregar exemplo
          <select value="" onChange={(e) => carregar(e.target.value)}>
            <option value="" disabled>Escolha…</option>
            <optgroup label="Regras aceitas">
              {EXEMPLOS.filter((e) => e.grupo === 'aceita').map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
            </optgroup>
            <optgroup label="Regras recusadas">
              {EXEMPLOS.filter((e) => e.grupo === 'recusa').map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
            </optgroup>
          </select>
        </label>
      </header>

      <main className="grade">
        <div className="coluna">
          <Editor codigo={codigo} aoMudar={setCodigo} marcas={marcas} areaRef={areaRef} />
          <Saida entrada={entrada} aoMudarEntrada={setEntrada} resultado={resultado} />
        </div>
        <Analise resultado={resultado} aoClicarMensagem={irPara} />
      </main>
    </div>
  );
}
