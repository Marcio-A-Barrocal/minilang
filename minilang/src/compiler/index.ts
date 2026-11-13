// PIPELINE — liga as fases: léxico -> sintático -> semântico -> execução.
// Cada fase só roda se a anterior não teve erro. Esta pasta não conhece a interface.
import { executar } from './execucao/interpretador';
import type { ResultadoExecucao } from './execucao/interpretador';
import { analisarLexico } from './lexico/lexer';
import type { Programa } from './sintatico/ast';
import { analisarSintaxe } from './sintatico/parser';
import { paraArvore } from './sintatico/tree';
import type { NoArvore } from './sintatico/tree';
import { analisarSemantica } from './semantico/semantic';
import type { Simbolo } from './semantico/symbols';
import type { Diagnostico, Token } from './types';

export type StatusFase = 'ok' | 'erro' | 'pulada';

export interface Resultado {
  tokens: Token[];                              // fase 1
  ast: Programa | null;                         // fase 2
  arvore: NoArvore | null;                      // fase 2 (para desenhar)
  simbolos: readonly Simbolo[];                 // fase 3
  diagnosticos: Diagnostico[];                  // erros e avisos de todas as fases
  fases: { lexico: StatusFase; sintatico: StatusFase; semantico: StatusFase };
  aprovado: boolean;                            // true = nenhum erro (avisos não bloqueiam)
  execucao: ResultadoExecucao | null;           // fase 4 (só se aprovado)
}

const temErro = (d: Diagnostico[]) => d.some((x) => x.severidade === 'erro');

export function compilar(fonte: string, entrada = ''): Resultado {
  // 1. Léxico: texto -> tokens
  const lex = analisarLexico(fonte);
  const r: Resultado = {
    tokens: lex.tokens, ast: null, arvore: null, simbolos: [],
    diagnosticos: [...lex.erros],
    fases: { lexico: 'ok', sintatico: 'pulada', semantico: 'pulada' },
    aprovado: false, execucao: null,
  };
  if (temErro(lex.erros)) { r.fases.lexico = 'erro'; return r; }

  // 2. Sintático: tokens -> árvore
  const sin = analisarSintaxe(lex.tokens, lex.fim);
  r.diagnosticos.push(...sin.erros);
  if (temErro(sin.erros)) { r.fases.sintatico = 'erro'; return r; }
  r.fases.sintatico = 'ok';
  r.ast = sin.ast;
  r.arvore = paraArvore(sin.ast);

  // 3. Semântico: árvore + tabela de símbolos -> erros de significado
  const sem = analisarSemantica(sin.ast);
  r.diagnosticos.push(...sem.diagnosticos);
  r.simbolos = sem.simbolos;
  r.fases.semantico = temErro(sem.diagnosticos) ? 'erro' : 'ok';
  r.aprovado = r.fases.semantico === 'ok';
  if (!r.aprovado) return r;

  // 4. Execução: roda a regra aprovada
  r.execucao = executar(sin.ast, entrada);
  return r;
}

export { formatar } from './types';
export type { Diagnostico, Token } from './types';
export type { Simbolo } from './semantico/symbols';
export type { NoArvore } from './sintatico/tree';
export { emTexto } from './sintatico/tree';
export { EXEMPLOS } from './exemplos';
