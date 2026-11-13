// Etapa 3 — Analisador sintático DESCENDENTE RECURSIVO PREDITIVO (LL(1)).
// A gramática da Etapa 1 tinha recursão à esquerda em <termo_ou>, <termo_e>,
// <exp_arit> e <termo>. Cada uma foi reescrita (A -> A α | β  ==>  A -> β A',
// A' -> α A' | ε) e o A' virou um laço `while`, que também preserva a
// associatividade à esquerda dos operadores.
import type { Comando, Expr, Pos, Programa } from './ast';
import type { Diagnostico, Tipo, Token } from '../types';

class ErroSintatico extends Error {
  constructor(msg: string, readonly linha: number, readonly coluna: number) {
    super(msg);
  }
}

const INICIO_COMANDO: ReadonlySet<string> = new Set([
  'inteiro', 'real', 'logico', 'se', 'enquanto', 'leia', 'escreva',
]);

const pos = (t: Token): Pos => ({ linha: t.linha, coluna: t.coluna });

class Parser {
  private i = 0;
  readonly erros: Diagnostico[] = [];

  constructor(private readonly t: Token[]) {}

  private get atual(): Token { return this.t[this.i]; }
  private avancar(): Token {
    const x = this.t[this.i];
    if (x.tipo !== 'EOF') this.i++;
    return x;
  }
  private ehLex(lex: string): boolean {
    return this.atual.tipo !== 'EOF' && this.atual.lexema === lex;
  }
  private desc(t: Token): string {
    return t.tipo === 'EOF' ? 'o fim do programa' : `'${t.lexema}'`;
  }
  private falhar(msg: string, t: Token = this.atual): never {
    throw new ErroSintatico(msg, t.linha, t.coluna);
  }
  private consumir(lex: string, contexto = ''): Token {
    if (this.ehLex(lex)) return this.avancar();
    const ant = this.t[this.i - 1];
    if (lex === ';' && ant) {
      // ';' faltando: o erro aparece logo depois do último token do comando.
      throw new ErroSintatico(
        `esperado ';' ao final do comando, mas encontrado ${this.desc(this.atual)}.`,
        ant.linha,
        ant.coluna + ant.lexema.length,
      );
    }
    return this.falhar(`esperado '${lex}'${contexto}, mas encontrado ${this.desc(this.atual)}.`);
  }
  private consumirID(contexto: string): Token {
    if (this.atual.tipo === 'ID') return this.avancar();
    return this.falhar(`nome de variável esperado ${contexto}, mas encontrado ${this.desc(this.atual)}.`);
  }

  // <programa> ::= <comando> | <comando> <programa>   (vira um laço: programa')
  programa(): Programa {
    if (this.atual.tipo === 'EOF') {
      this.erros.push({
        fase: 'sintatico', severidade: 'erro', linha: 1, coluna: 1,
        mensagem: 'programa vazio: a gramática exige ao menos um comando.',
      });
    }
    return { no: 'Programa', comandos: this.comandos(false) };
  }

  private comandos(aninhado: boolean): Comando[] {
    const lista: Comando[] = [];
    while (this.atual.tipo !== 'EOF' && !(aninhado && this.ehLex('}'))) {
      const inicioCmd = this.i;
      try {
        lista.push(this.comando());
      } catch (e) {
        if (!(e instanceof ErroSintatico)) throw e;
        this.erros.push({
          fase: 'sintatico', severidade: 'erro', mensagem: e.message, linha: e.linha, coluna: e.coluna,
        });
        if (this.i === inicioCmd) this.avancar(); // garante progresso
        this.sincronizar(aninhado);
      }
    }
    return lista;
  }

  /** Recuperação de erro (modo pânico): descarta tokens até o fim do comando. */
  private sincronizar(aninhado: boolean): void {
    let prof = 0;
    while (this.atual.tipo !== 'EOF') {
      const lex = this.atual.lexema;
      if (lex === '{') { prof++; this.avancar(); continue; }
      if (lex === '}') {
        if (prof === 0) {
          if (aninhado) return;       // quem fecha o bloco é o chamador
          this.avancar();
          return;
        }
        prof--;
        this.avancar();
        if (prof === 0) return;
        continue;
      }
      if (prof === 0 && lex === ';') { this.avancar(); return; }
      if (prof === 0 && INICIO_COMANDO.has(lex)) return;
      this.avancar();
    }
  }

