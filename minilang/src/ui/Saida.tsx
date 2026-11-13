// Quadro 2 — entrada para os `leia` e resultado da execução (`escreva`).
import type { Resultado } from '../compiler';

interface Props {
  entrada: string;
  aoMudarEntrada: (novo: string) => void;
  resultado: Resultado;
}

export default function Saida({ entrada, aoMudarEntrada, resultado }: Props) {
  const exec = resultado.execucao;
  return (
    <section className="painel" aria-label="Resultado da execução">
      <h2>Resultado</h2>
      <div className="saida-corpo">
        <label className="entrada">
          Valores para os <code>leia</code> (separe por espaço ou linha)
          <input value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} placeholder="ex.: 6 4" spellCheck={false} />
        </label>

        <div className="terminal" role="log" aria-live="polite">
          {!exec && <p className="vazio">Corrija os erros do código para executar a regra.</p>}
          {exec && exec.saida.length === 0 && !exec.erro && <p className="vazio">A regra rodou e não escreveu nada.</p>}
          {exec?.saida.map((linha, i) => (
            <div key={i} className="linha-saida"><span>{i + 1}</span>{linha}</div>
          ))}
          {exec?.erro && <div className="erro-exec">Erro de execução: {exec.erro}</div>}
        </div>
      </div>
    </section>
  );
}
