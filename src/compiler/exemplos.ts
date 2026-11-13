// Programas de exemplo: os 3 da Etapa 1 e um de cada tipo de erro.
export interface Exemplo {
  id: string;
  titulo: string;
  grupo: 'aceita' | 'recusa';
  /** Fase em que o compilador deve parar; 'ok' = programa aceito. */
  esperado: 'ok' | 'lexico' | 'sintatico' | 'semantico';
  /** Valores digitados para os `leia` (separados por espaço ou linha). */
  entrada?: string;
  codigo: string;
}

export const EXEMPLOS: Exemplo[] = [
  {
    id: 'area', titulo: 'Área do triângulo', grupo: 'aceita', esperado: 'ok', entrada: '6 4',
    codigo: `inteiro base ;
inteiro altura ;
leia ( base ) ;
leia ( altura ) ;
real area ;
area = base * altura / 2.0 ;
escreva ( area ) ;
`,
  },
  {
    id: 'alerta', titulo: 'Alerta de temperatura', grupo: 'aceita', esperado: 'ok', entrada: '40',
    codigo: `real temperatura ;
leia ( temperatura ) ;
logico alerta ;
alerta = verdadeiro ;
se ( temperatura > 35.5 e alerta == verdadeiro ) {
  escreva ( 1 ) ;
} senao {
  escreva ( 0 ) ;
}
`,
  },
  {
    id: 'contador', titulo: 'Contador', grupo: 'aceita', esperado: 'ok',
    codigo: `inteiro contador ;
contador = 0 ;
enquanto ( contador < 10 ) {
  contador = contador + 1 ;
}
escreva ( contador ) ;
`,
  },
  {
    id: 'escopo-ok', titulo: 'Variável de bloco', grupo: 'aceita', esperado: 'ok', entrada: '35.5',
    codigo: `real temperatura ;
leia ( temperatura ) ;
se ( temperatura > 30.0 ) {
  inteiro nivel ;
  nivel = 2 ;
  escreva ( nivel ) ;
}
`,
  },
  {
    id: 'lexico', titulo: 'Erros léxicos', grupo: 'recusa', esperado: 'lexico',
    codigo: `inteiro 2x ;
real preco ;
preco = 3. + 1.2.3 ;
preco = 5 @ 2 ;
`,
  },
  {
    id: 'sintatico', titulo: 'Erros sintáticos', grupo: 'recusa', esperado: 'sintatico',
    codigo: `inteiro x
x = 3 ;
se ( x > 2 {
  escreva ( x ) ;
}
`,
  },
  {
    id: 'semantico', titulo: 'Erros semânticos', grupo: 'recusa', esperado: 'semantico',
    codigo: `inteiro idade ;
logico alerta ;
idade = 2.5 ;
alerta = idade + 1 ;
total = idade * 2 ;
se ( idade ) {
  escreva ( x ) ;
}
inteiro idade ;
`,
  },
  {
    id: 'escopo-erro', titulo: 'Fora do escopo', grupo: 'recusa', esperado: 'semantico',
    codigo: `se ( verdadeiro ) {
  inteiro n ;
  n = 1 ;
}
escreva ( n ) ;
`,
  },
];
