// ==========================================
// FRONT-END COM AUTENTICAÇÃO LOCAL (usuário/senha)
// ==========================================

let tokenJWT = localStorage.getItem('tokenJWT') || null;
const BASE_URL = 'https://reformer-unreal-escalate.ngrok-free.dev';

const loginContainer = document.getElementById('login-container');
const consultaContainer = document.getElementById('consulta-container');
const resultadoDiv = document.getElementById('resultado');
const campoBusca = document.getElementById('campoBusca');

// Se já estiver logado (token no localStorage), mostra a tela de consulta
if (tokenJWT) {
    loginContainer.style.display = 'none';
    consultaContainer.style.display = 'block';
}

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
            localStorage.setItem('tokenJWT', dados.token);
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
    localStorage.removeItem('tokenJWT');
    loginContainer.style.display = 'block';
    consultaContainer.style.display = 'none';
    campoBusca.value = '';
    resultadoDiv.innerHTML = '';
    document.getElementById('login-nome').value = '';
    document.getElementById('login-senha').value = '';
}

async function verificar() {
    let token = tokenJWT;
    if (!token) {
        token = localStorage.getItem('tokenJWT');
        if (!token) {
            alert('Faça login primeiro.');
            return;
        }
        tokenJWT = token;
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
                'Authorization': `Bearer ${token}`
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
    let token = tokenJWT;
    if (!token) {
        token = localStorage.getItem('tokenJWT');
        if (!token) {
            alert('Faça login primeiro.');
            return;
        }
        tokenJWT = token;
    }
    resultadoDiv.innerHTML = '<span class="loading">🔄 Carregando correções pendentes...</span>';
    resultadoDiv.className = '';
    try {
        const resposta = await fetch(`${BASE_URL}/api/verificar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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

// As funções exibirResultados, criarModal, abrirModalCorrecao, escapeHTML permanecem iguais
// ... (copie do seu arquivo atual, elas estão ok)

// Listeners
document.getElementById('login-senha').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fazerLogin();
});
campoBusca.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') verificar();
});
