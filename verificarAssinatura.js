// ==========================================
// FRONT-END SEGURO (com login Google e Curso/Setor)
// ==========================================

let tokenIdGlobal = null;
let usuarioAutorizado = false;

const API_URL = 'https://newspapers-offshore-ryan-restrictions.trycloudflare.com/api/verificar';
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

        // Combina curso e setor conforme disponibilidade
        if (item.curso && item.setor) {
          infoAdicional = ` → Curso: ${escapeHTML(item.curso)} | Setor: ${escapeHTML(item.setor)}`;
        } else if (item.curso) {
          infoAdicional = ` → ${escapeHTML(item.curso)}`;
        } else if (item.setor) {
          infoAdicional = ` → ${escapeHTML(item.setor)}`;
        }

        listaHTML += `<li><strong>${nomeExib}</strong>${infoAdicional}</li>`;
      });

      listaHTML += '</ul></div></div>';
      resultadoDiv.innerHTML = listaHTML;
      resultadoDiv.className = '';
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

