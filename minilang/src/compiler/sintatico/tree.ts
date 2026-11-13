// SINTÁTICO (parte 2) — converte a AST em uma árvore de rótulos,
// para desenhar na tela e para imprimir em texto indentado.
import type { Comando, Expr, Programa } from './ast';

/** Serve só para a interface colorir cada tipo de nó. */
export type Categoria = 'estrutura' | 'operador' | 'valor' | 'grupo';

export interface NoArvore {
  rotulo: string;
  categoria: Categoria;
  filhos: NoArvore[];
}

const no = (rotulo: string, categoria: Categoria, filhos: NoArvore[] = []): NoArvore => ({ rotulo, categoria, filhos });
const valor = (rotulo: string) => no(rotulo, 'valor');

function expr(e: Expr): NoArvore {
  switch (e.no) {
    case 'Literal':
      return valor(`${e.tipoLit === 'inteiro' ? 'NUM' : e.tipoLit === 'real' ? 'NUM_REAL' : 'LOGICO'} ${e.texto}`);
    case 'Var':
      return valor(`ID ${e.nome}`);
    case 'Unario':
      return no(`nao`, 'operador', [expr(e.operando)]);
    case 'Binario':
      return no(e.op, 'operador', [expr(e.esq), expr(e.dir)]);
  }
}

const bloco = (rotulo: string, cmds: Comando[]) => no(rotulo, 'grupo', cmds.map(comando));

function comando(c: Comando): NoArvore {
  switch (c.no) {
    case 'Declaracao':
      return no('Declaração', 'estrutura', [valor(`tipo ${c.tipoVar}`), valor(`ID ${c.nome}`)]);
    case 'Atribuicao':
      return no('Atribuição', 'estrutura', [valor(`ID ${c.nome}`), expr(c.valor)]);
    case 'Leitura':
      return no('Leitura', 'estrutura', [valor(`ID ${c.nome}`)]);
    case 'Escrita':
      return no('Escrita', 'estrutura', [expr(c.valor)]);
    case 'Condicional': {
      const filhos = [no('condição', 'grupo', [expr(c.cond)]), bloco('então', c.entao)];
      if (c.senao) filhos.push(bloco('senão', c.senao));
      return no('Condicional (se)', 'estrutura', filhos);
    }
    case 'Laco':
      return no('Laço (enquanto)', 'estrutura', [no('condição', 'grupo', [expr(c.cond)]), bloco('corpo', c.corpo)]);
  }
}

export function paraArvore(p: Programa): NoArvore {
  return no('Programa', 'estrutura', p.comandos.map(comando));
}

/** Texto indentado no estilo do comando `tree`. */
export function emTexto(n: NoArvore, prefixo = '', ultimo = true, raiz = true): string {
  const linha = raiz ? n.rotulo : `${prefixo}${ultimo ? '└── ' : '├── '}${n.rotulo}`;
  const novoPrefixo = raiz ? '' : prefixo + (ultimo ? '    ' : '│   ');
  const filhos = n.filhos.map((f, i) => emTexto(f, novoPrefixo, i === n.filhos.length - 1, false));
  return [linha, ...filhos].join('\n');
}
