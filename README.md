# MiniLang

Compilador da MiniLang, a linguagem que os técnicos usam para escrever regras de alerta dos equipamentos.
Ele lê a regra, aponta os erros (com linha e coluna) e só aprova a regra que estiver correta.

<img width="1920" height="950" alt="image" src="https://github.com/user-attachments/assets/e67023a1-87d4-4a83-ace5-b6c10d71a303" />

## Como funciona

A regra passa por três fases, uma depois da outra. Se uma fase encontra erro, as seguintes não rodam.

1. **Léxica**: separa o texto em tokens (palavras, números, símbolos). Arquivo: `src/compiler/lexico/lexer.ts`
2. **Sintática**: confere se os tokens estão na ordem certa e monta a árvore do programa. Arquivo: `src/compiler/sintatico/parser.ts`
3. **Semântica**: confere se as variáveis foram declaradas, se estão no bloco certo e se os tipos combinam. Arquivos: `src/compiler/semantico/semantic.ts` e `symbols.ts`

Se a regra for aprovada, a tela também consegue executá-la com valores de teste.

## Como executar

É preciso ter o **Node.js 22** (ou mais novo) instalado.

Dentro da pasta do projeto, rode:

```bash
npm install
npm run dev
```

Depois abra no navegador o endereço que aparecer no terminal (normalmente http://localhost:5173).

Para rodar os testes automáticos:

```bash
npm test
```

## Como usar a tela

- **Código MiniLang**: escreva a regra ou escolha um exemplo pronto na lista. A análise é refeita a cada alteração.
- **Resultado**: digite os valores para os `leia` (ex.: `6 4`) e veja o que o `escreva` mostra.
- **Análise**: mostra se a regra foi aprovada ou recusada e tem as abas Árvore, Mensagens, Símbolos e Tokens. Clicar em uma mensagem de erro leva até o local no código.

## Exemplo de regra

```
real temperatura ;
leia ( temperatura ) ;
se ( temperatura > 35.5 ) {
  escreva ( 1 ) ;
} senao {
  escreva ( 0 ) ;
}
```
