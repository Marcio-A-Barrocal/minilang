// Árvore sintática abstrata (AST) produzida pelo analisador sintático.
import type { Tipo } from '../types';

export interface Pos { linha: number; coluna: number }

export type Expr =
  | { no: 'Literal'; tipoLit: Tipo; texto: string; pos: Pos }
  | { no: 'Var'; nome: string; pos: Pos }
  | { no: 'Unario'; op: 'nao'; operando: Expr; pos: Pos }
  /** pos aponta para o operador */
  | { no: 'Binario'; op: string; esq: Expr; dir: Expr; pos: Pos };

export type Comando =
  | { no: 'Declaracao'; tipoVar: Tipo; nome: string; pos: Pos }
  | { no: 'Atribuicao'; nome: string; valor: Expr; pos: Pos }
  | { no: 'Leitura'; nome: string; pos: Pos }
  | { no: 'Escrita'; valor: Expr; pos: Pos }
  | { no: 'Condicional'; cond: Expr; entao: Comando[]; senao: Comando[] | null; pos: Pos }
  | { no: 'Laco'; cond: Expr; corpo: Comando[]; pos: Pos };

export interface Programa { no: 'Programa'; comandos: Comando[] }

/** Posição do primeiro caractere de uma expressão. */
export function inicio(e: Expr): Pos {
  return e.no === 'Binario' ? inicio(e.esq) : e.pos;
}
