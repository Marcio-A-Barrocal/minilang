# Evidências geradas pelo compilador

Saída real de `compilar()` para cada programa de exemplo (gerada por `npm run evidencias`).

## Área do triângulo

```
inteiro base ;
inteiro altura ;
leia ( base ) ;
leia ( altura ) ;
real area ;
area = base * altura / 2.0 ;
escreva ( area ) ;
```

Fases: léxico **ok**, sintático **ok**, semântico **ok**.

Árvore:

```
Programa
├── Declaração
│   ├── tipo inteiro
│   └── ID base
├── Declaração
│   ├── tipo inteiro
│   └── ID altura
├── Leitura
│   └── ID base
├── Leitura
│   └── ID altura
├── Declaração
│   ├── tipo real
│   └── ID area
├── Atribuição
│   ├── ID area
│   └── /
│       ├── *
│       │   ├── ID base
│       │   └── ID altura
│       └── NUM_REAL 2.0
└── Escrita
    └── ID area
```

Tabela de símbolos:

| Nome | Tipo | Escopo | Declarada em | Recebe valor | Usos |
|---|---|---|---|---|---|
| base | inteiro | global | 1:9 | sim | 1 |
| altura | inteiro | global | 2:9 | sim | 1 |
| area | real | global | 5:6 | sim | 1 |

Execução (entrada: `6 4`):

```
12.0
```

Nenhum erro nem aviso.

## Alerta de temperatura

```
real temperatura ;
leia ( temperatura ) ;
logico alerta ;
alerta = verdadeiro ;
se ( temperatura > 35.5 e alerta == verdadeiro ) {
  escreva ( 1 ) ;
} senao {
  escreva ( 0 ) ;
}
```

Fases: léxico **ok**, sintático **ok**, semântico **ok**.

Árvore:

```
Programa
├── Declaração
│   ├── tipo real
│   └── ID temperatura
├── Leitura
│   └── ID temperatura
├── Declaração
│   ├── tipo logico
│   └── ID alerta
├── Atribuição
│   ├── ID alerta
│   └── LOGICO verdadeiro
└── Condicional (se)
    ├── condição
    │   └── e
    │       ├── >
    │       │   ├── ID temperatura
    │       │   └── NUM_REAL 35.5
    │       └── ==
    │           ├── ID alerta
    │           └── LOGICO verdadeiro
    ├── então
    │   └── Escrita
    │       └── NUM 1
    └── senão
        └── Escrita
            └── NUM 0
```

Tabela de símbolos:

| Nome | Tipo | Escopo | Declarada em | Recebe valor | Usos |
|---|---|---|---|---|---|
| temperatura | real | global | 1:6 | sim | 1 |
| alerta | logico | global | 3:8 | sim | 1 |

Execução (entrada: `40`):

```
1
```

Nenhum erro nem aviso.

## Contador

```
inteiro contador ;
contador = 0 ;
enquanto ( contador < 10 ) {
  contador = contador + 1 ;
}
escreva ( contador ) ;
```

Fases: léxico **ok**, sintático **ok**, semântico **ok**.

Árvore:

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

Tabela de símbolos:

| Nome | Tipo | Escopo | Declarada em | Recebe valor | Usos |
|---|---|---|---|---|---|
| contador | inteiro | global | 1:9 | sim | 3 |

Execução (entrada: `(nenhuma)`):

```
10
```

Nenhum erro nem aviso.

## Variável de bloco

```
real temperatura ;
leia ( temperatura ) ;
se ( temperatura > 30.0 ) {
  inteiro nivel ;
  nivel = 2 ;
  escreva ( nivel ) ;
}
```

Fases: léxico **ok**, sintático **ok**, semântico **ok**.

Árvore:

```
Programa
├── Declaração
│   ├── tipo real
│   └── ID temperatura
├── Leitura
│   └── ID temperatura
└── Condicional (se)
    ├── condição
    │   └── >
    │       ├── ID temperatura
    │       └── NUM_REAL 30.0
    └── então
        ├── Declaração
        │   ├── tipo inteiro
        │   └── ID nivel
        ├── Atribuição
        │   ├── ID nivel
        │   └── NUM 2
        └── Escrita
            └── ID nivel
```

Tabela de símbolos:

| Nome | Tipo | Escopo | Declarada em | Recebe valor | Usos |
|---|---|---|---|---|---|
| temperatura | real | global | 1:6 | sim | 1 |
| nivel | inteiro | bloco 1 (se, linha 3) | 4:11 | sim | 1 |

Execução (entrada: `35.5`):

```
2
```

Nenhum erro nem aviso.

## Erros léxicos

```
inteiro 2x ;
real preco ;
preco = 3. + 1.2.3 ;
preco = 5 @ 2 ;
```

Fases: léxico **erro**, sintático **pulada**, semântico **pulada**.

Mensagens:

```
Erro léxico (linha 1, coluna 9): '2x' mistura números e letras; identificadores devem começar com letra.
Erro léxico (linha 3, coluna 9): número real malformado '3.'; use dígitos dos dois lados do ponto.
Erro léxico (linha 3, coluna 14): número real malformado '1.2.3'; use dígitos dos dois lados do ponto.
Erro léxico (linha 4, coluna 11): caractere '@' não pertence à linguagem.
```

## Erros sintáticos

```
inteiro x
x = 3 ;
se ( x > 2 {
  escreva ( x ) ;
}
```

Fases: léxico **ok**, sintático **erro**, semântico **pulada**.

Mensagens:

```
Erro sintático (linha 1, coluna 10): esperado ';' ao final do comando, mas encontrado 'x'.
Erro sintático (linha 3, coluna 12): esperado ')' depois da condição, mas encontrado '{'.
```

## Erros semânticos

```
inteiro idade ;
logico alerta ;
idade = 2.5 ;
alerta = idade + 1 ;
total = idade * 2 ;
se ( idade ) {
  escreva ( x ) ;
}
inteiro idade ;
```

Fases: léxico **ok**, sintático **ok**, semântico **erro**.

Mensagens:

```
Erro semântico (linha 3, coluna 9): não é possível atribuir um valor real à variável inteira 'idade' (perda de precisão).
Erro semântico (linha 4, coluna 10): tipo incompatível: 'alerta' é logico, mas a expressão é inteiro.
Erro semântico (linha 5, coluna 1): variável 'total' não foi declarada.
Erro semântico (linha 6, coluna 6): a condição do 'se' deve ser logico, mas a expressão é inteiro.
Erro semântico (linha 7, coluna 13): variável 'x' não foi declarada.
Erro semântico (linha 9, coluna 9): variável 'idade' já foi declarada neste escopo (linha 1, coluna 9).
```

## Fora do escopo

```
se ( verdadeiro ) {
  inteiro n ;
  n = 1 ;
}
escreva ( n ) ;
```

Fases: léxico **ok**, sintático **ok**, semântico **erro**.

Mensagens:

```
Erro semântico (linha 5, coluna 11): variável 'n' não foi declarada.
```

