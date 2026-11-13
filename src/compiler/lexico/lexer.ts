// Etapa 2 — Analisador léxico (porte para TypeScript do lexer.py).
// Cada expressão regular da Etapa 1 é uma linha de PADROES; a ordem da
// lista é a prioridade (vale a primeira alternativa que casar).
import type { Diagnostico, NomeToken, Token } from '../types';

export const RESERVADAS: ReadonlySet<string> = new Set([
  'inteiro', 'real', 'logico', 'se', 'senao', 'enquanto',
  'verdadeiro', 'falso', 'e', 'ou', 'nao', 'leia', 'escreva',
]);

const PADROES: ReadonlyArray<readonly [string, string]> = [
  ['COMENTARIO', String.raw`//[^\n]*`],             // descartado
  ['ESPACO', String.raw`[ \t\r\n]+`],               // descartado
  ['NUMERO_BRUTO', String.raw`[0-9][0-9A-Za-z.]*`], // número ou erro
  ['ID', String.raw`[a-zA-Z][a-zA-Z0-9]*`],         // ID ou reservada
  ['OP_REL', String.raw`==|<|>`],
  ['ATRIB', '='],
  ['OP_ARIT', String.raw`[+\-*/]`],
  ['DELIM', String.raw`[(){};]`],
  ['INVALIDO', String.raw`[\s\S]`],                 // qualquer outro caractere
];

const MESTRE = new RegExp(PADROES.map(([n, p]) => `(?<${n}>${p})`).join('|'), 'g');
const NUM = /^[0-9]+$/;
const REAL = /^[0-9]+\.[0-9]+$/;

export interface ResultadoLexico {
  tokens: Token[];
  erros: Diagnostico[];
  /** Posição logo após o último caractere (usada para o token de fim). */
  fim: { linha: number; coluna: number };
}

export function analisarLexico(texto: string): ResultadoLexico {
  const tokens: Token[] = [];
  const erros: Diagnostico[] = [];
  let linha = 1;
  let inicioLinha = 0;

  const erro = (mensagem: string, l: number, c: number) =>
    erros.push({ fase: 'lexico', severidade: 'erro', mensagem, linha: l, coluna: c });

  for (const m of texto.matchAll(MESTRE)) {
    const grupos = m.groups ?? {};
    const tipo = Object.keys(grupos).find((k) => grupos[k] !== undefined) ?? 'INVALIDO';
    const lex = m[0];
    const idx = m.index ?? 0;
    const col = idx - inicioLinha + 1;

    switch (tipo) {
      case 'COMENTARIO':
        break;
      case 'ESPACO': {
        const quebras = lex.split('\n').length - 1;
        if (quebras > 0) {
          linha += quebras;
          inicioLinha = idx + lex.lastIndexOf('\n') + 1;
        }
        break;
      }
      case 'ID':
        tokens.push({ tipo: RESERVADAS.has(lex) ? 'PALAVRA_RES' : 'ID', lexema: lex, linha, coluna: col });
        break;
      case 'NUMERO_BRUTO':
        if (NUM.test(lex)) tokens.push({ tipo: 'NUM', lexema: lex, linha, coluna: col });
        else if (REAL.test(lex)) tokens.push({ tipo: 'NUM_REAL', lexema: lex, linha, coluna: col });
        else if (/[A-Za-z]/.test(lex))
          erro(`'${lex}' mistura números e letras; identificadores devem começar com letra.`, linha, col);
        else
          erro(`número real malformado '${lex}'; use dígitos dos dois lados do ponto.`, linha, col);
        break;
      case 'INVALIDO':
        erro(
          lex === '.'
            ? 'ponto solto; ele só pode aparecer entre dígitos (ex.: 3.5).'
            : `caractere '${lex}' não pertence à linguagem.`,
          linha,
          col,
        );
        break;
      default: // OP_REL, ATRIB, OP_ARIT, DELIM
        tokens.push({ tipo: tipo as NomeToken, lexema: lex, linha, coluna: col });
    }
  }
  return { tokens, erros, fim: { linha, coluna: texto.length - inicioLinha + 1 } };
}
