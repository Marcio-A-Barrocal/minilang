// Tabela de símbolos com escopos aninhados (pilha de escopos).
import type { Tipo } from '../types';

export interface Simbolo {
  nome: string;
  tipo: Tipo;
  /** "global" ou "bloco N (se, linha L)" */
  escopo: string;
  nivel: number;
  linha: number;
  coluna: number;
  inicializada: boolean;
  usos: number;
}

class Escopo {
  readonly simbolos = new Map<string, Simbolo>();
  constructor(readonly id: string, readonly nivel: number, readonly pai: Escopo | null) {}
}

export type ResultadoDeclaracao =
  | { ok: true; simbolo: Simbolo }
  | { ok: false; anterior: Simbolo };

export class TabelaSimbolos {
  private atual = new Escopo('global', 0, null);
  private readonly historico: Simbolo[] = [];
  private contador = 0;

  /** Entra em um bloco: tudo declarado a partir daqui vive só até fechar(). */
  abrir(rotulo: string): void {
    this.contador++;
    this.atual = new Escopo(`bloco ${this.contador} (${rotulo})`, this.atual.nivel + 1, this.atual);
  }

  fechar(): void {
    if (this.atual.pai) this.atual = this.atual.pai;
  }

  /** Declara no escopo corrente; falha se o nome já existe NESTE escopo. */
  declarar(nome: string, tipo: Tipo, linha: number, coluna: number): ResultadoDeclaracao {
    const anterior = this.atual.simbolos.get(nome);
    if (anterior) return { ok: false, anterior };
    const simbolo: Simbolo = {
      nome, tipo, escopo: this.atual.id, nivel: this.atual.nivel,
      linha, coluna, inicializada: false, usos: 0,
    };
    this.atual.simbolos.set(nome, simbolo);
    this.historico.push(simbolo);
    return { ok: true, simbolo };
  }

  /** Busca do escopo mais interno para o mais externo (sombreamento permitido). */
  buscar(nome: string): Simbolo | undefined {
    for (let e: Escopo | null = this.atual; e; e = e.pai) {
      const s = e.simbolos.get(nome);
      if (s) return s;
    }
    return undefined;
  }

  /** Todos os símbolos já declarados, na ordem de declaração (inclui escopos já fechados). */
  get todos(): readonly Simbolo[] {
    return this.historico;
  }
}
