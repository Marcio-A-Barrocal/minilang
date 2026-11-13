# Etapa 3 — Análise Sintática e Semântica

**MiniLang** · Carlos Fernando Muniz Freire · Márcio Almeida Barrocal · Pedro da Costa Rossaneis

> *Como saber se a regra faz sentido antes de mandá-la para o equipamento?*

## 1. Visão geral: três fases, três responsabilidades

```
texto ──► LÉXICO ──► tokens ──► SINTÁTICO ──► árvore ──► SEMÂNTICO ──► regra aprovada
          (Etapa 2)             (forma)                     (significado)
                                                            + tabela de símbolos
```

| Fase | Pergunta que responde | Formalismo | Arquivo |
|---|---|---|---|
| Léxico | Os pedaços do texto são palavras válidas? | Regular (Tipo 3) | `lexico/lexer.ts` |
| Sintático | Os pedaços estão na ordem certa? | Livre de contexto (Tipo 2) | `sintatico/parser.ts` |
| Semântico | A regra faz sentido (declaração, escopo, tipos)? | Sensível ao contexto (Tipo 1) / gramática de atributos | `semantico/semantic.ts`, `semantico/symbols.ts` |

Depois das três fases de análise, a regra aprovada pode ser **executada** pelo interpretador (`execucao/interpretador.ts`), que mostra o resultado no quadro "Resultado" da interface. Cada fase só roda se a anterior passou. Dentro de uma fase, todos os erros são reportados de uma vez.
O léxico é o da Etapa 2, com os mesmos nomes de token (`ID`, `NUM`, `NUM_REAL`, `OP_REL`, `PALAVRA_RES`, `OP_ARIT`, `ATRIB`, `DELIM`), portado para TypeScript.

## 2. Técnica de análise sintática: descendente recursiva preditiva (LL(1))

**Escolha:** análise **descendente**, implementada à mão como um conjunto de funções recursivas, uma por não-terminal (`sintatico/parser.ts`).

**Justificativa**

- **A gramática já é LL(1) nos comandos.** Cada comando começa com um token que o identifica sem ambiguidade (FIRST disjuntos):

  | Comando | FIRST |
  |---|---|
  | declaração | `inteiro`, `real`, `logico` |
  | atribuição | `ID` |
  | condicional | `se` |
  | laço | `enquanto` |
  | leitura | `leia` |
  | escrita | `escreva` |

  O `[ "senao" ... ]` também é decidido olhando um token à frente. Não há "else pendente", porque as chaves são obrigatórias.
- **Mensagens de erro melhores.** Em descendente sabemos exatamente o que o parser esperava naquele ponto (`esperado ')' depois da condição, mas encontrado '{'`). Em ascendente (LR) a mensagem costuma ser genérica.
- **Sem gerador.** A linguagem é pequena; a ordem das funções espelha a BNF, o que facilita conferir código e Etapa 1.
- A árvore sai pronta durante a descida, e a precedência dos operadores continua sendo imposta pelos níveis da gramática (`ou` < `e` < `nao` < relacional < `+ -` < `* /`).

### Eliminação da recursão à esquerda

A recursão à esquerda faria uma função descendente chamar a si mesma sem consumir nenhum token (laço infinito). Ela aparecia em quatro regras da Etapa 1. A transformação usada foi `A → A α | β` ⟹ `A → β A'` e `A' → α A' | ε`:

| Antes (Etapa 1) | Depois |
|---|---|
| `<termo_ou> ::= <termo_e> \| <termo_ou> "ou" <termo_e>` | `<termo_ou> ::= <termo_e> <termo_ou'>`<br>`<termo_ou'> ::= "ou" <termo_e> <termo_ou'> \| ε` |
| `<termo_e> ::= <fator_log> \| <termo_e> "e" <fator_log>` | `<termo_e> ::= <fator_log> <termo_e'>`<br>`<termo_e'> ::= "e" <fator_log> <termo_e'> \| ε` |
| `<exp_arit> ::= <termo> \| <exp_arit> "+" <termo> \| <exp_arit> "-" <termo>` | `<exp_arit> ::= <termo> <exp_arit'>`<br>`<exp_arit'> ::= ("+" \| "-") <termo> <exp_arit'> \| ε` |
| `<termo> ::= <fator> \| <termo> "*" <fator> \| <termo> "/" <fator>` | `<termo> ::= <fator> <termo'>`<br>`<termo'> ::= ("*" \| "/") <fator> <termo'> \| ε` |

No código, cada `A'` virou um laço `while`. Ao montar o nó no laço (`e = Binário(op, e, dir)`), a **associatividade à esquerda** é preservada: `8 - 3 - 2` vira `(8 - 3) - 2`, como na gramática original. As regras `<programa>` e `<exp_rel>` não eram recursivas à esquerda e ficaram como estavam; `<programa>` também virou laço (`<comando> { <comando> }`).

### Árvore do programa