  // <comando> ::= declaração | atribuição | condicional | laço | leitura | escrita
  private comando(): Comando {
    const t = this.atual;
    if (t.tipo === 'PALAVRA_RES') {
      switch (t.lexema) {
        case 'inteiro': case 'real': case 'logico': return this.declaracao();
        case 'se': return this.condicional();
        case 'enquanto': return this.laco();
        case 'leia': return this.leitura();
        case 'escreva': return this.escrita();
        case 'senao': return this.falhar("'senao' sem um 'se' correspondente.");
      }
    }
    if (t.tipo === 'ID') return this.atribuicao();
    return this.falhar(
      `comando esperado (declaração, atribuição, se, enquanto, leia ou escreva), mas encontrado ${this.desc(t)}.`,
    );
  }

  // <declaracao> ::= <tipo> ID ";"
  private declaracao(): Comando {
    const tipo = this.avancar();
    const id = this.consumirID(`depois de '${tipo.lexema}'`);
    this.consumir(';');
    return { no: 'Declaracao', tipoVar: tipo.lexema as Tipo, nome: id.lexema, pos: pos(id) };
  }

  // <atribuicao> ::= ID "=" <expressao> ";"
  private atribuicao(): Comando {
    const id = this.avancar();
    if (this.atual.tipo !== 'ATRIB') this.falhar(`esperado '=' depois de '${id.lexema}', mas encontrado ${this.desc(this.atual)}.`);
    this.avancar();
    const valor = this.expressao();
    this.consumir(';');
    return { no: 'Atribuicao', nome: id.lexema, valor, pos: pos(id) };
  }

  // <leitura> ::= "leia" "(" ID ")" ";"
  private leitura(): Comando {
    const kw = this.avancar();
    this.consumir('(', " depois de 'leia'");
    const id = this.consumirID("dentro de 'leia( )'");
    this.consumir(')', ' depois do nome da variável');
    this.consumir(';');
    return { no: 'Leitura', nome: id.lexema, pos: pos(kw) };
  }

  // <escrita> ::= "escreva" "(" <expressao> ")" ";"
  private escrita(): Comando {
    const kw = this.avancar();
    this.consumir('(', " depois de 'escreva'");
    const valor = this.expressao();
    this.consumir(')', ' depois da expressão');
    this.consumir(';');
    return { no: 'Escrita', valor, pos: pos(kw) };
  }

  // <condicional> ::= "se" "(" <expressao> ")" <bloco> [ "senao" <bloco> ]
  private condicional(): Comando {
    const kw = this.avancar();
    this.consumir('(', " depois de 'se'");
    const cond = this.expressao();
    this.consumir(')', ' depois da condição');
    const entao = this.bloco();
    let senao: Comando[] | null = null;
    if (this.ehLex('senao')) {
      this.avancar();
      senao = this.bloco();
    }
    return { no: 'Condicional', cond, entao, senao, pos: pos(kw) };
  }

  // <laco> ::= "enquanto" "(" <expressao> ")" <bloco>
  private laco(): Comando {
    const kw = this.avancar();
    this.consumir('(', " depois de 'enquanto'");
    const cond = this.expressao();
    this.consumir(')', ' depois da condição');
    const corpo = this.bloco();
    return { no: 'Laco', cond, corpo, pos: pos(kw) };
  }

  // "{" <programa> "}"
  private bloco(): Comando[] {
    const abre = this.consumir('{', ' para abrir o bloco');
    if (this.ehLex('}')) {
      this.erros.push({
        fase: 'sintatico', severidade: 'erro', linha: this.atual.linha, coluna: this.atual.coluna,
        mensagem: 'bloco vazio: a gramática exige ao menos um comando entre as chaves.',
      });
      this.avancar();
      return [];
    }
    const cmds = this.comandos(true);
    if (!this.ehLex('}')) {
      this.falhar(`esperado '}' para fechar o bloco aberto na linha ${abre.linha}, mas encontrado ${this.desc(this.atual)}.`);
    }
    this.avancar();
    return cmds;
  }

