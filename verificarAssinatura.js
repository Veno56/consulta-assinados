// verificarAssinatura.js
let tokenJWT = S)qFQF"9x<wo~e@A4C_%V[D}}F{A:>VA%/}SN?_`"^{]>%TWJh;

// ⚠️ ATENÇÃO: substitua esta URL pela URL pública gerada pelo ngrok
// Exemplo: https://abc123.ngrok.io
const API_URL = 'https://reformer-unreal-escalate.ngrok-free.dev/api/verificar';

const loginContainer = document.getElementById('login-container');
const consultaContainer = document.getElementById('consulta-container');
const resultadoDiv = document.getElementById('resultado');
const campoBusca = document.getElementById('campoBusca');

async function fazerLogin() {
  const nome = document.getElementById('login-nome').value.trim();
  const senha = document.getElementById('login-senha').value;
  if (!nome || !senha) { alert('Preencha usuário e senha.'); return; }
  resultadoDiv.innerHTML = '<span class="loading">🔄 Autenticando...</span>';
  try {
    const resposta = await fetch(`${API_URL.replace('/api/verificar', '')}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, senha })
    });
    const dados = await resposta.json();
    if (dados.sucesso) {
      tokenJWT = dados.token;
      loginContainer.style.display = 'none';
      consultaContainer.style.display = 'block';
      resultadoDiv.innerHTML = '';
    } else {
      resultadoDiv.innerHTML = `❌ Erro: ${dados.erro}`;
      resultadoDiv.className = 'nao';
    }
  } catch (err) {
    resultadoDiv.innerHTML = `❌ Erro na conexão: ${err.message}`;
  }
}

function logout() {
  tokenJWT = null;
  loginContainer.style.display = 'block';
  consultaContainer.style.display = 'none';
  campoBusca.value = '';
  resultadoDiv.innerHTML = '';
  document.getElementById('login-nome').value = '';
  document.getElementById('login-senha').value = '';
}

async function verificar() {
  if (!tokenJWT) { alert('Faça login primeiro.'); return; }
  const termo = campoBusca.value.trim();
  if (!termo) { resultadoDiv.innerHTML = '⚠️ Digite um nome, RG ou RA.'; return; }
  resultadoDiv.innerHTML = '<span class="loading">🔄 Consultando...</span>';
  try {
    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenJWT}`
      },
      body: JSON.stringify({ termo })
    });
    const dados = await resposta.json();
    if (dados.erro) {
      if (resposta.status === 401 || resposta.status === 403) {
        alert('Sessão expirada. Faça login novamente.');
        logout();
        return;
      }
      resultadoDiv.innerHTML = `❌ Erro: ${dados.erro}`;
      resultadoDiv.className = 'nao';
      return;
    }
    exibirResultados(dados.encontrados);
  } catch (err) {
    resultadoDiv.innerHTML = `❌ Erro na conexão: ${err.message}`;
  }
}

async function listarTodasCorrecoes() {
  if (!tokenJWT) { alert('Faça login primeiro.'); return; }
  resultadoDiv.innerHTML = '<span class="loading">🔄 Carregando correções...</span>';
  try {
    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenJWT}`
      },
      body: JSON.stringify({ termo: '___TODOS_CORRECOES___' })
    });
    const dados = await resposta.json();
    if (dados.erro) throw new Error(dados.erro);
    exibirResultados(dados.encontrados, true);
  } catch (err) {
    resultadoDiv.innerHTML = `❌ Erro: ${err.message}`;
  }
}

function exibirResultados(encontrados, isListaCorrecoes = false) {
  if (!encontrados || encontrados.length === 0) {
    resultadoDiv.innerHTML = isListaCorrecoes ? '✅ Nenhuma correção pendente.' : '❌ Nenhuma assinatura encontrada.';
    resultadoDiv.className = isListaCorrecoes ? 'sim' : 'nao';
    return;
  }
  let titulo = isListaCorrecoes ? '<strong>🔧 Pessoas com correção pendente:</strong>' : '<strong>✅ SIM – encontrado(s):</strong>';
  let html = `<div class="sim">${titulo}<div class="lista"><ul>`;
  encontrados.forEach(item => {
    const nome = escapeHTML(item.nome);
    let info = '';
    if (item.curso && item.setor) info = ` → Curso: ${escapeHTML(item.curso)} | Setor: ${escapeHTML(item.setor)}`;
    else if (item.curso) info = ` → ${escapeHTML(item.curso)}`;
    else if (item.setor) info = ` → ${escapeHTML(item.setor)}`;
    const temCorrecao = item.corrigirRG || item.corrigirRA || item.corrigirCurso;
    let botao = '';
    if (temCorrecao) {
      botao = `<button class="btn-correcao"
      data-nome="${escapeHTML(item.nome)}"
      data-rg="${item.corrigirRG}"
      data-ra="${item.corrigirRA}"
      data-curso="${item.corrigirCurso}">🔍</button>`;
    }
    html += `<li><strong>${nome}</strong>${info} ${botao}</li>`;
  });
  html += '</ul></div></div>';
  resultadoDiv.innerHTML = html;
  document.querySelectorAll('.btn-correcao').forEach(btn => {
    btn.addEventListener('click', () => {
      const nome = btn.dataset.nome;
      const rg = btn.dataset.rg === 'true';
      const ra = btn.dataset.ra === 'true';
      const curso = btn.dataset.curso === 'true';
      abrirModalCorrecao(nome, rg, ra, curso);
    });
  });
}

function criarModal() { /* igual ao anterior – omitido por brevidade, mas mantenha do código original */ }
function abrirModalCorrecao(nome, corrigirRG, corrigirRA, corrigirCurso) { /* igual */ }
function escapeHTML(str) { return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])); }

campoBusca.addEventListener('keypress', e => { if (e.key === 'Enter') verificar(); });