O parser constrói uma **árvore sintática abstrata**: os pontos e vírgulas e os parênteses de agrupamento já cumpriram seu papel e não aparecem. A precedência fica visível na altura dos nós: operadores aparecem como nós (`+`, `*`, `<`, `e`, `ou`, `nao`) e os operandos são seus filhos.

**Exemplo 1 — Contador (Etapa 1, programa 3, com um `escreva` no final)**

```
Programa
├── Declaração
│   ├── tipo inteiro
│   └── ID contador
├── Atribuição
│   ├── ID contador
│   └── NUM 0
├── Laço (enquanto)
│   ├── condição
│   │   └── <
│   │       ├── ID contador
│   │       └── NUM 10
│   └── corpo
│       └── Atribuição
│           ├── ID contador
│           └── +
│               ├── ID contador
│               └── NUM 1
└── Escrita
    └── ID contador
```

**Exemplo 2 — Área do triângulo (Etapa 1, programa 1), trecho `area = base * altura / 2.0`**

```
Atribuição
├── ID area
└── /
    ├── *
    │   ├── ID base
    │   └── ID altura
    └── NUM_REAL 2.0
```

Os outros programas de exemplo e as árvores completas estão em `docs/evidencias.md` (gerado por `npm run evidencias`) e na aba **Árvore** da interface.

### Erros sintáticos e recuperação

Ao encontrar um erro, o parser anota a mensagem, descarta tokens até o fim do comando (`;`, ou o bloco `{ }` inteiro, ou o início de um novo comando) e continua. Assim o técnico vê todos os problemas de uma vez. Para `;` faltando, a posição aponta para logo depois do último token do comando.

```
inteiro x          ← linha 1
x = 3 ;
se ( x > 2 {       ← linha 3
  escreva ( x ) ;
}

Erro sintático (linha 1, coluna 10): esperado ';' ao final do comando, mas encontrado 'x'.
Erro sintático (linha 3, coluna 12): esperado ')' depois da condição, mas encontrado '{'.
```

Também são recusados, conforme a BNF: bloco vazio `{ }`, programa vazio, `senao` sem `se` e comparações encadeadas (`a < b < c`, porque `<exp_rel>` não é recursiva).

## 3. Tabela de símbolos e escopo

**Atributos guardados por identificador** (`semantico/symbols.ts`):

| Atributo | Uso |
|---|---|
| `nome` | chave de busca |
| `tipo` | `inteiro`, `real` ou `logico` (verificação de tipos) |
| `escopo` / `nivel` | `global` ou `bloco N (se, linha L)`; profundidade de aninhamento |
| `linha`, `coluna` | onde foi declarado (mensagem de redeclaração) |
| `inicializada` | já recebeu valor por atribuição ou `leia` (aviso de leitura antes de atribuir) |
| `usos` | contagem de leituras |

**Escopo.** Cada `{ ... }` de `se`, `senao` e `enquanto` abre um escopo novo, empilhado sobre o anterior; `}` o fecha.

- **Declarar** insere só no escopo corrente. Se o nome já existe *neste* escopo, é erro de redeclaração.
- **Buscar** procura do escopo mais interno para o mais externo. Uma variável do bloco externo é visível no interno.
- **Sombreamento** (mesmo nome em bloco interno) é permitido: cria outro símbolo.
- **Ao fechar o bloco**, suas variáveis deixam de ser visíveis. A tabela guarda o histórico completo para exibição.

```
inteiro a ;
se ( verdadeiro ) {
  inteiro a ;     ← novo símbolo, esconde o de fora
  a = 1 ;
}
```

| Nome | Tipo | Escopo | Declarada em | Recebe valor | Usos |
|---|---|---|---|---|---|
| a | inteiro | global | 1:9 | não | 0 |
| a | inteiro | bloco 1 (se, linha 2) | 3:11 | sim | 0 |

## 4. Verificações semânticas

Regras de tipo: `inteiro` pode ser atribuído a `real` (alargamento); `real` → `inteiro` não (perda de precisão). `+ - * /` pedem operandos numéricos e o resultado é `real` se algum operando for real, senão `inteiro`. `< >` pedem numéricos. `==` pede dois numéricos ou dois `logico`. `e`, `ou`, `nao` e as condições de `se`/`enquanto` pedem `logico`. Depois de um erro, a expressão recebe o tipo especial `erro`, que suprime erros em cascata.