  // ---------- Expressões (recursão à esquerda eliminada) ----------

  private expressao(): Expr { return this.termoOu(); }

  // <termo_ou> ::= <termo_e> { "ou" <termo_e> }
  private termoOu(): Expr {
    let e = this.termoE();
    while (this.ehLex('ou')) {
      const op = this.avancar();
      const dir = this.termoE();
      e = { no: 'Binario', op: 'ou', esq: e, dir, pos: pos(op) };
    }
    return e;
  }

  // <termo_e> ::= <fator_log> { "e" <fator_log> }
  private termoE(): Expr {
    let e = this.fatorLog();
    while (this.ehLex('e')) {
      const op = this.avancar();
      const dir = this.fatorLog();
      e = { no: 'Binario', op: 'e', esq: e, dir, pos: pos(op) };
    }
    return e;
  }

  // <fator_log> ::= "nao" <fator_log> | <exp_rel>
  private fatorLog(): Expr {
    if (this.ehLex('nao')) {
      const op = this.avancar();
      return { no: 'Unario', op: 'nao', operando: this.fatorLog(), pos: pos(op) };
    }
    return this.expRel();
  }

  // <exp_rel> ::= <exp_arit> [ OP_REL <exp_arit> ]   (não associativa)
  private expRel(): Expr {
    const esq = this.expArit();
    if (this.atual.tipo !== 'OP_REL') return esq;
    const op = this.avancar();
    const dir = this.expArit();
    if (this.atual.tipo === 'OP_REL') {
      this.falhar(`comparações não podem ser encadeadas; combine-as com 'e' ou 'ou' (encontrado '${this.atual.lexema}').`);
    }
    return { no: 'Binario', op: op.lexema, esq, dir, pos: pos(op) };
  }

  // <exp_arit> ::= <termo> { ("+" | "-") <termo> }
  private expArit(): Expr {
    let e = this.termo();
    while (this.atual.tipo === 'OP_ARIT' && (this.atual.lexema === '+' || this.atual.lexema === '-')) {
      const op = this.avancar();
      const dir = this.termo();
      e = { no: 'Binario', op: op.lexema, esq: e, dir, pos: pos(op) };
    }
    return e;
  }

  // <termo> ::= <fator> { ("*" | "/") <fator> }
  private termo(): Expr {
    let e = this.fator();
    while (this.atual.tipo === 'OP_ARIT' && (this.atual.lexema === '*' || this.atual.lexema === '/')) {
      const op = this.avancar();
      const dir = this.fator();
      e = { no: 'Binario', op: op.lexema, esq: e, dir, pos: pos(op) };
    }
    return e;
  }

  // <fator> ::= ID | NUM | NUM_REAL | "verdadeiro" | "falso" | "(" <expressao> ")"
  private fator(): Expr {
    const t = this.atual;
    switch (t.tipo) {
      case 'ID':
        this.avancar();
        return { no: 'Var', nome: t.lexema, pos: pos(t) };
      case 'NUM':
        this.avancar();
        return { no: 'Literal', tipoLit: 'inteiro', texto: t.lexema, pos: pos(t) };
      case 'NUM_REAL':
        this.avancar();
        return { no: 'Literal', tipoLit: 'real', texto: t.lexema, pos: pos(t) };
      case 'PALAVRA_RES':
        if (t.lexema === 'verdadeiro' || t.lexema === 'falso') {
          this.avancar();
          return { no: 'Literal', tipoLit: 'logico', texto: t.lexema, pos: pos(t) };
        }
        break;
      case 'DELIM':
        if (t.lexema === '(') {
          this.avancar();
          const e = this.expressao();
          this.consumir(')', ' para fechar o parêntese');
          return e;
        }
        break;
    }
    return this.falhar(`expressão esperada, mas encontrado ${this.desc(t)}.`);
  }
}

export interface ResultadoSintatico {
  ast: Programa;
  erros: Diagnostico[];
}

export function analisarSintaxe(tokens: Token[], fim: { linha: number; coluna: number }): ResultadoSintatico {
  const p = new Parser([...tokens, { tipo: 'EOF', lexema: '', linha: fim.linha, coluna: fim.coluna }]);
  const ast = p.programa();
  return { ast, erros: p.erros };
}
