// Tipos compartilhados entre as fases do compilador.

/** Nomes de token: os mesmos da gramática (Etapa 1) e do código (Etapa 2). */
export type NomeToken =
  | 'PALAVRA_RES' | 'ID' | 'NUM' | 'NUM_REAL'
  | 'OP_REL' | 'ATRIB' | 'OP_ARIT' | 'DELIM' | 'EOF';

export interface Token {
  tipo: NomeToken;
  lexema: string;
  linha: number;
  coluna: number;
}

/** Tipos da linguagem MiniLang. */
export type Tipo = 'inteiro' | 'real' | 'logico';

export type Fase = 'lexico' | 'sintatico' | 'semantico';

export interface Diagnostico {
  fase: Fase;
  severidade: 'erro' | 'aviso';
  mensagem: string;
  linha: number;
  coluna: number;
}

const NOME_FASE: Record<Fase, string> = {
  lexico: 'léxico',
  sintatico: 'sintático',
  semantico: 'semântico',
};

/** Ex.: "Erro semântico (linha 3, coluna 1): variável 'x' não foi declarada." */
export function formatar(d: Diagnostico): string {
  const rotulo = d.severidade === 'erro' ? 'Erro' : 'Aviso';
  return `${rotulo} ${NOME_FASE[d.fase]} (linha ${d.linha}, coluna ${d.coluna}): ${d.mensagem}`;
}
