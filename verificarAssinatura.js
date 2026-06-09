// ==========================================
// FRONT-END COM AUTENTICAÇÃO LOCAL (usuário/senha)
// ==========================================

let tokenJWT = null;
const BASE_URL = 'https://reformer-unreal-escalate.ngrok-free.dev';

const loginContainer = document.getElementById('login-container');
const consultaContainer = document.getElementById('consulta-container');
const resultadoDiv = document.getElementById('resultado');
const campoBusca = document.getElementById('campoBusca');

// ========== LOGIN ==========
async function fazerLogin() {
    const nome = document.getElementById('login-nome').value.trim();
    const senha = document.getElementById('login-senha').value;
    if (!nome || !senha) {
        alert('Preencha usuário e senha.');
        return;
    }
    resultadoDiv.innerHTML = '<span class="loading">🔄 Autenticando...</span>';
    resultadoDiv.className = '';
    try {
        const resposta = await fetch(`${BASE_URL}/api/login`, {
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
        resultadoDiv.className = 'nao';
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

// ========== CONSULTAS ==========
async function verificar() {
    if (!tokenJWT) {
        alert('Faça login primeiro.');
        return;
    }
    const termo = campoBusca.value.trim();
    if (!termo) {
        resultadoDiv.innerHTML = '⚠️ Digite um nome, RG ou RA.';
        resultadoDiv.className = '';
        return;
    }
    resultadoDiv.innerHTML = '<span class="loading">🔄 Consultando...</span>';
    resultadoDiv.className = '';
    try {
        const resposta = await fetch(`${BASE_URL}/api/verificar`, {
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
        console.error('Erro na consulta:', err);
        resultadoDiv.innerHTML = `❌ Erro na conexão: ${err.message}`;
        resultadoDiv.className = 'nao';
    }
}

async function listarTodasCorrecoes() {
    if (!tokenJWT) {
        alert('Faça login primeiro.');
        return;
    }
    resultadoDiv.innerHTML = '<span class="loading">🔄 Carregando correções pendentes...</span>';
    resultadoDiv.className = '';
    try {
        const resposta = await fetch(`${BASE_URL}/api/verificar`, {
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
        console.error('Erro ao listar correções:', err);
        resultadoDiv.innerHTML = `❌ Erro: ${err.message}`;
        resultadoDiv.className = 'nao';
    }
}

function exibirResultados(encontrados, isListaCorrecoes = false) {
    if (!encontrados || encontrados.length === 0) {
        resultadoDiv.innerHTML = isListaCorrecoes
            ? '✅ Nenhuma correção pendente encontrada.'
            : '❌ Nenhuma assinatura encontrada.';
        resultadoDiv.className = isListaCorrecoes ? 'sim' : 'nao';
        return;
    }

    let titulo = isListaCorrecoes
        ? '<strong>🔧 Pessoas com correção pendente:</strong>'
        : '<strong>✅ SIM – encontrado(s):</strong>';
    let html = `<div class="sim">${titulo}<div class="lista"><ul>`;

    encontrados.forEach(item => {
        const nome = escapeHTML(item.nome);
        let info = '';
        if (item.curso && item.setor) {
            info = ` → Curso: ${escapeHTML(item.curso)} | Setor: ${escapeHTML(item.setor)}`;
        } else if (item.curso) {
            info = ` → ${escapeHTML(item.curso)}`;
        } else if (item.setor) {
            info = ` → ${escapeHTML(item.setor)}`;
        }

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
    resultadoDiv.className = '';

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

// ========== MODAL DE CORREÇÃO ==========
function criarModal() {
    if (document.getElementById('modal-correcao')) return;
    const modalHTML = `
    <div id="modal-correcao" class="modal">
        <div class="modal-content">
            <span class="modal-fechar">&times;</span>
            <h3>🔧 Correção Necessária</h3>
            <div id="modal-mensagem"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('modal-correcao');
    const fechar = modal.querySelector('.modal-fechar');
    fechar.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

function abrirModalCorrecao(nome, corrigirRG, corrigirRA, corrigirCurso) {
    criarModal();
    const modal = document.getElementById('modal-correcao');
    const msgDiv = document.getElementById('modal-mensagem');
    let texto = `<p><strong>Nome:</strong> ${escapeHTML(nome)}</p>`;
    texto += '<p><strong>Campos a corrigir na planilha:</strong></p><ul>';
    if (corrigirRG) texto += '<li>❌ <strong>RG</strong> – verificar e atualizar</li>';
    if (corrigirRA) texto += '<li>❌ <strong>RA</strong> – verificar e atualizar</li>';
    if (corrigirCurso) texto += '<li>❌ <strong>Curso</strong> – verificar e atualizar</li>';
    if (!corrigirRG && !corrigirRA && !corrigirCurso) texto += '<li>Nenhuma correção específica</li>';
    texto += '</ul><p>📌 Entre em contato com a administração para corrigir seus dados.</p>';
    msgDiv.innerHTML = texto;
    modal.style.display = 'block';
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// ========== LISTENERS ==========
document.getElementById('login-senha').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        fazerLogin();
    }
});
campoBusca.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') verificar();
});