| # | Verificação | Programa que dispara | Mensagem |
|---|---|---|---|
| 1 | Variável não declarada | `total = idade * 2 ;` | `Erro semântico (linha 5, coluna 1): variável 'total' não foi declarada.` |
| 2 | Tipos incompatíveis na atribuição | `logico alerta ; alerta = idade + 1 ;` | `Erro semântico (linha 4, coluna 10): tipo incompatível: 'alerta' é logico, mas a expressão é inteiro.` |
| 3 | Perda de precisão | `inteiro idade ; idade = 2.5 ;` | `Erro semântico (linha 3, coluna 9): não é possível atribuir um valor real à variável inteira 'idade' (perda de precisão).` |
| 4 | Operando inválido em operador | `logico b ; b = verdadeiro + 1 ;` | `Erro semântico (linha 2, coluna 5): o operador '+' exige operandos numéricos (inteiro ou real), mas recebeu logico.` |
| 5 | Condição não lógica | `se ( idade ) { ... }` | `Erro semântico (linha 6, coluna 6): a condição do 'se' deve ser logico, mas a expressão é inteiro.` |
| 6 | Redeclaração no mesmo escopo | `inteiro idade ;` (duas vezes) | `Erro semântico (linha 9, coluna 9): variável 'idade' já foi declarada neste escopo (linha 1, coluna 9).` |
| 7 | Uso fora do escopo | `se (verdadeiro) { inteiro n ; } escreva ( n ) ;` | `Erro semântico (linha 5, coluna 11): variável 'n' não foi declarada.` |
| 8 | Comparação entre tipos diferentes | `logico b ; b = 1 == verdadeiro ;` | `Erro semântico (linha 2, coluna 7): comparação '==' entre tipos incompatíveis: inteiro e logico.` |
| 9 | Divisão por zero constante | `inteiro a ; a = 1 / 0 ;` | `Erro semântico (linha 2, coluna 9): divisão por zero.` |
| 10 | Leitura antes de atribuir (**aviso**, não bloqueia) | `inteiro a ; escreva ( a ) ;` | `Aviso semântico (linha 2, coluna 11): variável 'a' é lida antes de receber um valor.` |

Programas completos com várias mensagens ao mesmo tempo estão em `docs/evidencias.md`, e todos os casos acima são testados automaticamente (`npm test`).

## 5. Por que essas verificações não podem ser feitas pela gramática

A BNF da Etapa 1 é uma gramática **livre de contexto (Tipo 2)**. Em uma gramática assim, cada regra de produção tem um único não-terminal à esquerda e é aplicada **sem olhar o que existe ao redor**. Cada nível da árvore só conhece o que está dentro de si.

- **Declaração antes do uso.** Exige ligar duas ocorrências do *mesmo nome* que podem estar separadas por qualquer quantidade de comandos. É o mesmo problema da linguagem `{ w c w : w ∈ (a|b)* }`, que o lema do bombeamento para linguagens livres de contexto prova **não** ser livre de contexto. Para o parser, `ID` é só um token: a gramática não consegue lembrar que `idade` foi declarado 40 linhas atrás.
- **Compatibilidade de tipos.** Depende do tipo guardado na declaração, ou seja, da mesma informação distante. Até seria possível duplicar regras por tipo (`<exp_inteira>`, `<exp_real>`…), mas isso só funciona para tipos fixos, nunca para um conjunto ilimitado de nomes de variáveis.
- **Escopo.** Saber se `n` ainda existe depende do histórico de blocos abertos e fechados, o que exige memória além da pilha de pareamento.

O formalismo que descreve essas restrições é o das **gramáticas sensíveis ao contexto (Tipo 1)**. Na prática, usa-se a **gramática de atributos** (Knuth, 1968): anexa-se à árvore sintática atributos (como `tipo`) e regras semânticas que os calculam e verificam, apoiadas em uma **tabela de símbolos**. É exatamente o que `semantico/semantic.ts` implementa: uma passada sobre a árvore, com `tipo` calculado de baixo para cima (atributo sintetizado) e a tabela de símbolos como ambiente herdado.

## 6. Sintaxe e semântica são responsabilidades distintas

Um atalho comum é verificar tipos dentro do próprio parser e chamar isso de análise semântica. Aqui as fases são separadas de propósito:

| | Analisador sintático | Analisador semântico |
|---|---|---|
| Entrada | tokens | árvore pronta |
| Saída | árvore (ou erros de forma) | tabela de símbolos e erros de significado |
| Sabe | a gramática | declarações, escopos, tipos |
| Exemplo | `esperado ')'` | `variável 'x' não foi declarada` |

Motivos práticos da separação: (1) o parser só enxerga um comando por vez e não tem a tabela de símbolos; (2) `x = 3 +;` é erro de forma, e `x = 3 + verdadeiro;` é sintaticamente correto, mas sem sentido, e são problemas diferentes, com mensagens e correções diferentes; (3) cada fase pode ser testada e trocada isoladamente; (4) se há erro de sintaxe, a árvore está incompleta e a semântica nem roda, o que evita uma enxurrada de erros falsos.

## 7. Decisões de projeto

- `inteiro` → `real` é permitido; o inverso não.
- A divisão de dois inteiros tem tipo `inteiro`.
- A gramática da Etapa 1 **não foi alterada**, só reescrita internamente para a análise descendente (seção 2).
- O aviso de "leitura antes de atribuir" segue a ordem textual do programa; é uma heurística, por isso é aviso e não erro.

## 8. Como executar

```bash
npm install
npm run dev        # interface em http://localhost:5173
npm test           # 27 testes: léxico, sintaxe, semântica e execução
npm run evidencias # regenera docs/evidencias.md
```
