// Desenho da árvore sintática: tudo aberto, linhas de ligação simples,
// e uma cor por categoria de nó (estrutura, operador, valor).
import type { NoArvore } from '../compiler';

function Item({ no }: { no: NoArvore }) {
  return (
    <li>
      <span className={`no ${no.categoria}`}>{no.rotulo}</span>
      {no.filhos.length > 0 && (
        <ul>{no.filhos.map((f, i) => <Item key={i} no={f} />)}</ul>
      )}
    </li>
  );
}

export default function Arvore({ raiz }: { raiz: NoArvore }) {
  return (
    <>
      <p className="legenda">
        <span className="no estrutura">estrutura</span>
        <span className="no operador">operador</span>
        <span className="no valor">valor</span>
      </p>
      <ul className="arv"><Item no={raiz} /></ul>
    </>
  );
}
