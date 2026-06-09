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
        resultadoDiv.innerHTML = `❌ Erro: ${err.message}`;
        resultadoDiv.className = 'nao';
    }
}

function exibirResultados(encontrados, isListaCorrecoes = false) {
    // ... (mantenha a função exibirResultados do código anterior) ...
}

function criarModal() { /* ... */ }
function abrirModalCorrecao(nome, corrigirRG, corrigirRA, corrigirCurso) { /* ... */ }
function escapeHTML(str) { /* ... */ }

// ========== LISTENERS ==========
// Enter no campo de senha (tela de login)
document.getElementById('login-senha').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        fazerLogin();
    }
});
// Enter no campo de busca (tela de consulta)
campoBusca.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') verificar();
});
