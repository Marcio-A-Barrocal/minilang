// Gera docs/evidencias.md: saída REAL do compilador para cada exemplo.
// Uso: npm run evidencias
import { compilar, EXEMPLOS, emTexto, formatar } from '../src/compiler';

const out: string[] = ['# Evidências geradas pelo compilador', ''];
out.push('Saída real de `compilar()` para cada programa de exemplo (gerada por `npm run evidencias`).', '');

for (const ex of EXEMPLOS) {
  const r = compilar(ex.codigo, ex.entrada ?? '');
  out.push(`## ${ex.titulo}`, '', '```', ex.codigo.trimEnd(), '```', '');
  out.push(`Fases: léxico **${r.fases.lexico}**, sintático **${r.fases.sintatico}**, semântico **${r.fases.semantico}**.`, '');
  if (r.arvore && ex.grupo === 'aceita') out.push('Árvore:', '', '```', emTexto(r.arvore), '```', '');
  if (r.simbolos.length && ex.grupo === 'aceita') {
    out.push('Tabela de símbolos:', '', '| Nome | Tipo | Escopo | Declarada em | Recebe valor | Usos |', '|---|---|---|---|---|---|');
    for (const s of r.simbolos) {
      out.push(`| ${s.nome} | ${s.tipo} | ${s.escopo} | ${s.linha}:${s.coluna} | ${s.inicializada ? 'sim' : 'não'} | ${s.usos} |`);
    }
    out.push('');
  }
  if (r.execucao) {
    out.push(`Execução (entrada: \`${ex.entrada ?? '(nenhuma)'}\`):`, '', '```', ...(r.execucao.saida.length ? r.execucao.saida : ['(sem saída)']), ...(r.execucao.erro ? [`Erro de execução: ${r.execucao.erro}`] : []), '```', '');
  }
  if (r.diagnosticos.length) out.push('Mensagens:', '', '```', ...r.diagnosticos.map(formatar), '```', '');
  else out.push('Nenhum erro nem aviso.', '');
}
console.log(out.join('\n'));
