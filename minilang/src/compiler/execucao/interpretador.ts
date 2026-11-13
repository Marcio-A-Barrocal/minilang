// EXECUÇÃO — roda a regra já aprovada pelas três fases de análise.
// Entrada: AST + valores digitados para os `leia`. Saída: linhas do `escreva`.
// (Só roda se não houve erro léxico, sintático ou semântico.)
import type { Comando, Expr, Programa } from '../sintatico/ast';
import type { Tipo } from '../types';

export interface Valor { tipo: Tipo; v: number | boolean }
export interface ResultadoExecucao {
  saida: string[];
  /** null quando a execução terminou normalmente. */
  erro: string | null;
}

const LIMITE_PASSOS = 100_000;

class ErroExecucao extends Error {}

class Ambiente {
  private readonly vars = new Map<string, Valor>();
  constructor(private readonly pai: Ambiente | null = null) {}
  declarar(nome: string, v: Valor) { this.vars.set(nome, v); }
  buscar(nome: string): Valor {
    const v = this.vars.get(nome) ?? this.pai?.buscar(nome);
    if (!v) throw new ErroExecucao(`variável '${nome}' não existe.`); // não ocorre após a semântica
    return v;
  }
}

export function formatarValor(x: Valor): string {
  if (x.tipo === 'logico') return x.v ? 'verdadeiro' : 'falso';
  if (x.tipo === 'real') return Number.isInteger(x.v) ? (x.v as number).toFixed(1) : String(x.v);
  return String(x.v);
}

const inicial = (t: Tipo): Valor => ({ tipo: t, v: t === 'logico' ? false : 0 });

function lerEntrada(nome: string, tipo: Tipo, texto: string | undefined): Valor {
  if (texto === undefined) throw new ErroExecucao(`leia(${nome}): faltou um valor na entrada.`);
  if (tipo === 'logico') {
    if (texto === 'verdadeiro' || texto === 'falso') return { tipo, v: texto === 'verdadeiro' };
    throw new ErroExecucao(`leia(${nome}): '${texto}' não é logico (use verdadeiro ou falso).`);
  }
  const ok = tipo === 'inteiro' ? /^-?[0-9]+$/.test(texto) : /^-?[0-9]+(\.[0-9]+)?$/.test(texto);
  if (!ok) throw new ErroExecucao(`leia(${nome}): '${texto}' não é um valor ${tipo}.`);
  return { tipo, v: Number(texto) };
}

export function executar(prog: Programa, entrada: string): ResultadoExecucao {
  const fila = entrada.split(/\s+/).filter(Boolean);
  const saida: string[] = [];
  let passos = 0;

  const bloco = (cmds: Comando[], pai: Ambiente) => {
    const amb = new Ambiente(pai);
    cmds.forEach((c) => comando(c, amb));
  };

  function comando(c: Comando, amb: Ambiente): void {
    if (++passos > LIMITE_PASSOS) {
      throw new ErroExecucao(`limite de ${LIMITE_PASSOS} passos excedido (laço infinito?).`);
    }
    switch (c.no) {
      case 'Declaracao':
        amb.declarar(c.nome, inicial(c.tipoVar));
        break;
      case 'Atribuicao':
        amb.buscar(c.nome).v = avaliar(c.valor, amb).v; // inteiro -> real não muda o número
        break;
      case 'Leitura': {
        const alvo = amb.buscar(c.nome);
        alvo.v = lerEntrada(c.nome, alvo.tipo, fila.shift()).v;
        break;
      }
      case 'Escrita':
        saida.push(formatarValor(avaliar(c.valor, amb)));
        break;
      case 'Condicional':
        if (avaliar(c.cond, amb).v) bloco(c.entao, amb);
        else if (c.senao) bloco(c.senao, amb);
        break;
      case 'Laco':
        while (avaliar(c.cond, amb).v) {
          bloco(c.corpo, amb); // cada comando do corpo já conta como um passo
        }
        break;
    }
  }

  function avaliar(e: Expr, amb: Ambiente): Valor {
    switch (e.no) {
      case 'Literal':
        return e.tipoLit === 'logico'
          ? { tipo: 'logico', v: e.texto === 'verdadeiro' }
          : { tipo: e.tipoLit, v: Number(e.texto) };
      case 'Var':
        return amb.buscar(e.nome);
      case 'Unario':
        return { tipo: 'logico', v: !avaliar(e.operando, amb).v };
      case 'Binario': {
        const a = avaliar(e.esq, amb);
        if (e.op === 'e') return { tipo: 'logico', v: Boolean(a.v) && Boolean(avaliar(e.dir, amb).v) };
        if (e.op === 'ou') return { tipo: 'logico', v: Boolean(a.v) || Boolean(avaliar(e.dir, amb).v) };
        const b = avaliar(e.dir, amb);
        const x = a.v as number;
        const y = b.v as number;
        switch (e.op) {
          case '<': return { tipo: 'logico', v: x < y };
          case '>': return { tipo: 'logico', v: x > y };
          case '==': return { tipo: 'logico', v: a.v === b.v };
        }
        const tipo: Tipo = a.tipo === 'real' || b.tipo === 'real' ? 'real' : 'inteiro';
        if (e.op === '/') {
          if (y === 0) throw new ErroExecucao(`divisão por zero (linha ${e.pos.linha}, coluna ${e.pos.coluna}).`);
          return { tipo, v: tipo === 'inteiro' ? Math.trunc(x / y) : x / y };
        }
        return { tipo, v: e.op === '+' ? x + y : e.op === '-' ? x - y : x * y };
      }
    }
  }

  try {
    bloco(prog.comandos, new Ambiente());
    return { saida, erro: null };
  } catch (e) {
    if (e instanceof ErroExecucao) return { saida, erro: e.message };
    throw e;
  }
}
