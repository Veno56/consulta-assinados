// ==========================================
// FRONT-END SEGURO (com login Google e Curso/Setor)
// ==========================================

let tokenIdGlobal = null;
let usuarioAutorizado = false;

const API_URL = 'http://localhost:3001/api/verificar';
const CLIENT_ID = '1071055000182-hm20f433jmgqvce1luen9lksi99kcv99.apps.googleusercontent.com';

// Inicializa o SDK do Google Identity Services
window.onload = function() {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);

  script.onload = () => {
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    google.accounts.id.renderButton(
      document.getElementById('google-login-btn'),
                                    { theme: 'outline', size: 'large', text: 'login_with' }
    );
  };
};

function handleCredentialResponse(response) {
  tokenIdGlobal = response.credential;
  usuarioAutorizado = true;
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('consulta-container').style.display = 'block';
}

function logout() {
  tokenIdGlobal = null;
  usuarioAutorizado = false;
  google.accounts.id.disableAutoSelect();
  document.getElementById('login-container').style.display = 'block';
  document.getElementById('consulta-container').style.display = 'none';
  document.getElementById('campoBusca').value = '';
  document.getElementById('resultado').innerHTML = '';
}

// Funções de normalização (para manter consistência)
function normalizarTexto(t) {
  if (!t) return '';
  return t.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizarRG(r) {
  if (!r) return '';
  const digitos = r.toString().replace(/\D/g, '');
  return digitos ? digitos.replace(/^0+/, '') : '';
}

// Modal de correção
function criarModal() {
  if (document.getElementById('modal-correcao')) return;
  const modalHTML = `
  <div id="modal-correcao" class="modal">
  <div class="modal-content">
  <span class="modal-fechar">&times;</span>
  <h3>🔧 Correção Necessária</h3>
  <div id="modal-mensagem"></div>
  </div>
  </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('modal-correcao');
  const fecharBtn = modal.querySelector('.modal-fechar');
  fecharBtn.onclick = () => modal.style.display = 'none';
  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = 'none';
  };
}

function abrirModalCorrecao(nome, corrigirRG, corrigirRA) {
  criarModal();
  const modal = document.getElementById('modal-correcao');
  const mensagemDiv = document.getElementById('modal-mensagem');

  let texto = `<p><strong>Nome:</strong> ${escapeHTML(nome)}</p>`;
  texto += '<p><strong>Campos a corrigir na planilha:</strong></p><ul>';
  if (corrigirRG) texto += '<li>❌ <strong>RG</strong> – verificar e atualizar</li>';
  if (corrigirRA) texto += '<li>❌ <strong>RA</strong> – verificar e atualizar</li>';
  if (!corrigirRG && !corrigirRA) texto += '<li>Nenhuma correção específica (apenas observação)</li>';
  texto += '</ul><p>📌 Por favor, entre em contato com a administração para corrigir seus dados.</p>';

  mensagemDiv.innerHTML = texto;
  modal.style.display = 'block';
}

// Busca principal
async function verificar() {
  if (!usuarioAutorizado || !tokenIdGlobal) {
    alert('Faça login primeiro.');
    return;
  }

  const termo = document.getElementById('campoBusca').value.trim();
  const resultadoDiv = document.getElementById('resultado');

  if (!termo) {
    resultadoDiv.innerHTML = '⚠️ Digite um nome, RG ou RA.';
    resultadoDiv.className = '';
    return;
  }

  resultadoDiv.innerHTML = '<span class="loading">🔄 Consultando...</span>';
  resultadoDiv.className = '';

  try {
    const resposta = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId: tokenIdGlobal, termo: termo })
    });

    const dados = await resposta.json();

    if (dados.erro) {
      resultadoDiv.innerHTML = `❌ Erro: ${dados.erro}`;
      resultadoDiv.className = 'nao';
      return;
    }

    if (dados.encontrados && dados.encontrados.length > 0) {
      let listaHTML = '<div class="sim"><strong>✅ SIM – encontrado(s):</strong>';
      listaHTML += '<div class="lista"><ul>';

      dados.encontrados.forEach(item => {
        const nomeExib = escapeHTML(item.nome);
        let infoAdicional = '';

        if (item.curso && item.setor) {
          infoAdicional = ` → Curso: ${escapeHTML(item.curso)} | Setor: ${escapeHTML(item.setor)}`;
        } else if (item.curso) {
          infoAdicional = ` → ${escapeHTML(item.curso)}`;
        } else if (item.setor) {
          infoAdicional = ` → ${escapeHTML(item.setor)}`;
        }

        const temCorrecao = item.corrigirRG || item.corrigirRA;
        let botaoCorrecao = '';
        if (temCorrecao) {
          botaoCorrecao = `<button class="btn-correcao"
          data-nome="${escapeHTML(item.nome)}"
          data-rg="${item.corrigirRG}"
          data-ra="${item.corrigirRA}">🔍</button>`;
        }

        listaHTML += `<li><strong>${nomeExib}</strong>${infoAdicional}${botaoCorrecao}</li>`;
      });

      listaHTML += '</ul></div></div>';
      resultadoDiv.innerHTML = listaHTML;
      resultadoDiv.className = '';

      // Ativar eventos dos botões de correção
      document.querySelectorAll('.btn-correcao').forEach(btn => {
        btn.addEventListener('click', () => {
          const nome = btn.getAttribute('data-nome');
          const corrigirRG = btn.getAttribute('data-rg') === 'true';
          const corrigirRA = btn.getAttribute('data-ra') === 'true';
          abrirModalCorrecao(nome, corrigirRG, corrigirRA);
        });
      });
    } else {
      resultadoDiv.innerHTML = '❌ NÃO – nenhuma assinatura encontrada.';
      resultadoDiv.className = 'nao';
    }
  } catch (err) {
    console.error('Erro na consulta:', err);
    resultadoDiv.innerHTML = `❌ Erro na conexão: ${err.message}`;
    resultadoDiv.className = 'nao';
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Listener para tecla Enter
document.getElementById('campoBusca').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    verificar();
  }
});
