// Etapa 3 — Análise SEMÂNTICA: passada separada sobre a AST pronta.
// O parser só garante a forma; aqui se verifica o significado (declaração,
// escopo, tipos), usando a tabela de símbolos.
import { inicio } from '../sintatico/ast';
import type { Comando, Expr, Programa } from '../sintatico/ast';
import { TabelaSimbolos } from './symbols';
import type { Simbolo } from './symbols';
import type { Diagnostico, Tipo } from '../types';

type TipoExpr = Tipo | 'erro'; // 'erro' evita erros em cascata

const numerico = (t: TipoExpr): boolean => t === 'inteiro' || t === 'real';

export interface ResultadoSemantico {
  diagnosticos: Diagnostico[];
  simbolos: readonly Simbolo[];
}

export function analisarSemantica(prog: Programa): ResultadoSemantico {
  const tabela = new TabelaSimbolos();
  const diagnosticos: Diagnostico[] = [];
  const avisados = new Set<Simbolo>();

  const reportar = (severidade: 'erro' | 'aviso', mensagem: string, linha: number, coluna: number) =>
    diagnosticos.push({ fase: 'semantico', severidade, mensagem, linha, coluna });

  const bloco = (rotulo: string, cmds: Comando[]) => {
    tabela.abrir(rotulo);
    cmds.forEach(comando);
    tabela.fechar();
  };

  function comando(c: Comando): void {
    switch (c.no) {
      case 'Declaracao': {
        const r = tabela.declarar(c.nome, c.tipoVar, c.pos.linha, c.pos.coluna);
        if (!r.ok) {
          reportar('erro',
            `variável '${c.nome}' já foi declarada neste escopo (linha ${r.anterior.linha}, coluna ${r.anterior.coluna}).`,
            c.pos.linha, c.pos.coluna);
        }
        break;
      }
      case 'Atribuicao': {
        const destino = tabela.buscar(c.nome);
        const origem = expr(c.valor);
        if (!destino) {
          reportar('erro', `variável '${c.nome}' não foi declarada.`, c.pos.linha, c.pos.coluna);
          break;
        }
        destino.inicializada = true;
        if (origem === 'erro' || origem === destino.tipo) break;
        if (destino.tipo === 'real' && origem === 'inteiro') break; // alargamento permitido
        const p = inicio(c.valor);
        if (destino.tipo === 'inteiro' && origem === 'real') {
          reportar('erro',
            `não é possível atribuir um valor real à variável inteira '${c.nome}' (perda de precisão).`,
            p.linha, p.coluna);
        } else {
          reportar('erro',
            `tipo incompatível: '${c.nome}' é ${destino.tipo}, mas a expressão é ${origem}.`,
            p.linha, p.coluna);
        }
        break;
      }
      case 'Leitura': {
        const s = tabela.buscar(c.nome);
        if (!s) reportar('erro', `variável '${c.nome}' não foi declarada.`, c.pos.linha, c.pos.coluna + 'leia ('.length);
        else s.inicializada = true;
        break;
      }
      case 'Escrita':
        expr(c.valor);
        break;
      case 'Condicional':
        condicao('se', c.cond);
        bloco(`se, linha ${c.pos.linha}`, c.entao);
        if (c.senao) bloco(`senao, linha ${c.pos.linha}`, c.senao);
        break;
      case 'Laco':
        condicao('enquanto', c.cond);
        bloco(`enquanto, linha ${c.pos.linha}`, c.corpo);
        break;
    }
  }

  function condicao(kw: string, e: Expr): void {
    const t = expr(e);
    if (t !== 'logico' && t !== 'erro') {
      const p = inicio(e);
      reportar('erro', `a condição do '${kw}' deve ser logico, mas a expressão é ${t}.`, p.linha, p.coluna);
    }
  }

  function exigir(op: string, lado: Expr, t: TipoExpr, esperado: 'numérico' | 'logico'): boolean {
    const ok = esperado === 'numérico' ? numerico(t) : t === 'logico';
    if (!ok && t !== 'erro') {
      const p = inicio(lado);
      reportar('erro', `o operador '${op}' exige operandos ${esperado === 'numérico' ? 'numéricos (inteiro ou real)' : 'logico'}, mas recebeu ${t}.`, p.linha, p.coluna);
    }
    return ok;
  }

  function expr(e: Expr): TipoExpr {
    switch (e.no) {
      case 'Literal':
        return e.tipoLit;
      case 'Var': {
        const s = tabela.buscar(e.nome);
        if (!s) {
          reportar('erro', `variável '${e.nome}' não foi declarada.`, e.pos.linha, e.pos.coluna);
          return 'erro';
        }
        s.usos++;
        if (!s.inicializada && !avisados.has(s)) {
          avisados.add(s);
          reportar('aviso', `variável '${e.nome}' é lida antes de receber um valor.`, e.pos.linha, e.pos.coluna);
        }
        return s.tipo;
      }
      case 'Unario': {
        const t = expr(e.operando);
        exigir('nao', e.operando, t, 'logico');
        return 'logico';
      }
      case 'Binario': {
        const te = expr(e.esq);
        const td = expr(e.dir);
        switch (e.op) {
          case 'e': case 'ou': {
            exigir(e.op, e.esq, te, 'logico');
            exigir(e.op, e.dir, td, 'logico');
            return 'logico';
          }
          case '<': case '>': {
            exigir(e.op, e.esq, te, 'numérico');
            exigir(e.op, e.dir, td, 'numérico');
            return 'logico';
          }
          case '==': {
            const mesmaClasse = (numerico(te) && numerico(td)) || (te === 'logico' && td === 'logico');
            if (!mesmaClasse && te !== 'erro' && td !== 'erro') {
              reportar('erro', `comparação '==' entre tipos incompatíveis: ${te} e ${td}.`, e.pos.linha, e.pos.coluna);
            }
            return 'logico';
          }
          default: { // + - * /
            const a = exigir(e.op, e.esq, te, 'numérico');
            const b = exigir(e.op, e.dir, td, 'numérico');
            if (e.op === '/' && e.dir.no === 'Literal' && e.dir.tipoLit !== 'logico' && Number(e.dir.texto) === 0) {
              reportar('erro', 'divisão por zero.', e.dir.pos.linha, e.dir.pos.coluna);
            }
            if (!a || !b) return 'erro';
            return te === 'real' || td === 'real' ? 'real' : 'inteiro';
          }
        }
      }
    }
  }

  prog.comandos.forEach(comando);
  return { diagnosticos, simbolos: tabela.todos };
}
