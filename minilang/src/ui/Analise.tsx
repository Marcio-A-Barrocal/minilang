// Quadro 3 — o que o compilador entendeu: veredito, fases e abas
// (mensagens, árvore, símbolos, tokens). Só mostra dados; não calcula nada.
import { useState } from 'react';
import { formatar } from '../compiler';
import type { Diagnostico, Resultado, StatusFase } from '../compiler';
import Arvore from './Arvore';

type Aba = 'mensagens' | 'arvore' | 'simbolos' | 'tokens';

const FASES = [
  ['lexico', 'Léxico', 'texto → tokens'],
  ['sintatico', 'Sintático', 'tokens → árvore'],
  ['semantico', 'Semântico', 'árvore → significado'],
] as const;

const STATUS: Record<StatusFase, string> = { ok: 'aprovado', erro: 'recusado', pulada: 'não executado' };

interface Props {
  resultado: Resultado;
  aoClicarMensagem: (d: Diagnostico) => void;
}

export default function Analise({ resultado: r, aoClicarMensagem }: Props) {
  const [aba, setAba] = useState<Aba>('arvore');
  const erros = r.diagnosticos.filter((d) => d.severidade === 'erro').length;
  const avisos = r.diagnosticos.length - erros;

  const veredito = r.aprovado
    ? avisos > 0 ? `Regra pronta para enviar, com ${avisos} aviso${avisos > 1 ? 's' : ''}.` : 'Regra pronta para enviar ao equipamento.'
    : `Regra recusada: corrija ${erros} erro${erros > 1 ? 's' : ''} antes de enviar.`;

  const abas: [Aba, string][] = [
    ['arvore', 'Árvore'],
    ['mensagens', `Mensagens (${r.diagnosticos.length})`],
    ['simbolos', `Símbolos (${r.simbolos.length})`],
    ['tokens', `Tokens (${r.tokens.length})`],
  ];

  return (
    <section className="painel" aria-label="Análise do compilador">
      <h2>Análise</h2>
      <div className={`veredito ${r.aprovado ? 'ok' : 'erro'}`} role="status">{veredito}</div>

      <ol className="fases">
        {FASES.map(([chave, nome, desc]) => (
          <li key={chave} className={r.fases[chave]}>
            <span>{nome} <small>{desc}</small></span>
            <b>{STATUS[r.fases[chave]]}</b>
          </li>
        ))}
      </ol>

      <div className="abas" role="tablist">
        {abas.map(([id, rotulo]) => (
          <button key={id} role="tab" aria-selected={aba === id} className={aba === id ? 'ativa' : ''} onClick={() => setAba(id)}>
            {rotulo}
          </button>
        ))}
      </div>

      <div className="aba-corpo" role="tabpanel">
        {aba === 'mensagens' && (r.diagnosticos.length === 0
          ? <p className="vazio">Nenhum erro nem aviso.</p>
          : <ul className="mensagens">
              {r.diagnosticos.map((d, i) => (
                <li key={i} className={d.severidade}>
                  <button onClick={() => aoClicarMensagem(d)} title="Ir para o local no código">{formatar(d)}</button>
                </li>
              ))}
            </ul>)}

        {aba === 'arvore' && (r.arvore
          ? <Arvore raiz={r.arvore} />
          : <p className="vazio">A árvore só é construída depois que o código passa pelo léxico e pelo sintático.</p>)}

        {aba === 'simbolos' && (r.simbolos.length === 0
          ? <p className="vazio">A tabela de símbolos é preenchida na análise semântica.</p>
          : <div className="rolagem"><table>
              <thead><tr><th>Nome</th><th>Tipo</th><th>Escopo</th><th>Declarada em</th><th>Recebe valor</th><th>Usos</th></tr></thead>
              <tbody>{r.simbolos.map((s, i) => (
                <tr key={i}>
                  <td className="mono">{s.nome}</td><td>{s.tipo}</td><td>{s.escopo}</td>
                  <td className="mono">{s.linha}:{s.coluna}</td><td>{s.inicializada ? 'sim' : 'não'}</td><td>{s.usos}</td>
                </tr>
              ))}</tbody>
            </table></div>)}

        {aba === 'tokens' && (r.tokens.length === 0
          ? <p className="vazio">Nenhum token reconhecido.</p>
          : <div className="rolagem"><table>
              <thead><tr><th>Token</th><th>Lexema</th><th>Lin</th><th>Col</th></tr></thead>
              <tbody>{r.tokens.map((t, i) => (
                <tr key={i}><td>{t.tipo}</td><td className="mono">{t.lexema}</td><td>{t.linha}</td><td>{t.coluna}</td></tr>
              ))}</tbody>
            </table></div>)}
      </div>
    </section>
  );
}
