import { describe, expect, it } from 'vitest';
import { compilar, EXEMPLOS, emTexto, formatar } from './index';
import { analisarLexico } from './lexico/lexer';

// só erros (avisos não bloqueiam e são testados à parte)
const msgs = (src: string) =>
  compilar(src).diagnosticos.filter((d) => d.severidade === 'erro').map(formatar);

describe('Etapa 2 — léxico', () => {
  it('reproduz a tabela de tokens do programa 3 (linha/coluna a partir de 1)', () => {
    const { tokens } = analisarLexico('inteiro contador ;\ncontador = 0 ;\nenquanto ( contador < 10 ) {\n contador = contador + 1 ;\n}\n');
    const t = (i: number) => [tokens[i].tipo, tokens[i].lexema, tokens[i].linha, tokens[i].coluna];
    expect(t(0)).toEqual(['PALAVRA_RES', 'inteiro', 1, 1]);
    expect(t(1)).toEqual(['ID', 'contador', 1, 9]);
    expect(t(2)).toEqual(['DELIM', ';', 1, 18]);
    expect(t(4)).toEqual(['ATRIB', '=', 2, 10]);
    expect(t(7)).toEqual(['PALAVRA_RES', 'enquanto', 3, 1]);
    expect(t(10)).toEqual(['OP_REL', '<', 3, 21]);
  });

  it('casamento mais longo e prioridade de reservadas', () => {
    const tipos = (s: string) => analisarLexico(s).tokens.map((t) => `${t.tipo}:${t.lexema}`);
    expect(tipos('x == y')).toEqual(['ID:x', 'OP_REL:==', 'ID:y']);
    expect(tipos('35.5')).toEqual(['NUM_REAL:35.5']);
    expect(tipos('senao seguro1 se')).toEqual(['PALAVRA_RES:senao', 'ID:seguro1', 'PALAVRA_RES:se']);
    expect(tipos('// comentário\n1')).toEqual(['NUM:1']);
  });

  it('recusa _, %, ! (removidos do alfabeto) e demais caracteres', () => {
    for (const c of ['_', '%', '!', '@', '#', '$', '"', 'é']) {
      expect(analisarLexico(`x ${c} y`).erros).toHaveLength(1);
    }
  });
});

describe('exemplos aceitos e recusados', () => {
  for (const ex of EXEMPLOS) {
    it(`${ex.titulo}: ${ex.esperado}`, () => {
      const r = compilar(ex.codigo);
      if (ex.esperado === 'ok') {
        expect(r.aprovado).toBe(true);
        expect(r.diagnosticos.filter((d) => d.severidade === 'erro')).toEqual([]);
      } else {
        const falhou = (['lexico', 'sintatico', 'semantico'] as const).find((f) => r.fases[f] === 'erro');
        expect(falhou).toBe(ex.esperado);
      }
    });
  }
});

describe('Etapa 3 — sintaxe', () => {
  it('precedência: * antes de +, e antes de ou', () => {
    const r = compilar('inteiro a ; a = 1 + 2 * 3 ;');
    const txt = emTexto(r.arvore!).split('\n');
    const mais = txt.findIndex((l) => l.endsWith('── +'));
    const vezes = txt.findIndex((l) => l.endsWith('── *'));
    expect(mais).toBeGreaterThan(-1);
    expect(mais).toBeLessThan(vezes); // o * fica abaixo (dentro) do +
  });

  it('associatividade à esquerda: 8 - 3 - 2 = (8 - 3) - 2', () => {
    const r = compilar('inteiro a ; a = 8 - 3 - 2 ;');
    const t = emTexto(r.arvore!).split('\n');
    const raiz = t.findIndex((l) => l.endsWith('── -'));
    expect(raiz).toBeGreaterThan(-1);
    expect(t[raiz + 1]).toMatch(/── -$/); // filho esquerdo é a outra subtração
  });

  it('recupera-se de erros e reporta vários de uma vez', () => {
    expect(msgs('inteiro x\nx = 3 ;\nse ( x > 2 {\n escreva ( x ) ;\n}\n')).toEqual([
      "Erro sintático (linha 1, coluna 10): esperado ';' ao final do comando, mas encontrado 'x'.",
      "Erro sintático (linha 3, coluna 12): esperado ')' depois da condição, mas encontrado '{'.",
    ]);
  });

  it('recusa bloco vazio, comparação encadeada e programa vazio', () => {
    expect(msgs('se ( verdadeiro ) { }')[0]).toContain('bloco vazio');
    expect(msgs('logico a ; a = 1 < 2 < 3 ;')[0]).toContain('encadeadas');
    expect(msgs('')[0]).toContain('programa vazio');
  });
});

