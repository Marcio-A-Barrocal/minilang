# MiniLang — compilador (Etapas 2 e 3) em React + TypeScript

Verifica e executa regras de alerta escritas pelos técnicos antes de enviá-las ao equipamento.

## Onde está cada parte

A **inteligência** (compilador) fica toda em `src/compiler/`, uma pasta por fase, e não depende de React.
A **interface** fica em `src/ui/` e só chama `compilar(codigo, entrada)`.

```
src/compiler/
  types.ts                  tipos compartilhados (Token, Diagnostico, Tipo)
  lexico/lexer.ts           1. LÉXICO     texto  -> tokens            (Etapa 2)
  sintatico/ast.ts          2. SINTÁTICO  formato dos nós da árvore
  sintatico/parser.ts       2. SINTÁTICO  tokens -> árvore (LL(1))    (Etapa 3)
  sintatico/tree.ts         2. SINTÁTICO  árvore -> desenho / texto
  semantico/symbols.ts      3. SEMÂNTICO  tabela de símbolos e escopos
  semantico/semantic.ts     3. SEMÂNTICO  verificações de declaração e tipos
  execucao/interpretador.ts 4. EXECUÇÃO   roda a regra aprovada
  index.ts                  liga as fases (compilar)
  exemplos.ts               programas aceitos e recusados
  compiler.test.ts          testes
src/ui/
  App.tsx       tela principal (estado)
  Editor.tsx    quadro 1: código MiniLang
  Saida.tsx     quadro 2: entrada dos `leia` e resultado do `escreva`
  Analise.tsx   quadro 3: fases, mensagens, árvore, símbolos, tokens
  Arvore.tsx    desenho da árvore
  styles.css
docs/           Etapa_3.md (documento) e evidencias.md (saída real)
```

```bash
npm install && npm run dev
npm test
```
