const CSV_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSg7VhvYwzysBmr8Rf36oz4ugGPGc4AX_gebSJsHt1hf8NPLfFjvzU6-JBWU7hLS6vAmyi_uWhcpye8/pub?gid=1373798732&single=true&output=csv';
const PROXY = 'https://corsproxy.io/?';
const cacheBuster = () => `&_cb=${Date.now()}`;

function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizarTexto(texto) {
    if (texto == null) return '';
    let str = texto.toString().trim();
    if (str === '') return '';
    str = str.toLowerCase();
    str = removerAcentos(str);
    return str;
}

function normalizarRG(rgRaw) {
    if (rgRaw == null) return '';
    const str = rgRaw.toString().trim();
    if (str === '') return '';
    let apenasDigitos = str.replace(/\D/g, '');
    if (apenasDigitos === '') return '';
    let semZeros = apenasDigitos.replace(/^0+/, '');
    return semZeros;
}

function parseCSV(textoCSV) {
    const primeiraLinha = textoCSV.split(/\r?\n/)[0];
    const virgulas = (primeiraLinha.match(/,/g) || []).length;
    const pontoVirgulas = (primeiraLinha.match(/;/g) || []).length;
    const separador = pontoVirgulas > virgulas ? ';' : ',';
    console.log(`Separador detectado: "${separador}"`);

    const linhas = [];
    const linhasBrutas = textoCSV.split(/\r?\n/);
    for (let linha of linhasBrutas) {
        if (linha.trim() === '') continue;
        const colunas = [];
        let dentroAspas = false;
        let valorAtual = '';
        for (let i = 0; i < linha.length; i++) {
            const char = linha[i];
            if (char === '"') {
                dentroAspas = !dentroAspas;
            } else if (char === separador && !dentroAspas) {
                colunas.push(valorAtual.trim());
                valorAtual = '';
            } else {
                valorAtual += char;
            }
        }
        colunas.push(valorAtual.trim());
        if (colunas.length) linhas.push(colunas);
    }
    return linhas;
}

function encontrarIndice(cabecalhoNorm, palavrasChave) {
    for (let i = 0; i < cabecalhoNorm.length; i++) {
        for (let palavra of palavrasChave) {
            if (cabecalhoNorm[i].includes(palavra)) return i;
        }
    }
    return -1;
}

function primeiroNomeCorresponde(nomeCompleto, termo) {
    if (!termo || !nomeCompleto) return false;
    const primeiroNome = nomeCompleto.split(/\s+/)[0];
    return primeiroNome.startsWith(termo);
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

async function verificar() {
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
        const csvUrlComTimestamp = CSV_BASE + cacheBuster();
        const urlComProxy = PROXY + encodeURIComponent(csvUrlComTimestamp);
        const resposta = await fetch(urlComProxy);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const textoCSV = await resposta.text();

        if (textoCSV.trim().startsWith('<')) {
            throw new Error('Proxy retornou HTML. Verifique o link do CSV.');
        }

        const dados = parseCSV(textoCSV);
        if (dados.length < 2) {
            resultadoDiv.innerHTML = '❌ Nenhum dado encontrado no CSV.';
            resultadoDiv.className = 'nao';
            return;
        }

        const cabecalho = dados[0].map(c => normalizarTexto(c));
        let idxNome = encontrarIndice(cabecalho, ['nome']);
        if (idxNome === -1) idxNome = 0;
        let idxRg = encontrarIndice(cabecalho, ['rg']);
        if (idxRg === -1) idxRg = 1;
        let idxRa = encontrarIndice(cabecalho, ['ra']);
        if (idxRa === -1) idxRa = 2;
        let idxCursoSetor = encontrarIndice(cabecalho, ['curso', 'setor', 'cargo', 'vinculo', 'departamento']);
        if (idxCursoSetor === -1) idxCursoSetor = null;

        console.log(`Índices -> NOME:${idxNome}, RG:${idxRg}, RA:${idxRa}, CURSO/SETOR:${idxCursoSetor}`);

        const termoNorm = normalizarTexto(termo);
        const termoRGNorm = normalizarRG(termo);

        let resultadosNome = [];
        let rgEncontrado = null, raEncontrado = null;
        let cursoSetorRG = '', cursoSetorRA = '';

        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            if (linha.length < Math.max(idxNome, idxRg, idxRa) + 1) continue;

            const nomeOriginal = linha[idxNome] || '';
            const nome = normalizarTexto(nomeOriginal);
            const rg = normalizarRG(linha[idxRg] || '');
            const ra = normalizarTexto(linha[idxRa] || '');
            const cursoSetor = (idxCursoSetor !== null && linha[idxCursoSetor]) ? linha[idxCursoSetor] : '';

            if (i <= 5) console.log(`Registro ${i}: NOME="${nome}", RG="${rg}", RA="${ra}", CURSO="${cursoSetor}"`);

            if (primeiroNomeCorresponde(nome, termoNorm)) {
                resultadosNome.push({ nome: nomeOriginal, cursoSetor });
            }
            if (rg !== '' && termoRGNorm !== '' && rg === termoRGNorm) {
                rgEncontrado = nomeOriginal;
                cursoSetorRG = cursoSetor;
            }
            if (ra !== '' && termoNorm !== '' && (ra === termoNorm || ra.includes(termoNorm))) {
                raEncontrado = nomeOriginal;
                cursoSetorRA = cursoSetor;
            }
        }

        if (resultadosNome.length > 0) {
            let listaHTML = '<div class="sim"><strong>✅ SIM – encontrado(s) pelo nome:</strong>';
            listaHTML += '<div class="lista"><ul>';
            resultadosNome.forEach(item => {
                let nomeExib = escapeHTML(item.nome);
                let cursoExib = item.cursoSetor ? escapeHTML(item.cursoSetor) : '';
                listaHTML += `<li><strong>${nomeExib}</strong> ${cursoExib ? `<span class="curso-setor">→ ${cursoExib}</span>` : ''}</li>`;
            });
            listaHTML += '</ul></div></div>';
            resultadoDiv.innerHTML = listaHTML;
            resultadoDiv.className = '';
        } else if (rgEncontrado) {
            let cursoExib = cursoSetorRG ? escapeHTML(cursoSetorRG) : '';
            resultadoDiv.innerHTML = `<div class="sim"><strong>✅ SIM – encontrado pelo RG:</strong><br>
            <strong>${escapeHTML(rgEncontrado)}</strong> ${cursoExib ? `<span class="curso-setor">→ ${cursoExib}</span>` : ''}</div>`;
            resultadoDiv.className = '';
        } else if (raEncontrado) {
            let cursoExib = cursoSetorRA ? escapeHTML(cursoSetorRA) : '';
            resultadoDiv.innerHTML = `<div class="sim"><strong>✅ SIM – encontrado pelo RA:</strong><br>
            <strong>${escapeHTML(raEncontrado)}</strong> ${cursoExib ? `<span class="curso-setor">→ ${cursoExib}</span>` : ''}</div>`;
            resultadoDiv.className = '';
        } else {
            resultadoDiv.innerHTML = '❌ NÃO – nenhuma assinatura encontrada.';
            resultadoDiv.className = 'nao';
        }
    } catch (erro) {
        console.error('Erro:', erro);
        resultadoDiv.innerHTML = `❌ Erro: ${erro.message}`;
        resultadoDiv.className = 'nao';
    }
}

// ----- LISTENER PARA TECLA ENTER -----
document.getElementById('campoBusca').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        verificar();
    }
});