describe('Etapa 3 — semântica', () => {
  it('variável não declarada', () => {
    expect(msgs('x = 1 ;')).toEqual(["Erro semântico (linha 1, coluna 1): variável 'x' não foi declarada."]);
  });

  it('incompatibilidade de tipos', () => {
    expect(msgs('inteiro i ; i = 2.5 ;')[0]).toContain('perda de precisão');
    expect(msgs('inteiro i ; logico b ; b = i + 1 ;')[0]).toContain("'b' é logico, mas a expressão é inteiro");
    expect(compilar('real r ; r = 2 ;').aprovado).toBe(true); // inteiro -> real é permitido
  });

  it('operadores e condições exigem os tipos certos', () => {
    expect(msgs('logico b ; b = verdadeiro + 1 ;')[0]).toContain("operador '+' exige");
    expect(msgs('inteiro i ; se ( i ) { escreva ( i ) ; }')[0]).toContain("condição do 'se' deve ser logico");
    expect(msgs('inteiro i ; logico b ; b = nao i ;')[0]).toContain("operador 'nao' exige");
    expect(msgs('logico b ; b = 1 == verdadeiro ;')[0]).toContain("comparação '==' entre tipos incompatíveis");
  });

  it('redeclaração no mesmo escopo é erro; sombreamento em bloco aninhado é permitido', () => {
    expect(msgs('inteiro a ; inteiro a ;')[0]).toContain('já foi declarada');
    expect(compilar('inteiro a ; se ( verdadeiro ) { inteiro a ; a = 1 ; }').aprovado).toBe(true);
  });

  it('escopo: variável do bloco não existe fora dele', () => {
    const r = compilar('se ( verdadeiro ) { inteiro n ; n = 1 ; }\nescreva ( n ) ;');
    expect(msgs('se ( verdadeiro ) { inteiro n ; n = 1 ; }\nescreva ( n ) ;')).toEqual(["Erro semântico (linha 2, coluna 11): variável 'n' não foi declarada."]);
    expect(r.simbolos[0].escopo).toMatch(/^bloco 1 \(se, linha 1\)$/);
  });

  it('divisão por zero constante e aviso de leitura antes de atribuir', () => {
    expect(msgs('inteiro a ; a = 1 / 0 ;')[0]).toContain('divisão por zero');
    const r = compilar('inteiro a ; escreva ( a ) ;');
    expect(r.aprovado).toBe(true); // aviso não bloqueia
    expect(r.diagnosticos[0].severidade).toBe('aviso');
  });

  it('não gera erros em cascata a partir de um erro', () => {
    expect(msgs('inteiro a ; a = y + 1 ;')).toHaveLength(1);
  });
});

describe('Execução', () => {
  const rodar = (src: string, entrada = '') => compilar(src, entrada).execucao;

  it('executa os exemplos aceitos', () => {
    const saida = (id: string) => {
      const ex = EXEMPLOS.find((e) => e.id === id)!;
      return rodar(ex.codigo, ex.entrada)?.saida;
    };
    expect(saida('area')).toEqual(['12.0']);      // 6 * 4 / 2.0
    expect(saida('alerta')).toEqual(['1']);       // 40 > 35.5 e alerta
    expect(saida('contador')).toEqual(['10']);
    expect(saida('escopo-ok')).toEqual(['2']);    // 35.5 > 30.0 -> escreve nivel
  });

  it('divisão de inteiros trunca; real mantém decimais', () => {
    expect(rodar('escreva ( 7 / 2 ) ; escreva ( 7 / 2.0 ) ;')?.saida).toEqual(['3', '3.5']);
  });

  it('escreve logico como verdadeiro/falso', () => {
    expect(rodar('escreva ( 1 < 2 ) ; escreva ( nao verdadeiro ) ;')?.saida).toEqual(['verdadeiro', 'falso']);
  });

  it('erros de execução: entrada faltando, divisão por zero, laço infinito', () => {
    expect(rodar('inteiro a ; leia ( a ) ;', '')?.erro).toContain('faltou um valor');
    expect(rodar('inteiro a ; leia ( a ) ;', 'abc')?.erro).toContain('não é um valor inteiro');
    expect(rodar('inteiro a ; inteiro b ; leia ( a ) ; leia ( b ) ; escreva ( a / b ) ;', '4 0')?.erro).toContain('divisão por zero');
    expect(rodar('enquanto ( verdadeiro ) { inteiro x ; }')?.erro).toContain('limite');
  });

  it('não executa programa com erro', () => {
    expect(compilar('x = 1 ;').execucao).toBeNull();
  });
});
