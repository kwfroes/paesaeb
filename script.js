'use strict';

    /* CONFIGURAÇÃO: execute supabase-schema.sql e substitua os valores abaixo.
       Use somente a chave pública anon/publishable; nunca use service_role no HTML.
       Schema: profiles, demandas, logs_auditoria e bucket anexos-demandas. */
    const SUPABASE_URL = 'https://ourbexrwngwqqfauewjk.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_uTPAmoZDh1o8ovMoK7t47g_nQDVE17O';
    const SUPABASE_CONFIGURADO = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)
      && !SUPABASE_ANON_KEY.includes('SUA_CHAVE');
    const supabaseClient = SUPABASE_CONFIGURADO
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;
    let sessaoAtual = null;
    let perfilAtual = null;

    // Utilitário Perfil
    function getPerfil() {
        return perfilAtual?.perfil || 'Usuário';
    }

    window.toggleSidebar = function() {
        document.getElementById('appPage').classList.toggle('collapsed');
    };

    // Helper Global para os Dropdowns Customizados
    window.toggleDropdown = function(element) {
        element.parentElement.classList.toggle('visible');
    };
    
    window.updateDropdownText = function(containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;
        const checked = container.querySelectorAll('input[type="checkbox"]:checked');
        const anchor = container.querySelector('.anchor');
        if(checked.length === 0) {
            anchor.innerText = "Selecione...";
        } else if(checked.length === 1) {
            anchor.innerText = checked[0].value;
        } else {
            anchor.innerText = checked.length + " selecionados";
        }
    };

    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown-check-list')) {
            document.querySelectorAll('.dropdown-check-list.visible').forEach(dd => {
                dd.classList.remove('visible');
            });
        }
    });

    window.maskSEI = function(v) {
        v = v.replace(/\D/g, "");
        v = v.replace(/^(\d{3})(\d)/, "$1.$2");
        v = v.replace(/^(\d{3})\.(\d{4})(\d)/, "$1.$2.$3");
        v = v.replace(/^(\d{3})\.(\d{4})\.(\d{4})(\d)/, "$1.$2.$3.$4");
        v = v.replace(/^(\d{3})\.(\d{4})\.(\d{4})\.(\d{7})(\d)/, "$1.$2.$3.$4-$5");
        return v.substring(0, 25);
    };

    window.maskCPF = function(v) {
        v = v.replace(/\D/g, "");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
        v = v.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
        return v.substring(0, 14);
    };

    window.maskCurrency = function(v) {
        v = v.replace(/\D/g, "");
        if(!v) return "";
        v = (parseInt(v) / 100).toFixed(2);
        v = v.replace(".", ",");
        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        return v;
    };

    // Substitua a função window.solicitarAcesso inteira por isto:
    window.solicitarAcesso = function(e) {
        e.preventDefault();
        const modalHtml = `
        <div class="modal-backdrop" onclick="fecharModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-header" style="color: var(--azul-900);">Solicitar Acesso</div>
            <div class="modal-body">
                <p style="margin-top: 0; color: var(--cinza-600); font-size: 13px;">Preencha os dados abaixo.</p>
                <form onsubmit="enviarSolicitacaoAcesso(event)">
                <div class="form-group"><label>Nome Completo *</label><input id="solicNome" type="text" required placeholder="Nome completo do servidor" /></div>
                <div class="form-group"><label>E-mail Institucional *</label><input id="solicEmail" type="email" required placeholder="email@saeb.ba.gov.br" /></div>
                <div class="form-group"><label>CPF *</label><input id="solicCpf" type="text" required placeholder="000.000.000-00" oninput="this.value = maskCPF(this.value)" /></div>
                <div class="form-group"><label>Diretoria / Coordenação *</label><input id="solicSetor" type="text" required placeholder= "Diretoria/Coordenação" /></div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Enviar Solicitação</button>
                </div>
                </form>
            </div>
            </div>
        </div>
        `;
        document.getElementById('modalContainer').innerHTML = modalHtml;
        document.getElementById('modalContainer').classList.remove('hidden');
    };


    window.enviarSolicitacaoAcesso = async function(e) {
        e.preventDefault();
        const nome = document.getElementById('solicNome').value.trim();
        const email = document.getElementById('solicEmail').value.trim();
        const cpf = document.getElementById('solicCpf').value.trim();
        const setor = document.getElementById('solicSetor').value.trim();

        if(!supabaseClient) {
            toast('Conexão com o banco falhou.');
            return;
        }

        // Altera o estado do botão para dar feedback visual
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.innerText;
        btnSubmit.innerText = 'Enviando...';
        btnSubmit.disabled = true;

        const { error } = await supabaseClient.from('solicitacoes_acesso').insert([{
            nome, email, cpf, setor
        }]);

        if (error) {
            btnSubmit.innerText = textoOriginal;
            btnSubmit.disabled = false;
            
            // Modal de Erro
            const erroHtml = `
              <div class="modal-backdrop" onclick="fecharModal()">
                <div class="modal-content" onclick="event.stopPropagation()" style="text-align: center; max-width: 400px;">
                  <div style="font-size: 40px; margin-bottom: 16px;">❌</div>
                  <h3 style="color: var(--vermelho); margin-top: 0;">Erro ao solicitar</h3>
                  <p style="color: var(--cinza-700); font-size: 14px; margin-bottom: 24px;">${error.message}</p>
                  <button class="btn btn-secondary btn-full" onclick="fecharModal()">Fechar</button>
                </div>
              </div>
            `;
            document.getElementById('modalContainer').innerHTML = erroHtml;
        } else {
            // Modal de Sucesso
            const sucessoHtml = `
              <div class="modal-backdrop" onclick="fecharModal()">
                <div class="modal-content" onclick="event.stopPropagation()" style="text-align: center; max-width: 400px;">
                  <div style="font-size: 40px; margin-bottom: 16px;">✔️</div>
                  <h3 style="color: var(--azul-900); margin-top: 0;">Solicitação Enviada!</h3>
                  <p style="color: var(--cinza-700); font-size: 14px; margin-bottom: 24px;">
                    Sua solicitação foi enviada com sucesso! Aguarde a aprovação do administrador. Você receberá sua senha temporária por e-mail.
                  </p>
                  <button class="btn btn-primary btn-full" onclick="fecharModal()">Entendi</button>
                </div>
              </div>
            `;
            document.getElementById('modalContainer').innerHTML = sucessoHtml;
        }
    };

// Modal para o usuário redefinir a própria senha (na tela de login)
    window.abrirEsqueceuSenha = function(e) {
        e.preventDefault();
        
        // Se o usuário já tiver digitado o email no campo de login, a gente já puxa ele
        const emailPreenchido = document.getElementById('loginEmail').value.trim();

        const modalHtml = `
          <div class="modal-backdrop" onclick="fecharModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 400px;">
              <div class="modal-header" style="color: var(--azul-900);">Recuperação de Senha</div>
              <div class="modal-body">
                <p style="margin-top: 0; color: var(--cinza-600); font-size: 13px;">Informe seu e-mail cadastrado para redefinir.</p>
                <form onsubmit="enviarRecuperacaoSenha(event)">
                  <div class="form-group">
                    <label>E-mail Institucional</label>
                    <input id="recEmail" type="email" required value="${emailPreenchido}" placeholder="email@saeb.ba.gov.br" />
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
                    <button type="submit" id="btnRecuperar" class="btn btn-primary">Enviar Link</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        `;
        document.getElementById('modalContainer').innerHTML = modalHtml;
        document.getElementById('modalContainer').classList.remove('hidden');
    };

    // Função que chama a Edge Function para o usuário na tela de Login
    window.enviarRecuperacaoSenha = async function(e) {
        e.preventDefault();
        const email = document.getElementById('recEmail').value.trim();
        const btn = document.getElementById('btnRecuperar');

        btn.innerText = 'Enviando...';
        btn.disabled = true;

        const { error } = await supabaseClient.functions.invoke('recuperar-senha', {
            body: { email: email }
        });

        if (error) {
            btn.innerText = 'Enviar Link';
            btn.disabled = false;
            return alert(`Erro ao enviar: ${error.message}`);
        }

        fecharModal();
        toast('Link de recuperação enviado para o seu e-mail!');
    };

    // Atualização da função do painel Master para forçar a troca de senha (usa a mesma Edge Function)
    window.alterarSenha = async function(id) {
        if(getPerfil() !== 'Master') { toast('Acesso restrito!'); return; }
        const u = usuarios.find(x => String(x.id) === String(id));
        if(u) {
            const { error } = await supabaseClient.functions.invoke('recuperar-senha', {
                body: { email: u.email }
            });
            if (error) return toast(`Falha: ${error.message}`);
            registrarLog('Usuário', `Recuperação de senha enviada para ${u.nome}`);
            toast('Recuperação enviado por e-mail!');
        }
    };

    window.verAnexos = async function(id) {
        const demanda = demandas.find(d => String(d.id) === String(id));
        if (!demanda?.anexos?.length) return toast('Esta demanda não possui anexos.');
        const links = [];
        for (const anexo of demanda.anexos) {
          if (!anexo.path) continue;
          const { data, error } = await supabaseClient.storage.from('anexos-demandas').createSignedUrl(anexo.path, 60);
          if (!error) links.push(`<p><a href="${data.signedUrl}" target="_blank" rel="noopener">📄 ${anexo.nome}</a></p>`);
        }
        document.getElementById('modalContainer').innerHTML = `<div class="modal-backdrop" onclick="fecharModal()"><div class="modal-content" onclick="event.stopPropagation()"><div class="modal-header">Anexos</div><div class="modal-body">${links.join('') || 'Nenhum anexo disponível.'}<p style="font-size:11px">Links válidos por 60 segundos.</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="fecharModal()">Fechar</button></div></div></div>`;
        document.getElementById('modalContainer').classList.remove('hidden');
    };

    const opcoes = {
      diretorias: ['DSL', 'DM', 'DS', 'COE', 'ASS'],
      coordenacoes: ['CGSA', 'CGCF', 'CPRF', 'CGC', 'CMP', 'CSA', 'CST', 'CSCCAB', 'NPD', 'EXEC', 'ASS'],
      tipos: ['Projeto', 'Ação Estratégica'],
      prioridades: ['Baixa', 'Média', 'Alta', 'Crítica'],
      status: ['A iniciar', 'Em andamento', 'Concluído', 'Sobrestado', 'Em Análise SRL'],
      competencias_lista: [
        'Catálogo de Bens e Serviços', 'Banco de Preços de Bens e Serviços', 'Cadastro de Fornecedores', 
        'Registro de Preços de Bens e Serviços', 'Micro e Pequenas Empresas nas Compras Públicas', 
        'Gestão da Frota de Veículos', 'Gestão de Almoxarifados', 'Gestão de Bens Móveis', 
        'Contas de Consumo', 'Viagens', 'Serviços Terceirizados', 'Serviços Compartilhados do CAB', 
        'Serviço de Documentação e Protocolo', 'Apuração de Ilícito de Fornecedores', 
        'Sistemas de Suporte Logístico', 'Análise de Regularidade dos Processos de Compras', 
        'Compras Públicas Sustentáveis', 'Transversal'
      ],
      objetivos_estrategicos: [
        'Assegurar a participação de micro e pequenas empresas nas compras e contratações',
        'Fomentar a participação de agricultores familiares nas compras e contratações',
        'Assegurar transparência nas informações de compras e contratações',
        'Fomentar práticas sustentáveis nas compras e contratações',
        'Garantir economicidade e a qualidade dos gastos públicos de maneira eficiente e eficaz',
        'Otimizar o atendimento às demandas dos órgãos',
        'Promover satisfação dos usuários do sistema de compras',
        'Promover o acesso a bens e serviços de qualidade que atendam às necessidades da população de forma eficiente e eficaz',
        'Promover a celeridade e eficiência nas compras e contratações',
        'Padronizar processos de compras e contratações',
        'Fortalecer governança e transparência nos processos de compras e contratações',
        'Implementar gestão de riscos sistêmica',
        'Garantir a conformidade e integridade processual',
        'Integrar de maneira efetiva o planejamento e a execução orçamentária das compras e contratações',
        'Garantir a adoção de práticas consistentes de avaliação e melhoria contínua dos processos de compras e contratações',
        'Prover uma gestão e fiscalização contratual efetiva',
        'Assegurar a alocação suficiente de pessoas qualificadas para atender às demandas de compras e contratações',
        'Reduzir a rotatividade e promover a valorização dos agentes públicos e de contratação',
        'Promover uma cultura de inovação',
        'Aprimorar a qualificação dos agentes públicos e fornecedores participantes dos processos de compras e contratações',
        'Promover um ambiente organizacional positivo e colaborativo',
        'Estabelecer a Rede de Compras do Estado da Bahia',
        'Implementar sistema integrado de logística de suprimentos',
        'Prover a modernização dos processos de compras e contratações públicas por meio de soluções tecnológicas'
      ]
    };

    let demandas = [];
    let solicitacoes = [];
    let usuarios = [];
    let logsAudit = [];
    let idsDemandasCarregadas = new Set();
    
    // Variáveis da EAP
    let eapEtapas = [];
    let etapaAtualIndex = -1;
    let etapaEmEdicaoIdx = -1;
    let demandaSelecionadaEAP = null;

    // Variáveis temporárias anexos
    let anexosTemporarios = [];
    
    function normalizarDemanda(d) {
        if (typeof d.coordenacao === 'string') d.coordenacao = d.coordenacao ? [d.coordenacao] : [];
        d.diretoria ||= []; d.competencias ||= []; d.objetivos_estrategicos ||= [];
        d.atividades ||= []; d.anexos ||= [];
        d.titulo ||= d.codigo || 'Projeto sem título';
        d.tem_anexo = d.anexos.length > 0;
        return d;
    }

    const demandaParaLinha = d => {
        const { id, codigo, titulo, ...dados } = d;
        return { id, codigo, titulo, dados, atualizado_por: sessaoAtual?.user?.id || null };
    };
    const linhaParaDemanda = r => normalizarDemanda({ id: r.id, codigo: r.codigo, titulo: r.titulo, ...(r.dados || {}) });

    async function carregarBancoSupabase() {
        if (!supabaseClient || !sessaoAtual) return;
        const isMaster = getPerfil() === 'Master';
        const logQuery = isMaster 
        ? supabaseClient.from('logs_auditoria').select('*').order('created_at', { ascending: false }).limit(500)
        : Promise.resolve({ data: [], error: null });
     
        const solicitacoesQuery = isMaster
        ? supabaseClient.from('solicitacoes_acesso').select('*').eq('status', 'Pendente').order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null });

        const [demRes, usuRes, logRes, solRes] = await Promise.all([
          supabaseClient.from('demandas').select('*').order('created_at', { ascending: false }),
          supabaseClient.from('profiles').select('*').order('nome'),
          logQuery,
          solicitacoesQuery
        ]);
        const erro = demRes.error || usuRes.error || logRes.error || solRes.error;
        if (erro) throw erro;
        demandas = (demRes.data || []).map(linhaParaDemanda);
        idsDemandasCarregadas = new Set(demandas.map(d => String(d.id)));
        usuarios = usuRes.data || [];
        solicitacoes = solRes.data || [];
        logsAudit = (logRes.data || []).map(l => ({
          id: l.id, dataHora: new Date(l.created_at).toLocaleString('pt-BR'),
          usuario: l.usuario_email || 'Usuário', acao: l.acao, detalhe: l.detalhe
        }));
    }

    // Mantém o nome para compatibilidade com os fluxos existentes, mas o banco é o Supabase.
    async function salvarBancoLocal() {
        if (!supabaseClient || !sessaoAtual) return toast('Supabase não configurado ou sessão expirada. Nada foi salvo.');
        let demError = null;
        if (getPerfil() === 'Master') {
          const result = demandas.length ? await supabaseClient.from('demandas').upsert(demandas.map(demandaParaLinha)) : { error: null };
          demError = result.error;
        } else {
          const results = await Promise.all(demandas.filter(d => idsDemandasCarregadas.has(String(d.id))).map(d =>
            supabaseClient.from('demandas').update(demandaParaLinha(d)).eq('id', d.id)
          ));
          demError = results.find(r => r.error)?.error || null;
        }
        let userError = null;
        if (getPerfil() === 'Master') {
          const results = await Promise.all(usuarios.map(({ id, nome, email, cpf, perfil, status }) =>
            supabaseClient.from('profiles').update({ nome, email, cpf, perfil, status }).eq('id', id)
          ));
          userError = results.find(r => r.error)?.error || null;
        }
        const error = demError || userError;
        if (error) { console.error(error); toast(`Falha ao salvar: ${error.message}`); }
    }

    async function registrarLog(acao, detalhe) {
        const usuario = sessaoAtual?.user?.email || 'Usuário não identificado';
        const item = { dataHora: new Date().toLocaleString('pt-BR'), usuario, acao, detalhe };
        logsAudit.unshift(item);
        if (!supabaseClient || !sessaoAtual) return;
        const { error } = await supabaseClient.from('logs_auditoria').insert({
          user_id: sessaoAtual.user.id, usuario_email: usuario, acao, detalhe
        });
        if (error) console.error('Falha ao registrar auditoria:', error);
    }

    let demandaEditandoId = null;
    let chartsInstance = [];

    function hojeISO() { return new Date().toISOString().slice(0, 10); }
    
    function toast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 3000);
    }
    
    function formatarDataBR(dataIso) {
      if(!dataIso) return '-';
      return dataIso.split('-').reverse().join('/');
    }

    function formatarMesAno(dataIso) {
        if(!dataIso) return '-';
        const partes = dataIso.split('-');
        if(partes.length < 2) return dataIso;
        const ano = partes[0];
        const mes = parseInt(partes[1], 10);
        const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return `${meses[mes - 1]}/${ano}`;
    }

    function calcularSituacaoPrazo(d) {
        if (d.status === 'Concluído' || d.status === 'Em Análise SRL') return 'Concluído';
        if (d.status === 'Pausado' || d.status === 'Sobrestado') return 'Pausado';
        const hoje = new Date(hojeISO());
        const prazo = new Date(d.prazo_final || d.prazo);
        if (prazo < hoje) return 'Atrasada';
        if (prazo.getTime() === hoje.getTime()) return 'Vence Hoje';
        return 'No prazo';
    }

    function destruirGraficos() {
        if(chartsInstance && chartsInstance.length > 0) {
            chartsInstance.forEach(chart => {
                if(chart) chart.destroy();
            });
        }
        chartsInstance = [];
    }

    function navegar(page) {
      destruirGraficos();
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      document.getElementById(page + 'Page').classList.remove('hidden');
      
      const isMaster = getPerfil() === 'Master';

      document.querySelector('.nav-button[data-page="nova"]').style.display = isMaster ? 'flex' : 'none';
      document.querySelector('.nav-button[data-page="usuarios"]').style.display = isMaster ? 'flex' : 'none';
      document.querySelector('.nav-button[data-page="relatorios"]').style.display = isMaster ? 'flex' : 'none';

      document.querySelectorAll('.nav-button').forEach(b => b.classList.toggle('active', b.dataset.page === page));
      
      const titulos = {
          'dashboard': 'Painel de Controle',
          'nova': demandaEditandoId ? (isMaster ? 'Editar Projeto/Ação' : 'Atualizar Atividades do Projeto') : 'Cadastrar Projeto/Ação Estratégica',
          'gestao': '', 
          'eap': 'EAP - Estrutura Analítica do Projeto',
          'usuarios': 'Gestão de Usuários',
          'relatorios': 'Relatórios de Auditoria (Logs)'
      };
      
      const pageTitleEl = document.getElementById('pageTitle');
      if (page === 'gestao') {
          pageTitleEl.style.display = 'none';
      } else {
          pageTitleEl.style.display = 'block';
          pageTitleEl.textContent = titulos[page];
      }
      
      // Reseta estado das variáveis ao trocar de página
      usuarioEditandoId = null;
      anexosTemporarios = [];
      etapaEmEdicaoIdx = -1;

      if(page === 'dashboard') renderDashboard();
      if(page === 'nova') renderNovaDemanda();
      if(page === 'usuarios') renderUsuarios();
      if(page === 'gestao') renderGestao();
      if(page === 'relatorios') renderRelatorios();
      if(page === 'eap') renderEAP();
    }

    window.fecharModal = function() {
        document.getElementById('modalContainer').classList.add('hidden');
        document.getElementById('modalContainer').innerHTML = '';
    };

    window.exportarExcel = function() {
        if (!demandas || demandas.length === 0) {
            toast('Nenhum dado para exportar.');
            return;
        }

        let csvContent = "\uFEFF"; 
        
        const headers = [
            "Tipo", 
            "Projeto/Ação Estratégica", 
            "Competência Regimental", 
            "Plano Estratégico dos Processos de Logística de Suprimentos 2025 – 2027", 
            "Diretoria(as) Responsável(eis)", 
            "Coordenação(ões) Responsável(eis)", 
            "Parceiros Externos", 
            "Objetivo", 
            "Justificativa", 
            "Resultados Esperados", 
            "Planejamento", 
            "Valor Estimado (R$)", 
            "Nº Processo SEI", 
            "Status Projeto/Ação Estratégica", 
            "Data Início", 
            "Data Fim Estimada",
            "Atividades (Títulos)"
        ];
        csvContent += headers.join(";") + "\n";

        demandas.forEach(d => {
            const row = [
                d.tipo_demanda || '',
                d.titulo || '',
                Array.isArray(d.competencias) ? d.competencias.join(', ') : (d.competencias || ''),
                Array.isArray(d.objetivos_estrategicos) ? d.objetivos_estrategicos.join(', ') : (d.objetivos_estrategicos || ''),
                Array.isArray(d.diretoria) ? d.diretoria.join(', ') : (d.diretoria || ''),
                Array.isArray(d.coordenacao) ? d.coordenacao.join(', ') : (d.coordenacao || ''),
                d.parceiros_externos || '',
                d.objetivo || '',
                d.justificativa || '',
                d.resultados || '',
                d.planejamento || '',
                d.valor_estimado || '',
                d.processo_sei || '',
                d.status || '',
                formatarDataBR(d.data_abertura),
                formatarDataBR(d.prazo_final),
                d.atividades ? d.atividades.map(a => a.titulo).join(' | ') : ''
            ];

            const escapedRow = row.map(field => {
                let str = String(field).replace(/"/g, '""');
                str = str.replace(/\n/g, ' ');
                str = str.replace(/\r/g, '');
                return `"${str}"`;
            });

            csvContent += escapedRow.join(";") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "Projeto e Ações Estratégicas – SRL-SAEB.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast('Exportação concluída!');
    };

    function agruparEContarParaGraficos(ativas, concluidas) {
        const countCompetencia = { projetos: {}, acoes: {} };
        const countDiretoria = { projetos: {}, acoes: {} };
        const countStatus = { projetos: {}, acoes: {} };
        const countPlanejamento = { projetos: {}, acoes: {} };
        const countPlanoEstrategico = { projetos: {}, acoes: {} };

        opcoes.competencias_lista.forEach(c => { countCompetencia.projetos[c] = 0; countCompetencia.acoes[c] = 0; });
        opcoes.diretorias.forEach(d => { countDiretoria.projetos[d] = 0; countDiretoria.acoes[d] = 0; });
        opcoes.status.forEach(s => { countStatus.projetos[s] = 0; countStatus.acoes[s] = 0; });
        opcoes.objetivos_estrategicos.forEach(o => { countPlanoEstrategico.projetos[o] = 0; countPlanoEstrategico.acoes[o] = 0; });
        
        const planOpts = ['Planejamento de Compras', 'Planejamento de TIC', 'Sem Previsão'];
        planOpts.forEach(p => { countPlanejamento.projetos[p] = 0; countPlanejamento.acoes[p] = 0; });

        const todasDemandas = [...ativas, ...concluidas];

        todasDemandas.forEach(d => {
            const isProj = d.tipo_demanda === 'Projeto';
            const dictKey = isProj ? 'projetos' : 'acoes';

            if(d.competencias && d.competencias.length > 0) {
                d.competencias.forEach(c => { if(countCompetencia[dictKey][c] !== undefined) countCompetencia[dictKey][c]++; });
            }
            if(d.diretoria && d.diretoria.length > 0) {
                d.diretoria.forEach(dir => { if(countDiretoria[dictKey][dir] !== undefined) countDiretoria[dictKey][dir]++; });
            }
            if(d.objetivos_estrategicos && d.objetivos_estrategicos.length > 0) {
                d.objetivos_estrategicos.forEach(o => { if(countPlanoEstrategico[dictKey][o] !== undefined) countPlanoEstrategico[dictKey][o]++; });
            }
            if(d.status && countStatus[dictKey][d.status] !== undefined) {
                countStatus[dictKey][d.status]++;
            }
            const plan = (d.planejamento && d.planejamento !== 'Não se aplica') ? d.planejamento : 'Sem Previsão';
            if(countPlanejamento[dictKey][plan] !== undefined) {
                countPlanejamento[dictKey][plan]++;
            }
        });

        return { countCompetencia, countDiretoria, countStatus, countPlanejamento, countPlanoEstrategico, planOpts };
    }

    function renderDashboard() {
        const page = document.getElementById('dashboardPage');
        const ativas = demandas.filter(d => d.status !== 'Concluído' && d.status !== 'Em Análise SRL');
        const concluidas = demandas.filter(d => d.status === 'Concluído' || d.status === 'Em Análise SRL');
        
        const qtdProjetos = demandas.filter(d => d.tipo_demanda === 'Projeto').length;
        const qtdAcoes = demandas.filter(d => d.tipo_demanda === 'Ação Estratégica').length;
        const qtdPrioritarios = demandas.filter(d => d.prioridade === 'Alta' || d.prioridade === 'Crítica').length;
        
        const projetosEmAndamento = ativas.filter(d => d.tipo_demanda === 'Projeto').length;
        const projetosConcluidos = concluidas.filter(d => d.tipo_demanda === 'Projeto').length;
        const acoesEmAndamento = ativas.filter(d => d.tipo_demanda === 'Ação Estratégica').length;
        const acoesConcluidas = concluidas.filter(d => d.tipo_demanda === 'Ação Estratégica').length;

        page.innerHTML = `
            <div class="grid-cards" style="grid-template-columns: repeat(3, 1fr);">
                <div class="card" style="border-left: 4px solid var(--azul-800); display: flex; align-items: center; gap: 20px;">
                    <div style="font-size: 40px;">📁</div>
                    <div>
                        <div style="font-size:12px; color:var(--cinza-500); font-weight:bold; text-transform: uppercase;">QTDE. PROJETOS ESTRATÉGICOS</div>
                        <div class="metric-value">${qtdProjetos}</div>
                    </div>
                </div>
                <div class="card" style="border-left: 4px solid var(--verde); display: flex; align-items: center; gap: 20px;">
                    <div style="font-size: 40px;">🎯</div>
                    <div>
                        <div style="font-size:12px; color:var(--cinza-500); font-weight:bold; text-transform: uppercase;">QTDE. AÇÕES ESTRATÉGICAS</div>
                        <div class="metric-value" style="color:var(--verde)">${qtdAcoes}</div>
                    </div>
                </div>
                <div class="card" style="border-left: 4px solid var(--vermelho-bahia); display: flex; align-items: center; gap: 20px;">
                    <div style="font-size: 40px;">⭐</div>
                    <div>
                        <div style="font-size:12px; color:var(--cinza-500); font-weight:bold; text-transform: uppercase;">QTDE. PROJETOS/AÇÕES PRIORITÁRIOS</div>
                        <div class="metric-value" style="color:var(--vermelho-bahia)">${qtdPrioritarios}</div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 24px;">
                <h4 style="margin-top:0; color:var(--azul-900);">Projetos e Ações por Competência Regimental</h4>
                <div class="chart-container" style="height: 400px;"><canvas id="chartCompetencia"></canvas></div>
            </div>
            
            <div class="card" style="margin-bottom: 24px;">
                <h4 style="margin-top:0; color:var(--azul-900);">Projetos e Ações vinculados ao Plano Estratégico dos Processos de Logística de Suprimentos</h4>
                <div class="chart-container" style="height: 400px;"><canvas id="chartPlanoEstrategico"></canvas></div>
            </div>

            <div class="section-grid">
                <div class="card">
                    <h4 style="margin-top:0; color:var(--azul-900);">Projetos e Ações por Diretoria</h4>
                    <div class="chart-container"><canvas id="chartDiretoria"></canvas></div>
                </div>
                <div class="card">
                    <h4 style="margin-top:0; color:var(--azul-900);">Projetos e Ações por Status</h4>
                    <div class="chart-container"><canvas id="chartStatus"></canvas></div>
                </div>
            </div>
            
            <div class="section-grid">
                <div class="card">
                    <h4 style="margin-top:0; color:var(--azul-900);">Projetos e Ações por Planejamento</h4>
                    <div class="chart-container"><canvas id="chartPlanejamento"></canvas></div>
                </div>
                <div class="card" style="display:flex; flex-direction:column; justify-content:center;">
                    <h4 style="margin-top:0; color:var(--azul-900);">Resumo Executivo</h4>
                    <div style="color:var(--cinza-600); font-size:14px; line-height: 1.8;">
                        <p style="margin:0;">Total de Projetos: <strong style="color:var(--azul-900); font-size:16px;">${qtdProjetos}</strong></p>
                        <p style="margin:0;">Total de Ações Estratégicas: <strong style="color:var(--azul-900); font-size:16px;">${qtdAcoes}</strong></p>
                        <p style="margin:0;">Total Projetos Em Andamento: <strong style="color:var(--laranja); font-size:16px;">${projetosEmAndamento}</strong></p>
                        <p style="margin:0;">Total de Projetos Concluídos: <strong style="color:var(--verde); font-size:16px;">${projetosConcluidos}</strong></p>
                        <p style="margin:0;">Total de Ações Estratégicas Em Andamento: <strong style="color:var(--laranja); font-size:16px;">${acoesEmAndamento}</strong></p>
                        <p style="margin:0;">Total de Ações Estratégicas Concluídas: <strong style="color:var(--verde); font-size:16px;">${acoesConcluidas}</strong></p>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const { countCompetencia, countDiretoria, countStatus, countPlanejamento, countPlanoEstrategico, planOpts } = agruparEContarParaGraficos(ativas, concluidas);

            const chartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' } } };
            const horizontalChartOptions = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' } } };

            const colorProj = '#0056b3';
            const colorAcao = '#c8102e';

            // Diretoria
            const lDir = []; const dDirP = []; const dDirA = [];
            opcoes.diretorias.forEach(d => {
                if(countDiretoria.projetos[d] > 0 || countDiretoria.acoes[d] > 0) {
                    lDir.push(d); dDirP.push(countDiretoria.projetos[d]); dDirA.push(countDiretoria.acoes[d]);
                }
            });
            chartsInstance.push(new Chart(document.getElementById('chartDiretoria'), {
                type: 'bar',
                data: { labels: lDir.length ? lDir : ['Sem Dados'], datasets: [
                    { label: 'Projetos', data: lDir.length ? dDirP : [0], backgroundColor: colorProj, borderRadius: 4 },
                    { label: 'Ações', data: lDir.length ? dDirA : [0], backgroundColor: colorAcao, borderRadius: 4 }
                ]},
                options: chartOptions
            }));

            // Status
            const lStat = []; const dStatP = []; const dStatA = [];
            opcoes.status.forEach(s => {
                if(countStatus.projetos[s] > 0 || countStatus.acoes[s] > 0) {
                    lStat.push(s); dStatP.push(countStatus.projetos[s]); dStatA.push(countStatus.acoes[s]);
                }
            });
            chartsInstance.push(new Chart(document.getElementById('chartStatus'), {
                type: 'bar',
                data: { labels: lStat.length ? lStat : ['Sem Dados'], datasets: [
                    { label: 'Projetos', data: lStat.length ? dStatP : [0], backgroundColor: colorProj, borderRadius: 4 },
                    { label: 'Ações', data: lStat.length ? dStatA : [0], backgroundColor: colorAcao, borderRadius: 4 }
                ]},
                options: chartOptions
            }));

            // Planejamento
            const lPlan = []; const dPlanP = []; const dPlanA = [];
            planOpts.forEach(p => {
                if(countPlanejamento.projetos[p] > 0 || countPlanejamento.acoes[p] > 0) {
                    lPlan.push(p); dPlanP.push(countPlanejamento.projetos[p]); dPlanA.push(countPlanejamento.acoes[p]);
                }
            });
            chartsInstance.push(new Chart(document.getElementById('chartPlanejamento'), {
                type: 'bar',
                data: { labels: lPlan.length ? lPlan : ['Sem Dados'], datasets: [
                    { label: 'Projetos', data: lPlan.length ? dPlanP : [0], backgroundColor: colorProj, borderRadius: 4 },
                    { label: 'Ações', data: lPlan.length ? dPlanA : [0], backgroundColor: colorAcao, borderRadius: 4 }
                ]},
                options: chartOptions
            }));

            // Competência
            const lComp = []; const dCompP = []; const dCompA = [];
            opcoes.competencias_lista.forEach(c => {
                if(countCompetencia.projetos[c] > 0 || countCompetencia.acoes[c] > 0) {
                    let shortLabel = c;
                    if(c.length > 40) shortLabel = c.substring(0, 40) + '...';
                    lComp.push(shortLabel); dCompP.push(countCompetencia.projetos[c]); dCompA.push(countCompetencia.acoes[c]);
                }
            });
            chartsInstance.push(new Chart(document.getElementById('chartCompetencia'), {
                type: 'bar',
                data: { labels: lComp.length ? lComp : ['Sem Dados'], datasets: [
                    { label: 'Projetos', data: lComp.length ? dCompP : [0], backgroundColor: colorProj, borderRadius: 4 },
                    { label: 'Ações', data: lComp.length ? dCompA : [0], backgroundColor: colorAcao, borderRadius: 4 }
                ]},
                options: horizontalChartOptions
            }));
            
            // Plano Estrategico
            const lPlanoE = []; const dPlanoEP = []; const dPlanoEA = [];
            opcoes.objetivos_estrategicos.forEach(o => {
                if(countPlanoEstrategico.projetos[o] > 0 || countPlanoEstrategico.acoes[o] > 0) {
                    let shortLabel = o;
                    if(o.length > 50) shortLabel = o.substring(0, 50) + '...';
                    lPlanoE.push(shortLabel); dPlanoEP.push(countPlanoEstrategico.projetos[o]); dPlanoEA.push(countPlanoEstrategico.acoes[o]);
                }
            });
            chartsInstance.push(new Chart(document.getElementById('chartPlanoEstrategico'), {
                type: 'bar',
                data: { labels: lPlanoE.length ? lPlanoE : ['Sem Dados'], datasets: [
                    { label: 'Projetos', data: lPlanoE.length ? dPlanoEP : [0], backgroundColor: colorProj, borderRadius: 4 },
                    { label: 'Ações', data: lPlanoE.length ? dPlanoEA : [0], backgroundColor: colorAcao, borderRadius: 4 }
                ]},
                options: horizontalChartOptions
            }));

        }, 100);
    }

    window.verDemanda = function(id) {
        const d = demandas.find(x => String(x.id) === String(id));
        if(!d) return;
        
        let atividadesHtml = '<p>Nenhuma atividade vinculada.</p>';
        if (d.atividades && d.atividades.length > 0) {
            atividadesHtml = d.atividades.map((act, idx) => {
                const sitAct = calcularSituacaoPrazo({ status: act.status, prazo_final: act.prazo });
                const actRespFormat = Array.isArray(act.responsavel) ? act.responsavel.join(', ') : (act.responsavel || '-');
                
                let subHtml = '';
                let btnToggle = '';
                if(act.subAtividades && act.subAtividades.length > 0) {
                    const uid = `mod_sub_${d.id}_${idx}`;
                    subHtml = `<div id="${uid}" class="hidden" style="margin-top: 8px;">` + act.subAtividades.map(sub => {
                        const sitSub = calcularSituacaoPrazo({ status: sub.status, prazo_final: sub.prazo });
                        const subRespFormat = Array.isArray(sub.responsavel) ? sub.responsavel.join(', ') : (sub.responsavel || '-');
                        return `
                        <div style="margin-top: 8px; margin-left: 16px; padding-left: 10px; border-left: 2px solid var(--cinza-300);">
                            <strong>↳ ${sub.titulo}</strong> - Coordenação (oes): ${subRespFormat} | Prazo: ${formatarDataBR(sub.prazo)} | Status: ${sub.status}<br>
                            <small style="color: var(--cinza-600);">${sub.obs || 'Sem observações'}</small>
                        </div>
                        `;
                    }).join('') + `</div>`;

                    btnToggle = `<button class="small-btn" style="margin-top: 6px; font-size: 10px;" onclick="toggleSubVerMais('${uid}', this)">Ver Sub Atividades (▼)</button>`;
                }

                return `
                <div style="border-left: 3px solid var(--azul-accent); padding-left: 10px; margin-bottom: 12px; padding-bottom: 8px;">
                    <strong>${act.titulo}</strong> - Diretoria(as): ${actRespFormat} <br>
                    Prazo: ${formatarDataBR(act.prazo)} - Situação: ${sitAct} (${act.status})<br>
                    ${btnToggle}
                    ${subHtml}
                </div>
                `;
            }).join('');
        }

        const compHtml = (d.competencias && d.competencias.length > 0) 
            ? d.competencias.map(c => `<span class="tag tag-status" style="margin-bottom:4px;">${c}</span>`).join(' ') 
            : 'Nenhuma competência vinculada';
            
        const objEstHtml = (d.objetivos_estrategicos && d.objetivos_estrategicos.length > 0) 
            ? d.objetivos_estrategicos.map(o => `<div style="margin-bottom:4px; padding: 4px 8px; background: var(--azul-100); color: var(--azul-900); border-radius: 4px; font-size: 11px; line-height: 1.3;">• ${o}</div>`).join('') 
            : '-';

        const coordStr = Array.isArray(d.coordenacao) ? d.coordenacao.join(', ') : (d.coordenacao || '-');

        const modalHtml = `
          <div class="modal-backdrop" onclick="fecharModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
              <div class="modal-header" style="color: var(--vermelho-bahia); display: flex; justify-content: space-between; align-items: center;">
                 Projetos e Ações Estratégicas - SRL/SAEB
                 <button class="btn btn-secondary btn-sm" onclick="window.print()">Imprimir / PDF</button>
              </div>
              <div class="modal-body">
                <p><strong>Projeto/Ação Estratégica:</strong> ${d.titulo || '-'}</p>
                <p><strong>Tipo:</strong> ${d.tipo_demanda || '-'}</p>
                <p><strong>Competência Regimental:</strong><br> <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">${compHtml}</div></p>
                <p><strong>Plano Estratégico dos Processos de Logística de Suprimentos 2025 – 2027:</strong><br> <div style="margin-top:4px;">${objEstHtml}</div></p>
                <p><strong>Diretoria(s):</strong> ${Array.isArray(d.diretoria) ? d.diretoria.join(', ') : d.diretoria}</p>
                <p><strong>Coordenação(ões):</strong> ${coordStr}</p>
                
                <div style="background: var(--cinza-100); padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 3px solid var(--azul-800); margin-top: 12px;">
                    <p style="margin-top:0;"><strong>Objetivo:</strong><br> ${d.objetivo || '-'}</p>
                    <p><strong>Justificativa:</strong><br> ${d.justificativa || '-'}</p>
                    <p><strong>Resultados Esperados:</strong><br> ${d.resultados || '-'}</p>
                    <p><strong>Planejamento:</strong><br> ${d.planejamento || '-'}</p>
                    <p style="margin-bottom:0;"><strong>Valor Estimado:</strong><br> R$ ${d.valor_estimado || '0,00'}</p>
                </div>
                
                <p><strong>Status Projeto/Ação Estratégica:</strong> ${d.status || '-'}</p>
                <p><strong>Data Início:</strong> ${formatarDataBR(d.data_abertura)}</p>
                <p><strong>Data Fim Estimada:</strong> ${formatarDataBR(d.prazo_final)}</p>
                <p><strong>Anexo:</strong> ${d.tem_anexo ? 'Sim' : 'Não'}</p>
                <hr style="border: 0; border-top: 1px solid var(--cinza-200); margin: 16px 0;">
                <p><strong>Atividades Vinculadas:</strong></p>
                ${atividadesHtml}
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" onclick="fecharModal()">Fechar</button>
              </div>
            </div>
          </div>
        `;
        document.getElementById('modalContainer').innerHTML = modalHtml;
        document.getElementById('modalContainer').classList.remove('hidden');
    };

    // --- CADASTRO/EDIÇÃO ---
    let atividadeCount = 0;

    window.incluirAnexo = function() {
        const fileInput = document.getElementById('anexosUpload');
        if(fileInput.files.length > 0) {
            Array.from(fileInput.files).forEach(f => {
                anexosTemporarios.push({ nome: f.name, file: f });
            });
            fileInput.value = '';
            atualizarListaAnexos();
        }
    };

    window.removerAnexoTemporario = function(idx) {
        anexosTemporarios.splice(idx, 1);
        atualizarListaAnexos();
    };

    function atualizarListaAnexos() {
        const list = document.getElementById('listaAnexos');
        if(!list) return;
        if(anexosTemporarios.length === 0) {
            list.innerHTML = '<span style="font-size:11px; color:var(--cinza-500)">Nenhum documento incluído.</span>';
            return;
        }
        list.innerHTML = anexosTemporarios.map((n, i) => `
            <div style="display:flex; justify-content:space-between; padding:4px 8px; background:var(--cinza-100); border:1px solid var(--cinza-200); border-radius:4px; font-size:11px;">
                <span>📄 ${typeof n === 'string' ? n : n.nome}</span>
                <button type="button" class="small-btn danger" style="padding:0px 4px; border:none;" onclick="removerAnexoTemporario(${i})">X</button>
            </div>
        `).join('');
    }

    window.adicionarAtividadeForm = function(act = null) {
        const isMaster = getPerfil() === 'Master';
        const disabledAttr = isMaster ? '' : 'disabled';

        const container = document.getElementById('atividadesFormList');
        const id = `act_${atividadeCount++}`;
        const divWrapper = document.createElement('div');
        divWrapper.className = 'atividade-container-master';
        
        const tit = act ? act.titulo : '';
        const resp = act ? act.responsavel : [];
        const prz = act ? act.prazo : hojeISO();
        const sts = act ? act.status : 'A iniciar';

        const dirSelect = document.getElementById('dirSelect');
        let dirOptionsHtml = '';
        if(dirSelect) {
            Array.from(dirSelect.selectedOptions).forEach(opt => {
                const isSelected = Array.isArray(resp) ? resp.includes(opt.value) : (resp === opt.value);
                dirOptionsHtml += `<label><input type="checkbox" value="${opt.value}" class="act-resp-check" ${isSelected ? 'checked' : ''} ${disabledAttr} onchange="updateDropdownText('dd_${id}')"> ${opt.value}</label>`;
            });
        }
        if(!dirOptionsHtml) dirOptionsHtml = '<div style="font-size:11px; color:var(--cinza-500); padding: 5px;">Selecione a(s) Diretoria(s) acima</div>';

        divWrapper.innerHTML = `
            <div class="atividade-form-row" id="${id}">
                <div><label>Título da Atividade</label><input type="text" class="act-titulo" required placeholder="Ex: Elaborar minuta" value="${tit}" ${disabledAttr}></div>
                <div>
                    <label>Diretoria(s) Responsável(eis)</label>
                    <div id="dd_${id}" class="dropdown-check-list act-dropdown">
                        <span class="anchor" onclick="toggleDropdown(this)">Selecione...</span>
                        <div class="items act-resp-group">${dirOptionsHtml}</div>
                    </div>
                </div>
                <div><label>Prazo</label><input type="date" class="act-prazo" required value="${prz}" ${disabledAttr}></div>
                <div><label>Status</label><select class="act-status">${opcoes.status.map(s => `<option value="${s}" ${sts === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
                <div style="display:none;"><label>Observações</label><input type="text" class="act-obs" value=""></div>
                <div style="display:flex; gap: 5px; align-items:flex-end;">
                    ${isMaster ? `<button type="button" class="btn btn-secondary btn-sm" title="Adicionar Sub-Atividade" onclick="adicionarSubAtividadeForm('${id}')">+</button>` : ''}
                    ${isMaster ? `<button type="button" class="btn btn-danger btn-sm" title="Remover Atividade" onclick="this.closest('.atividade-container-master').remove()">X</button>` : ''}
                </div>
            </div>
            <div class="sub-atividades-container" id="sub_list_${id}"></div>
        `;
        container.appendChild(divWrapper);
        updateDropdownText(`dd_${id}`);

        if(act && act.subAtividades && act.subAtividades.length > 0) {
            act.subAtividades.forEach(sub => window.adicionarSubAtividadeForm(id, sub));
        }
    };

    window.adicionarSubAtividadeForm = function(actId, subAct = null) {
        const container = document.getElementById(`sub_list_${actId}`);
        if(!container) return;
        
        const isMaster = getPerfil() === 'Master';
        const disabledAttr = isMaster ? '' : 'disabled';
        const subId = `sub_${Math.random().toString(36).substr(2, 9)}`;

        const tit = subAct ? subAct.titulo : '';
        const resp = subAct ? subAct.responsavel : [];
        const prz = subAct ? subAct.prazo : hojeISO();
        const sts = subAct ? subAct.status : 'A iniciar';
        const obs = subAct ? subAct.obs : '';

        const coordSelect = document.getElementById('coordSelect');
        let coordOptionsHtml = '';
        if(coordSelect) {
            Array.from(coordSelect.selectedOptions).forEach(opt => {
                const isSelected = Array.isArray(resp) ? resp.includes(opt.value) : (resp === opt.value);
                coordOptionsHtml += `<label><input type="checkbox" value="${opt.value}" class="sub-resp-check" ${isSelected ? 'checked' : ''} ${disabledAttr} onchange="updateDropdownText('dd_${subId}')"> ${opt.value}</label>`;
            });
        }
        if(!coordOptionsHtml) coordOptionsHtml = '<div style="font-size:11px; color:var(--cinza-500); padding: 5px;">Selecione a(s) Coordenação(ões) acima</div>';

        const div = document.createElement('div');
        div.className = 'sub-atividade-form-row';
        div.id = subId;
        div.innerHTML = `
            <div><label>Título da Sub-Atividade</label><input type="text" class="sub-titulo" required placeholder="Título..." value="${tit}" ${disabledAttr}></div>
            <div>
                <label>Coordenação(ões) Responsável(eis)</label>
                <div id="dd_${subId}" class="dropdown-check-list sub-dropdown">
                    <span class="anchor" onclick="toggleDropdown(this)">Selecione...</span>
                    <div class="items sub-resp-group">${coordOptionsHtml}</div>
                </div>
            </div>
            <div><label>Prazo</label><input type="date" class="sub-prazo" required value="${prz}" ${disabledAttr}></div>
            <div><label>Status</label><select class="sub-status">${opcoes.status.map(s => `<option value="${s}" ${sts === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            <div><label>Observações</label><input type="text" class="sub-obs" placeholder="Detalhes..." value="${obs}" maxlength="2000" ${disabledAttr}></div>
            ${isMaster ? `<div><button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('${subId}').remove()">X</button></div>` : ''}
        `;
        container.appendChild(div);
        updateDropdownText(`dd_${subId}`);
    };

    function renderNovaDemanda() {
      const page = document.getElementById('novaPage');
      const isMaster = getPerfil() === 'Master';
      const disabledAttr = isMaster ? '' : 'disabled';

      atividadeCount = 0;
      anexosTemporarios = []; // Reinicia lista de arquivos locais

      let d = { titulo: '', objetivo: '', justificativa: '', resultados: '', valor_estimado: '', processo_sei: '', diretoria: [], coordenacao: [], tipo_demanda: 'Projeto', status: 'A iniciar', data_abertura: hojeISO(), prazo_final: hojeISO(), destaque: false, atividades: [], competencias: [], objetivos_estrategicos: [], responsavel: '', prioridade: 'Média', descricao: '', parceiros_externos: '', planejamento: '', anexos: [] };
      let isEdit = false;

      if(demandaEditandoId) {
          const enc = demandas.find(x => String(x.id) === String(demandaEditandoId));
          if(enc) {
              d = { ...enc };
              if(!Array.isArray(d.diretoria)) d.diretoria = [d.diretoria];
              if(!Array.isArray(d.coordenacao)) d.coordenacao = d.coordenacao ? [d.coordenacao] : [];
              if(!Array.isArray(d.competencias)) d.competencias = [];
              if(!Array.isArray(d.objetivos_estrategicos)) d.objetivos_estrategicos = [];
              if(!d.atividades) d.atividades = [];
              if(d.anexos) anexosTemporarios = [...d.anexos];
              isEdit = true;
          }
      }

      page.innerHTML = `
        <div class="card">
          <h3 class="section-title">${isEdit ? (isMaster ? 'Editar Projeto/Ação' : 'Atualizar Atividades do Projeto') : 'Cadastrar Projeto/Ação Estratégica'}</h3>
          <form id="demandaForm">
            <div class="form-grid">
              
              <div class="form-group full"><label>Nome Projeto/Ação Estratégica *</label><input name="titulo" required value="${d.titulo}" placeholder="Ex.: Ajuste no fluxo do Comprasnet" ${disabledAttr}/></div>
              
              <div class="form-group full"><label>Tipo de Projeto/Ação Estratégica *</label><select name="tipo_demanda" required ${disabledAttr}>${opcoes.tipos.map(t => `<option value="${t}" ${d.tipo_demanda === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>

              <div class="form-group full">
                <label>Competência Regimental* (Decreto Estadual nº 21.451/2022)</label>
                <select name="competencias" id="compSelect" multiple required ${disabledAttr}>
                  ${opcoes.competencias_lista.map(c => `<option value="${c}" ${d.competencias.includes(c) ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              
              <div class="form-group full">
                <label>Plano Estratégico dos Processos de Logística de Suprimentos 2025 – 2027</label>
                <select name="objetivos_estrategicos" id="objEstSelect" multiple ${disabledAttr}>
                  ${opcoes.objetivos_estrategicos.map(c => `<option value="${c}" ${d.objetivos_estrategicos.includes(c) ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>

              <div class="form-group"><label>Diretoria(as) Responsável(eis) *</label><select name="diretoria" id="dirSelect" multiple required ${disabledAttr}>${opcoes.diretorias.map(c => `<option value="${c}" ${d.diretoria.includes(c) ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
              
              <div class="form-group"><label>Coordenação(ões) Responsável(eis)</label><select name="coordenacao" id="coordSelect" multiple ${disabledAttr}>${opcoes.coordenacoes.map(c => `<option value="${c}" ${d.coordenacao.includes(c) ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
              
              <div class="form-group full"><label>Parceiros Externos</label><input name="parceiros_externos" value="${d.parceiros_externos || ''}" placeholder="informar se o Projeto/Ação tem algum parceiro fora SRL e/ou SAEB, ex: SGI/SAEB ou SEFAZ..." ${disabledAttr}/></div>
              
              <div class="form-group full"><label>Objetivo *</label><textarea name="objetivo" required placeholder="Qual o objetivo principal deste projeto?" ${disabledAttr}>${d.objetivo}</textarea></div>
              
              <div class="form-group full"><label>Justificativa *</label><textarea name="justificativa" required placeholder="Porque esse projeto/ação é necessário? Tem vinculo com alguma competência regimental da SRL?" ${disabledAttr}>${d.justificativa}</textarea></div>
              
              <div class="form-group full"><label>Resultados Esperados *</label><textarea name="resultados" required placeholder="O que se espera alcançar?" ${disabledAttr}>${d.resultados}</textarea></div>
              
              <div class="form-group"><label>Planejamento</label><select name="planejamento" ${disabledAttr}><option value="">Selecione...</option><option value="Planejamento de Compras" ${d.planejamento === 'Planejamento de Compras' ? 'selected' : ''}>Planejamento de Compras</option><option value="Planejamento de TIC" ${d.planejamento === 'Planejamento de TIC' ? 'selected' : ''}>Planejamento de TIC</option><option value="Não se aplica" ${d.planejamento === 'Não se aplica' ? 'selected' : ''}>Não se aplica</option></select></div>
              
              <div class="form-group"><label>Valor Estimado (R$)</label><input type="text" name="valor_estimado" oninput="this.value = maskCurrency(this.value)" value="${d.valor_estimado || ''}" placeholder="0,00" ${disabledAttr}/></div>

              <div class="form-group"><label>Nº Processo SEI de Referencia</label><input name="processo_sei" oninput="this.value = maskSEI(this.value)" value="${d.processo_sei || ''}" placeholder="000.0000.0000.0000000-00" ${disabledAttr}/></div>
              
              <div class="form-group"><label>Status Projeto/Ação Estratégica *</label><select name="status" required ${disabledAttr}>${opcoes.status.map(s => `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
              
              <div class="form-group"><label>Data Início</label><input type="date" name="data_abertura" value="${d.data_abertura}" ${disabledAttr}/></div>
              
              <div class="form-group"><label>Data Fim Estimada</label><input type="date" name="prazo_final" value="${d.prazo_final}" ${disabledAttr}/></div>

              <div class="form-group full">
                  <label>Anexar Documentos</label>
                  <div style="display:flex; gap:10px;">
                      <input type="file" multiple id="anexosUpload" ${disabledAttr} style="border: 1px solid var(--cinza-300); flex:1;" />
                      <button type="button" class="btn btn-secondary" onclick="incluirAnexo()" ${disabledAttr}>Incluir</button>
                  </div>
                  <div id="listaAnexos" style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;"></div>
              </div>
            </div>
            
            <div class="form-group full">
                <h4 style="margin-top: 20px; color: var(--azul-900); border-bottom: 1px solid var(--cinza-200); padding-bottom: 8px;">Atividades Vinculadas</h4>
                <div class="atividades-form-container">
                    <div id="atividadesFormList"></div>
                    ${isMaster ? `<button type="button" class="btn btn-secondary btn-sm" onclick="adicionarAtividadeForm()">+ Adicionar Atividade</button>` : ''}
                </div>
            </div>
            <div style="margin-top:20px; display:flex; gap:10px;">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Salvar Alterações' : 'Cadastrar Projeto/Ação Estratégica*'}</button>
                ${isEdit ? `<button type="button" class="btn btn-secondary" onclick="demandaEditandoId=null; navegar('gestao')">Cancelar</button>` : ''}
            </div>
          </form>
        </div>
      `;

      atualizarListaAnexos();

      const dirSelect = document.getElementById('dirSelect');
      const coordSelect = document.getElementById('coordSelect');

      if (dirSelect) {
          dirSelect.addEventListener('change', () => {
              const selectedDirs = Array.from(dirSelect.selectedOptions).map(opt => opt.value);
              document.querySelectorAll('.act-dropdown').forEach(dd => {
                  const group = dd.querySelector('.act-resp-group');
                  const currentVals = Array.from(group.querySelectorAll('.act-resp-check:checked')).map(cb => cb.value);
                  if(selectedDirs.length === 0) {
                      group.innerHTML = '<div style="font-size:11px; color:var(--cinza-500); padding: 5px;">Selecione a(s) Diretoria(s) acima</div>';
                  } else {
                      group.innerHTML = selectedDirs.map(d => `<label><input type="checkbox" value="${d}" class="act-resp-check" ${currentVals.includes(d) ? 'checked' : ''} ${disabledAttr} onchange="updateDropdownText('${dd.id}')"> ${d}</label>`).join('');
                  }
                  updateDropdownText(dd.id);
              });
          });
      }

      if (coordSelect) {
          coordSelect.addEventListener('change', () => {
              const selectedCoords = Array.from(coordSelect.selectedOptions).map(opt => opt.value);
              document.querySelectorAll('.sub-dropdown').forEach(dd => {
                  const group = dd.querySelector('.sub-resp-group');
                  const currentVals = Array.from(group.querySelectorAll('.sub-resp-check:checked')).map(cb => cb.value);
                  if(selectedCoords.length === 0) {
                      group.innerHTML = '<div style="font-size:11px; color:var(--cinza-500); padding: 5px;">Selecione a(s) Coordenação(ões) acima</div>';
                  } else {
                      group.innerHTML = selectedCoords.map(c => `<label><input type="checkbox" value="${c}" class="sub-resp-check" ${currentVals.includes(c) ? 'checked' : ''} ${disabledAttr} onchange="updateDropdownText('${dd.id}')"> ${c}</label>`).join('');
                  }
                  updateDropdownText(dd.id);
              });
          });
      }

      if(d.atividades.length > 0) d.atividades.forEach(act => adicionarAtividadeForm(act));

      document.getElementById('demandaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const listaAtv = [];
        document.querySelectorAll('.atividade-container-master').forEach(containerAtv => {
            const linha = containerAtv.querySelector('.atividade-form-row');
            if(!linha) return;
            
            const subAtvs = [];
            containerAtv.querySelectorAll('.sub-atividade-form-row').forEach(subLinha => {
                const subResps = Array.from(subLinha.querySelectorAll('.sub-resp-check:checked')).map(cb => cb.value);
                subAtvs.push({
                    titulo: subLinha.querySelector('.sub-titulo').value,
                    responsavel: subResps,
                    prazo: subLinha.querySelector('.sub-prazo').value,
                    status: subLinha.querySelector('.sub-status').value,
                    obs: subLinha.querySelector('.sub-obs').value
                });
            });

            const actResps = Array.from(linha.querySelectorAll('.act-resp-check:checked')).map(cb => cb.value);

            listaAtv.push({
                titulo: linha.querySelector('.act-titulo').value,
                responsavel: actResps,
                prazo: linha.querySelector('.act-prazo').value,
                status: linha.querySelector('.act-status').value,
                obs: linha.querySelector('.act-obs').value,
                subAtividades: subAtvs
            });
        });

        let isAllCompleted = false;
        if(listaAtv.length > 0 && listaAtv.every(a => a.status === 'Concluído' || a.status === 'Concluída')) {
            isAllCompleted = true;
        }

        if (!isMaster) {
            const index = demandas.findIndex(x => String(x.id) === String(demandaEditandoId));
            if(index > -1) {
                demandas[index].atividades = listaAtv;
                if(isAllCompleted) demandas[index].status = 'Em Análise SRL';

                registrarLog('Edição de Atividade', `Atividades atualizadas no Projeto/Ação: ${demandas[index].titulo}`);
                toast('Atividades atualizadas com sucesso!');
            }
        } else {
            const form = new FormData(e.target);
            const dados = Object.fromEntries(form.entries());
            
            const dirSelects = document.getElementById('dirSelect').selectedOptions;
            dados.diretoria = Array.from(dirSelects).map(opt => opt.value);
            
            const coordSelects = document.getElementById('coordSelect').selectedOptions;
            dados.coordenacao = Array.from(coordSelects).map(opt => opt.value);

            const compSelects = document.getElementById('compSelect').selectedOptions;
            dados.competencias = Array.from(compSelects).map(opt => opt.value);
            
            const objEstSelects = document.getElementById('objEstSelect').selectedOptions;
            dados.objetivos_estrategicos = Array.from(objEstSelects).map(opt => opt.value);

            dados.atividades = listaAtv;
            const idDemanda = isEdit ? demandaEditandoId : Date.now();
            const anexosExistentes = anexosTemporarios.filter(a => !a.file);
            const anexosNovos = await enviarAnexos(idDemanda, anexosTemporarios.filter(a => a.file));
            dados.anexos = [...anexosExistentes, ...anexosNovos];
            dados.tem_anexo = dados.anexos.length > 0;
            
            if(isAllCompleted) dados.status = 'Em Análise SRL';

            if(!isEdit) {
                dados.responsavel = '-';
                dados.prioridade = 'Média';
                dados.descricao = '-';
            } else {
                dados.responsavel = d.responsavel;
                dados.prioridade = d.prioridade;
                dados.descricao = d.descricao;
            }

            if (isEdit) {
                const index = demandas.findIndex(x => String(x.id) === String(demandaEditandoId));
                demandas[index] = { ...demandas[index], ...dados };
                registrarLog('Edição', `Projeto/Ação atualizado: ${dados.titulo}`);
                toast('Projeto/Ação atualizado com sucesso!');
            } else {
                const numAleatorio = Math.floor(1000 + Math.random()*9000);
                const primeiraDir = dados.diretoria.length > 0 ? dados.diretoria[0].split('/')[0] : 'PAE';
                demandas.unshift({ id: idDemanda, codigo: `${primeiraDir}-2026-${numAleatorio}`, destaque: false, ...dados });
                registrarLog('Criação', `Novo Projeto/Ação cadastrado: ${dados.titulo}`);
                toast('Projeto/Ação cadastrado com sucesso!');
            }
        }
        
        await salvarBancoLocal();
        demandaEditandoId = null;
        anexosTemporarios = [];
        navegar('gestao');
      });
    }

    async function enviarAnexos(demandaId, itens) {
      if (!itens.length) return [];
      if (!supabaseClient || !sessaoAtual) { toast('Configure o Supabase para enviar anexos.'); return []; }
      const enviados = [];
      for (const item of itens) {
        const nomeSeguro = item.nome.replace(/[^a-zA-Z0-9._-]/g, '_');
        const caminho = `${demandaId}/${crypto.randomUUID()}-${nomeSeguro}`;
        const { error } = await supabaseClient.storage.from('anexos-demandas').upload(caminho, item.file);
        if (error) { console.error(error); toast(`Falha no anexo ${item.nome}: ${error.message}`); continue; }
        enviados.push({ nome: item.nome, path: caminho, tipo: item.file.type, tamanho: item.file.size });
      }
      return enviados;
    }

    // --- NOVA ABA: EAP ---
    window.salvarAtividadesEAP = function(idx) {
        const container = document.getElementById(`atv_list_etapa_${idx}`);
        if(!container) return;
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        const selecionadas = Array.from(checkboxes).map(cb => decodeURIComponent(cb.value));
        eapEtapas[idx].atividadesVinculadas = selecionadas;
        toast('Atividades vinculadas salvas na etapa!');
        atualizarEAPEtapas();
    };

    window.setEtapaAtual = function(idx) {
        etapaAtualIndex = idx;
        atualizarEAPEtapas();
        toast('Etapa atual (Estamos Aqui) atualizada.');
    };

    function atualizarEAPEtapas() {
        const list = document.getElementById('eapEtapasList');
        if(eapEtapas.length === 0) { list.innerHTML = '<small style="color:var(--cinza-500)">Nenhuma etapa cadastrada.</small>'; return; }
        
        let html = '';
        eapEtapas.forEach((et, i) => {
            let statusBadge = '';
            let tagColor = '';
            let borderStyle = 'border-left: 4px solid #ccc;';

            if (etapaAtualIndex === -1) {
                statusBadge = 'A iniciar';
                tagColor = 'tag-media';
            } else if (i < etapaAtualIndex) {
                statusBadge = 'Concluído';
                tagColor = 'tag-concluida';
                borderStyle = 'border-left: 4px solid var(--verde);';
            } else if (i === etapaAtualIndex) {
                statusBadge = 'Estamos Aqui';
                tagColor = 'tag-status';
                borderStyle = 'border-left: 4px solid var(--azul-900);';
            } else {
                statusBadge = 'A iniciar';
                tagColor = 'tag-media';
            }

            let atividadesSalvasHtml = '<small style="color:var(--cinza-500); display: block; margin-top: 4px;">Nenhuma atividade confirmada nesta etapa.</small>';
            if(et.atividadesVinculadas && et.atividadesVinculadas.length > 0) {
                atividadesSalvasHtml = '<ul style="margin: 4px 0 0 20px; font-size: 12px; color: var(--cinza-700);">' + 
                    et.atividadesVinculadas.map(a => `<li>${a}</li>`).join('') + 
                    '</ul>';
            }

            html += `
            <div style="padding:10px; background:white; border:1px solid var(--cinza-200); margin-bottom:12px; border-radius:6px; ${borderStyle}">
                <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                    <div>
                        <strong style="color:var(--azul-900); font-size: 14px;">Etapa ${i+1}: ${et.nome}</strong>
                        <span class="tag ${tagColor}" style="margin-left: 6px;">${statusBadge}</span>
                        <br>
                        <small style="color:var(--cinza-600); display:block; margin-top:4px;">
                            <strong>Prazo:</strong> ${formatarDataBR(et.prazo)}
                        </small>
                    </div>
                    <div style="display:flex; gap: 8px; align-items:flex-start;">
                        <label style="font-size:11px; cursor:pointer; background:var(--cinza-100); padding:4px 8px; border-radius:4px; border:1px solid var(--cinza-300);">
                            <input type="radio" name="eap_status" ${i === etapaAtualIndex ? 'checked' : ''} onchange="setEtapaAtual(${i})" /> 📍 Estamos Aqui
                        </label>
                        <button class="btn btn-secondary btn-sm" style="padding:4px 8px; height: 26px;" onclick="editarEAPEtapa(${i})">✏️</button>
                        <button class="btn btn-danger btn-sm" style="padding:4px 8px; height: 26px;" onclick="removerEAPEtapa(${i})">X</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 12px; border-top: 1px dashed var(--cinza-200); padding-top: 8px;">
                    <strong style="font-size: 12px; color: var(--azul-800);">Atividades Vinculadas a esta Etapa:</strong>
                    ${atividadesSalvasHtml}
                </div>
            </div>
            `;
        });
        list.innerHTML = html;
    }

    window.addEAPEtapa = function() {
        const nome = document.getElementById('novaEtapaNome').value;
        const status = document.getElementById('novaEtapaStatus').value;
        const prazo = document.getElementById('novaEtapaPrazo').value;
        
        const checks = document.querySelectorAll('.nova-etapa-atv-check:checked');
        const atividadesVinculadas = Array.from(checks).map(cb => decodeURIComponent(cb.value));

        if(!nome || !prazo) { toast('Preencha nome e prazo da etapa.'); return; }
        
        if (etapaEmEdicaoIdx > -1) {
            eapEtapas[etapaEmEdicaoIdx] = {
                ...eapEtapas[etapaEmEdicaoIdx],
                nome, status, prazo, atividadesVinculadas
            };
            etapaEmEdicaoIdx = -1;
            document.getElementById('btnNovaEtapa').innerText = '+ Adicionar';
            toast('Etapa editada com sucesso!');
        } else {
            eapEtapas.push({ 
                nome, 
                status,
                prazo, 
                atividadesVinculadas 
            });
            toast('Etapa criada com sucesso!');
        }

        document.getElementById('novaEtapaNome').value = '';
        document.getElementById('novaEtapaPrazo').value = '';
        document.getElementById('novaEtapaStatus').value = 'A iniciar';
        
        document.querySelectorAll('.nova-etapa-atv-check').forEach(cb => cb.checked = false);
        updateDropdownText('dd_nova_etapa_atv');
        
        atualizarEAPEtapas();
    };

    window.editarEAPEtapa = function(idx) {
        etapaEmEdicaoIdx = idx;
        const et = eapEtapas[idx];
        document.getElementById('novaEtapaNome').value = et.nome;
        document.getElementById('novaEtapaStatus').value = et.status || 'A iniciar';
        document.getElementById('novaEtapaPrazo').value = et.prazo;
        
        // Restore checkboxes
        document.querySelectorAll('.nova-etapa-atv-check').forEach(cb => {
            if (et.atividadesVinculadas && et.atividadesVinculadas.includes(decodeURIComponent(cb.value))) {
                cb.checked = true;
            } else {
                cb.checked = false;
            }
        });
        updateDropdownText('dd_nova_etapa_atv');

        document.getElementById('btnNovaEtapa').innerText = '💾 Salvar Edição';
        
        // Scroll to form
        document.getElementById('novaEtapaNome').scrollIntoView({behavior: 'smooth', block: 'center'});
    };

    window.removerEAPEtapa = function(idx) {
        eapEtapas.splice(idx, 1);
        if(etapaAtualIndex === idx) etapaAtualIndex = -1;
        else if (etapaAtualIndex > idx) etapaAtualIndex--;
        atualizarEAPEtapas();
    }

    window.salvarEAP = function() {
        const id = document.getElementById('eapSelect').value;
        const d = demandas.find(x => String(x.id) === String(id));
        if(!d) return;

        d.eap = {
            responsavel: document.getElementById('eapResp').value,
            pontos_atencao: document.getElementById('eapPontos').value,
            etapas: eapEtapas,
            etapaAtual: etapaAtualIndex
        };
        
        salvarBancoLocal();
        toast('Ficha EAP salva com sucesso!');
    };

    function renderEAP() {
        const page = document.getElementById('eapPage');
        let opts = '<option value="">Selecione um Projeto/Ação...</option>';
        demandas.forEach(d => { opts += `<option value="${d.id}">${d.titulo}</option>`; });

        page.innerHTML = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                    <h3 class="section-title" style="margin:0;">Estrutura Analítica do Projeto (EAP)</h3>
                </div>
                
                <div class="form-group"><label>Selecione o Projeto/Ação</label>
                <select id="eapSelect">${opts}</select></div>
                
                <div id="eapFormContainer" class="hidden">
                    <div class="form-grid">
                        <div class="form-group full"><label>Projeto/Ação Estratégica</label><input type="text" id="eapProjNome" disabled /></div>
                        <div class="form-group full"><label>Objetivo</label><textarea id="eapObj" disabled></textarea></div>
                        <div class="form-group full"><label>Justificativa</label><textarea id="eapJust" disabled></textarea></div>
                        <div class="form-group full"><label>Resultados Esperados</label><textarea id="eapRes" disabled></textarea></div>
                        <div class="form-group full"><label>Valor Estimado</label><input type="text" id="eapValor" disabled /></div>
                        <div class="form-group full"><label>Pontos de Atenção</label><textarea id="eapPontos" placeholder="Descreva os pontos de atenção e/ou deliberações..."></textarea></div>
                        <div class="form-group full"><label>Responsáveis</label><textarea id="eapResp" placeholder="Ex: Rafael Braga Rios\nDilmara Ramalho Pinto"></textarea></div>
                    </div>
                    
                    <div class="form-group full">
                        <h4 style="margin-top: 20px; color: var(--azul-900); border-bottom: 1px solid var(--cinza-200); padding-bottom: 8px;">Cadastro de Etapas</h4>
                        
                        <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 2fr auto; gap:10px; margin-bottom: 16px; align-items:end;">
                            <div><label style="font-size:11px;">Etapas da Execução</label><input type="text" id="novaEtapaNome" placeholder="Nome da Etapa" /></div>
                            <div><label style="font-size:11px;">Status</label>
                                 <select id="novaEtapaStatus">
                                    <option value="A iniciar">A iniciar</option>
                                    <option value="Em andamento">Em andamento</option>
                                    <option value="Concluído">Concluído</option>
                                 </select>
                            </div>
                            <div><label style="font-size:11px;">Prazo</label><input type="date" id="novaEtapaPrazo" /></div>
                            <div>
                                <label style="font-size:11px;">Atividade Vinculada</label>
                                <div id="dd_nova_etapa_atv" class="dropdown-check-list w-full" style="width:100%;">
                                    <span class="anchor" onclick="toggleDropdown(this)" style="padding: 8px; font-size:12px;">Selecione...</span>
                                    <div class="items" id="novaEtapaAtividadesList" style="font-size:12px; background:white; z-index:100; max-height:150px; overflow-y:auto;">
                                        <div style="padding:5px; color:var(--cinza-500);">Selecione um projeto</div>
                                    </div>
                                </div>
                            </div>
                            <button id="btnNovaEtapa" class="btn btn-secondary btn-sm" style="height:38px;" onclick="addEAPEtapa()">+ Adicionar</button>
                        </div>
                        
                        <div id="eapEtapasList" style="margin-bottom:10px; margin-top: 10px;"></div>
                    </div>

                    <div style="margin-top:20px; display:flex; gap:10px;">
                        <button class="btn btn-primary" onclick="salvarEAP()">Salvar</button>
                        <button class="btn btn-secondary" onclick="gerarEAP()">Gerar EAP</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('eapSelect').addEventListener('change', function() {
            const id = this.value;
            const container = document.getElementById('eapFormContainer');
            if(!id) { container.classList.add('hidden'); return; }
            const d = demandas.find(x => String(x.id) === String(id));
            if(d) {
                demandaSelecionadaEAP = d;
                document.getElementById('eapProjNome').value = d.titulo || '';
                document.getElementById('eapObj').value = d.objetivo || '';
                document.getElementById('eapJust').value = d.justificativa || '';
                document.getElementById('eapRes').value = d.resultados || '';
                document.getElementById('eapValor').value = d.valor_estimado ? 'R$ ' + d.valor_estimado : '';
                
                etapaEmEdicaoIdx = -1;

                if (d.eap) {
                    document.getElementById('eapResp').value = d.eap.responsavel || '';
                    document.getElementById('eapPontos').value = d.eap.pontos_atencao || '';
                    eapEtapas = d.eap.etapas || [];
                    etapaAtualIndex = d.eap.etapaAtual !== undefined ? d.eap.etapaAtual : -1;
                } else {
                    document.getElementById('eapResp').value = '';
                    document.getElementById('eapPontos').value = '';
                    eapEtapas = [];
                    etapaAtualIndex = -1;
                    
                    // Geração automática caso não exista EAP salva e existam atividades
                    if (d.atividades && d.atividades.length > 0) {
                        let autoEtapas = d.atividades.map(a => ({
                            nome: a.titulo,
                            status: a.status || 'A iniciar',
                            prazo: a.prazo || hojeISO(),
                            atividadesVinculadas: [a.titulo]
                        }));
                        autoEtapas.sort((a,b) => new Date(a.prazo) - new Date(b.prazo));
                        eapEtapas = autoEtapas;
                    }
                }

                // Preencher o checklist de Atividades Vinculadas
                const atvList = document.getElementById('novaEtapaAtividadesList');
                if(d.atividades && d.atividades.length > 0) {
                    atvList.innerHTML = d.atividades.map(a => {
                        const safeValue = encodeURIComponent(a.titulo);
                        return `<label><input type="checkbox" value="${safeValue}" class="nova-etapa-atv-check" onchange="updateDropdownText('dd_nova_etapa_atv')"> ${a.titulo}</label>`;
                    }).join('');
                } else {
                    atvList.innerHTML = '<div style="padding:5px; color:var(--cinza-500);">Nenhuma atividade no projeto</div>';
                }
                updateDropdownText('dd_nova_etapa_atv');

                atualizarEAPEtapas();
                container.classList.remove('hidden');
            }
        });
    }

    window.gerarEAP = async function() {
        const id = document.getElementById('eapSelect').value;
        const d = demandas.find(x => String(x.id) === String(id));
        if(!d) return;

        // Salvar antes de gerar
        salvarEAP();

        const resp = document.getElementById('eapResp').value.replace(/\n/g, '<br>');
        const pontos = document.getElementById('eapPontos').value.replace(/\n/g, '<br>');

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = '-9999px';
        div.style.top = '0';
        div.style.width = '1123px';
        div.style.height = '794px';
        div.style.backgroundColor = '#f8fafc';
        div.style.padding = '40px';
        div.style.boxSizing = 'border-box';
        div.style.fontFamily = 'Arial, sans-serif';
        div.style.color = '#333';
        
        let etapasHtml = '';
        if(eapEtapas.length === 0) {
            etapasHtml = '<p style="color:#999; font-size:12px;">Nenhuma etapa cadastrada.</p>';
        } else {
            eapEtapas.forEach((et, i) => {
                let statusLabel = '';
                let icon = '';
                let borderColor = '#cbd5e1'; // cinza
                
                if (etapaAtualIndex === -1) {
                    statusLabel = 'A iniciar'; icon = '⏳'; borderColor = '#cbd5e1';
                } else if (i < etapaAtualIndex) {
                    statusLabel = 'Concluído'; icon = '✅'; borderColor = '#15803d'; // verde
                } else if (i === etapaAtualIndex) {
                    statusLabel = 'Estamos Aqui'; icon = '📍'; borderColor = '#0056b3'; // azul
                } else {
                    statusLabel = 'A iniciar'; icon = '⏳'; borderColor = '#cbd5e1'; // cinza
                }
                
                let actsHtml = (et.atividadesVinculadas && et.atividadesVinculadas.length > 0) 
                    ? `<ul style="margin: 4px 0 0 15px; padding:0; font-size: 11px; color:#555;">${et.atividadesVinculadas.map(a => `<li>${a}</li>`).join('')}</ul>`
                    : '<div style="font-size:10px; color:#999;">Nenhuma atividade vinculada</div>';

                etapasHtml += `
                <div style="margin-bottom: 20px; padding-left: 25px; border-left: 4px solid ${borderColor}; position: relative; background: #ffffff; padding: 12px 12px 12px 25px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="position: absolute; left: -14px; top: 12px; background: #f8fafc; font-size: 18px; padding: 2px 0;">${icon}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color: #0056b3; font-size: 15px;">${et.nome}</strong>
                        <span style="font-size: 10px; background: #e2e8f0; color:#333; font-weight:bold; padding: 3px 8px; border-radius: 12px;">${statusLabel}</span>
                    </div>
                    <div style="font-size: 11px; margin-top: 6px; color:#444;">
                        <strong>Prazo:</strong> ${formatarMesAno(et.prazo)}
                    </div>
                    <div style="margin-top: 8px;">
                        ${actsHtml}
                    </div>
                </div>
                `;
            });
        }

        div.innerHTML = `
            <div style="background: linear-gradient(90deg, #0056b3 0%, #003d82 100%); color: white; padding: 20px 30px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div>
                    <h1 style="margin: 0; font-size: 20px; text-transform:uppercase; letter-spacing: 1px;">Estado da Bahia | SECRETARIA DA ADMINISTRAÇÃO</h1>
                    <h2 style="margin: 5px 0 0 0; font-size: 15px; font-weight: normal; color:#e8f4ff;">EAP Projetos/Ações Estratégicas | SRL/SAEB</h2>
                </div>
                <div style="text-align: right; max-width: 400px;">
                    <h3 style="margin: 0; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.titulo}">${d.titulo}</h3>
                </div>
            </div>
            
            <div style="display: flex; gap: 20px; height: calc(100% - 100px);">
                <!-- COLUNA ESQUERDA: INFOS -->
                <div style="flex: 1.2; display:flex; flex-direction:column; gap:16px; overflow:hidden;">
                    <div style="background: #ffffff; padding: 16px; border-radius: 8px; border-left: 4px solid #0056b3; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <h4 style="margin: 0 0 4px 0; color: #0056b3; font-size: 14px;">Objetivo</h4>
                        <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #333;">${d.objetivo || '-'}</p>
                    </div>
                    <div style="background: #ffffff; padding: 16px; border-radius: 8px; border-left: 4px solid #0056b3; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <h4 style="margin: 0 0 4px 0; color: #0056b3; font-size: 14px;">Justificativa</h4>
                        <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #333;">${d.justificativa || '-'}</p>
                    </div>
                    <div style="background: #ffffff; padding: 16px; border-radius: 8px; border-left: 4px solid #0056b3; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <h4 style="margin: 0 0 4px 0; color: #0056b3; font-size: 14px;">Resultados Esperados</h4>
                        <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #333;">${d.resultados || '-'}</p>
                    </div>
                    <div style="display: flex; gap:16px;">
                        <div style="flex:1; background: #ffffff; padding: 16px; border-radius: 8px; border-left: 4px solid #0056b3; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <h4 style="margin: 0 0 4px 0; color: #0056b3; font-size: 14px;">Valor Estimado Global</h4>
                            <p style="margin: 0; font-size: 14px; font-weight:bold; color: #15803d;">R$ ${d.valor_estimado || '0,00'}</p>
                        </div>
                        <div style="flex:1; background: #ffffff; padding: 16px; border-radius: 8px; border-left: 4px solid #0056b3; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <h4 style="margin: 0 0 4px 0; color: #0056b3; font-size: 14px;">Responsáveis</h4>
                            <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #333;">${resp || '-'}</p>
                        </div>
                    </div>
                    <div style="background: #fff3cd; padding: 16px; border-radius: 8px; border-left: 4px solid #ffc107; box-shadow: 0 2px 4px rgba(0,0,0,0.05); flex:1;">
                        <h4 style="margin: 0 0 4px 0; color: #856404; font-size: 14px;">⚠️ Pontos de Atenção</h4>
                        <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #856404;">${pontos || '-'}</p>
                    </div>
                </div>
                
                <!-- COLUNA DIREITA: ETAPAS -->
                <div style="flex: 1.5; padding: 10px 20px; overflow: hidden; display:flex; flex-direction:column;">
                    <h3 style="margin: 0 0 20px 0; color: #0056b3; font-size: 18px; border-bottom: 2px solid #0056b3; padding-bottom: 8px; display:inline-block;">Etapas de Execução</h3>
                    <div style="flex:1; overflow: hidden;">
                        ${etapasHtml}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(div);
        
        toast('Gerando PDF, aguarde...');
        
        try {
            const canvas = await html2canvas(div, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('landscape', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`EAP_${d.codigo || d.id}.pdf`);
            toast("PDF gerado com sucesso!");
        } catch (error) {
            console.error(error);
            toast("Erro ao gerar PDF.");
        } finally {
            document.body.removeChild(div);
        }
    }

    // --- GESTÃO DE DEMANDAS ---
    window.editarDemanda = function(id) { 
        demandaEditandoId = String(id); 
        navegar('nova'); 
    };
    
    window.concluirDemanda = function(id) {
        if(getPerfil() !== 'Master') { toast('Acesso restrito!'); return; }
        const index = demandas.findIndex(x => String(x.id) === String(id));
        if(index > -1) {
            demandas[index].status = 'Concluído';
            registrarLog('Conclusão', `Projeto/Ação Concluído: ${demandas[index].titulo}`);
            salvarBancoLocal();
            toast('Demanda concluída com sucesso!');
            if(document.getElementById('gestaoContainer')) {
                document.getElementById('gestaoContainer').innerHTML = window._renderCardsContent();
            }
            if(document.getElementById('dashboardPage').classList.contains('hidden') === false) renderDashboard();
        }
    };

    window.excluirDemanda = function(id) {
        if(getPerfil() !== 'Master') { toast('Acesso restrito!'); return; }
        const d = demandas.find(x => String(x.id) === String(id));
        if(!d) return;
        const modalHtml = `
          <div class="modal-backdrop" onclick="fecharModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
              <div class="modal-header" style="color: var(--vermelho)">Confirmar Exclusão</div>
              <div class="modal-body"><p>Você tem certeza que deseja excluir o projeto/ação <strong>${d.titulo}</strong>?</p></div>
              <div class="modal-footer">
                <button class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button class="btn btn-danger" onclick="confirmarExclusao('${id}')">Sim, Excluir</button>
              </div>
            </div>
          </div>
        `;
        document.getElementById('modalContainer').innerHTML = modalHtml;
        document.getElementById('modalContainer').classList.remove('hidden');
    };

    window.confirmarExclusao = async function(id) {
        const d = demandas.find(x => String(x.id) === String(id));
        if(d) {
            demandas = demandas.filter(x => String(x.id) !== String(id));
            if (supabaseClient) {
              const { error } = await supabaseClient.from('demandas').delete().eq('id', id);
              if (error) { toast(`Falha ao excluir: ${error.message}`); return; }
            }
            registrarLog('Exclusão', `Projeto/Ação Excluído: ${d.titulo}`);
            salvarBancoLocal();
            toast('Demanda excluída com sucesso!');
        }
        fecharModal();
        if(document.getElementById('gestaoContainer')) {
            document.getElementById('gestaoContainer').innerHTML = window._renderCardsContent();
        }
        if(document.getElementById('dashboardPage').classList.contains('hidden') === false) renderDashboard();
    };

    window.toggleDestaque = function(id) {
        if(getPerfil() !== 'Master') { toast('Acesso restrito!'); return; }
        const d = demandas.find(x => String(x.id) === String(id));
        if(d) {
            d.destaque = !d.destaque;
            registrarLog('Destaque', `Alteração de Destaque (${d.destaque}) no Projeto/Ação: ${d.titulo}`);
            salvarBancoLocal();
            toast(d.destaque ? 'Demanda marcada como destaque!' : 'Destaque removido.');
            if(document.getElementById('gestaoContainer')) {
                document.getElementById('gestaoContainer').innerHTML = window._renderCardsContent();
            }
        }
    };

    window.toggleVerMais = function(id, btn) {
        const panel = document.getElementById(`atividades-painel-${id}`);
        if(panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
            if(btn) btn.innerHTML = btn.innerHTML.replace('▼', '▲');
        } else {
            panel.style.display = 'none';
            if(btn) btn.innerHTML = btn.innerHTML.replace('▲', '▼');
        }
    };

    window.toggleSubVerMais = function(uid, btn) {
        const p = document.getElementById(uid);
        if (p.classList.contains('hidden')) {
            p.classList.remove('hidden');
            if(btn) btn.innerText = 'Ocultar Sub Atividades (▲)';
        } else {
            p.classList.add('hidden');
            if(btn) btn.innerText = 'Ver Sub Atividades (▼)';
        }
    };

    function renderGestao() {
      const page = document.getElementById('gestaoPage');
      const todasCompetencias = opcoes.competencias_lista;
      const todosPlanosEstrategicos = opcoes.objetivos_estrategicos;
      const isMaster = getPerfil() === 'Master';
      
      window._renderCardsContent = () => {
         const buscaFilter = document.getElementById('fBusca')?.value.toLowerCase() || '';
         const dirFilter = document.getElementById('filterDir')?.value || '';
         const coordFilter = document.getElementById('fCoordStr')?.value || '';
         const statusFilter = document.getElementById('fStatus')?.value || '';
         const situacaoFilter = document.getElementById('fSituacao')?.value || '';
         const destaqueFilter = document.getElementById('fDestaque')?.value || '';
         const compFilter = document.getElementById('fCompetencia')?.value || '';
         const planoEFilter = document.getElementById('fPlanoEst')?.value || '';

         let filtered = demandas.filter(d => {
             if (destaqueFilter === 'true' && !d.destaque) return false;
             if (dirFilter && !(Array.isArray(d.diretoria) ? d.diretoria.includes(dirFilter) : d.diretoria === dirFilter)) return false;
             if (coordFilter && !(Array.isArray(d.coordenacao) ? d.coordenacao.includes(coordFilter) : d.coordenacao === coordFilter)) return false;
             if (statusFilter && d.status !== statusFilter) return false;
             if (situacaoFilter && calcularSituacaoPrazo(d) !== situacaoFilter) return false;
             if (compFilter && !(d.competencias && d.competencias.includes(compFilter))) return false;
             if (planoEFilter && !(d.objetivos_estrategicos && d.objetivos_estrategicos.includes(planoEFilter))) return false;
             if (buscaFilter) {
                 const text = `${d.titulo} ${d.responsavel || ''}`.toLowerCase();
                 if (!text.includes(buscaFilter)) return false;
             }
             return true;
         });

         if (filtered.length === 0) return `<div style="text-align:center; padding: 40px; color: var(--cinza-500);">Nenhum Projeto/Ação encontrado.</div>`;

         return filtered.map(d => {
            const situacaoReal = calcularSituacaoPrazo(d);
            let sitClass = 'tag-status';
            if(situacaoReal === 'Concluída') sitClass = 'tag-concluida';
            else if (situacaoReal === 'Atrasada') sitClass = 'tag-atrasada';
            else if (situacaoReal === 'Pausado') sitClass = 'tag-media';

            const statusClass = (d.status === 'Concluído' || d.status === 'Em Análise SRL') ? 'tag-concluida' : 'tag-status';
            const disableConcluir = (d.status === 'Concluído' || d.status === 'Em Análise SRL') ? 'opacity: 0.5; cursor: not-allowed;' : '';
            
            const dirStr = Array.isArray(d.diretoria) ? d.diretoria.join(', ') : d.diretoria;
            const coordStr = Array.isArray(d.coordenacao) ? d.coordenacao.join(', ') : (d.coordenacao || '-');
            const qtdeAtividades = d.atividades ? d.atividades.length : 0;

            let atividadesHtml = '';
            if (qtdeAtividades > 0) {
                const acts = d.atividades.map((act, idx) => {
                    const sitAct = calcularSituacaoPrazo({ status: act.status, prazo_final: act.prazo });
                    let sitActClass = 'tag-status';
                    if(sitAct === 'Concluído' || sitAct === 'Concluída') sitActClass = 'tag-concluida';
                    else if (sitAct === 'Atrasada') sitActClass = 'tag-atrasada';
                    else if (sitAct === 'Pausado') sitActClass = 'tag-media';
                    
                    const actRespFormat = Array.isArray(act.responsavel) ? act.responsavel.join(', ') : (act.responsavel || '-');

                    let subHtml = '';
                    let btnToggle = '';
                    if(act.subAtividades && act.subAtividades.length > 0) {
                        const uid = `card_sub_${d.id}_${idx}`;
                        subHtml = `<div id="${uid}" class="hidden" style="margin-top: 8px; padding-top: 4px; border-top: 1px dashed var(--cinza-200);">` + act.subAtividades.map(sub => {
                            const sitSub = calcularSituacaoPrazo({ status: sub.status, prazo_final: sub.prazo });
                            let sitSubClass = 'tag-status';
                            if(sitSub === 'Concluído' || sitSub === 'Concluída') sitSubClass = 'tag-concluida';
                            else if (sitSub === 'Atrasada') sitSubClass = 'tag-atrasada';
                            
                            const subRespFormat = Array.isArray(sub.responsavel) ? sub.responsavel.join(', ') : (sub.responsavel || '-');

                            return `
                            <div style="margin-top: 6px; margin-left: 12px; padding: 8px; border-left: 2px solid var(--cinza-300); background: var(--branco); border-radius: 4px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                                    <strong>↳ ${sub.titulo}</strong>
                                    <span class="tag ${sitSubClass}" style="font-size:9px;">${sub.status}</span>
                                </div>
                                <div style="font-size:11px; color:var(--cinza-600);">
                                    Coordenação (oes): ${subRespFormat} | Prazo: <strong>${formatarDataBR(sub.prazo)}</strong> <br>
                                    ${sub.obs ? `Obs: <em>${sub.obs}</em>` : ''}
                                </div>
                            </div>
                            `;
                        }).join('') + `</div>`;

                        btnToggle = `<div style="margin-top: 6px;"><button class="small-btn" style="font-size: 10px;" onclick="toggleSubVerMais('${uid}', this)">Ver Sub Atividades (▼)</button></div>`;
                    }

                    return `
                    <div class="atividade-item" style="margin-bottom: 10px;">
                        <div class="atividade-item-header">
                            <span>${act.titulo} (Diretoria(as): ${actRespFormat})</span>
                            <span class="tag ${(act.status==='Concluído' || act.status==='Concluída') ? 'tag-concluida' : 'tag-status'}">${act.status}</span>
                        </div>
                        <div class="atividade-item-body">
                            Prazo: <strong>${formatarDataBR(act.prazo)}</strong> <span class="tag ${sitActClass}" style="margin-left: 4px; padding: 2px 6px; font-size: 10px;">${sitAct}</span>
                        </div>
                        ${btnToggle}
                        ${subHtml}
                    </div>
                    `;
                }).join('');
                atividadesHtml = `<div class="atividades-lista">${acts}</div>`;
            } else {
                atividadesHtml = `<div style="color: var(--cinza-500); font-size: 13px;">Nenhuma atividade cadastrada.</div>`;
            }

            const compStr = (d.competencias && d.competencias.length > 0) ? d.competencias.join(' | ') : 'Nenhuma';
            
            return `
            <div class="ficha-demanda">
                <div class="ficha-header">
                    <div>
                        <h4 class="ficha-title">
                            ${isMaster ? `<span class="star-btn" onclick="toggleDestaque('${d.id}')">${d.destaque ? '⭐' : '<span style="color: #ccc;">☆</span>'}</span>` : (d.destaque ? '⭐' : '')}
                            ${d.titulo}
                        </h4>
                        <div class="ficha-meta">
                            <span>Diretoria(s): <strong>${dirStr}</strong></span>
                            <span>Coordenação: <strong>${coordStr || '-'}</strong></span>
                            <span>Tipo: <strong>${d.tipo_demanda || 'Projeto'}</strong></span>
                        </div>
                    </div>
                    <div>
                        <span class="tag ${statusClass}">${d.status}</span>
                    </div>
                </div>
                
                <div class="ficha-body">
                    <div class="ficha-body-item"><strong>Competência Regimental</strong> ${compStr}</div>
                    <div class="ficha-body-item"><strong>Data Início</strong> ${formatarDataBR(d.data_abertura)}</div>
                    <div class="ficha-body-item"><strong>Data Fim Estimada</strong> ${formatarDataBR(d.prazo_final)}</div>
                    <div class="ficha-body-item"><strong>Situação do Prazo</strong> <span class="tag ${sitClass}">${situacaoReal}</span></div>
                </div>

                <div class="ficha-footer">
                    <button class="small-btn action" onclick="toggleVerMais('${d.id}', this)">
                        ${qtdeAtividades > 0 ? `Ver Atividades (${qtdeAtividades}) ▼` : 'Sem atividades'}
                    </button>
                    <div class="ficha-actions">
                        <button class="small-btn" onclick="verAnexos('${d.id}')">Ver Anexos</button>
                        <button class="small-btn" onclick="verDemanda('${d.id}')">Resumo</button>
                        <button class="small-btn" onclick="editarDemanda('${d.id}')">${isMaster ? 'Editar' : 'Atualizar Ativ.'}</button>
                        ${isMaster ? `<button class="small-btn success" style="${disableConcluir}" ${d.status === 'Concluído' ? '' : `onclick="concluirDemanda('${d.id}')"`}>Concluir</button>` : ''}
                        ${isMaster ? `<button class="small-btn danger" onclick="excluirDemanda('${d.id}')">Excluir</button>` : ''}
                    </div>
                </div>

                <div id="atividades-painel-${d.id}" class="atividades-painel">
                    <strong style="color: var(--azul-900); display: block; margin-bottom: 12px;">Atividades Vinculadas</strong>
                    ${atividadesHtml}
                </div>
            </div>
          `;
         }).join('');
      };

      const updateView = () => { document.getElementById('gestaoContainer').innerHTML = window._renderCardsContent(); };

      page.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 class="section-title" style="margin: 0; border: none; padding: 0;">Gestão Projeto/Ação</h3>
            <button class="btn btn-primary" onclick="exportarExcel()">Exportar para Excel</button>
        </div>
        
        <div class="card" style="padding: 20px;">
          <div class="filters-row" style="margin-bottom: 0;">
            <input id="fBusca" placeholder="Pesquisar título..." />
            <select id="fDestaque"><option value="">Todos Projetos/Ações</option><option value="true">⭐ Apenas Destaques</option></select>
            <select id="filterDir"><option value="">Todas as Diretorias</option>${opcoes.diretorias.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            <select id="fCoordStr"><option value="">Todas Coordenações</option>${opcoes.coordenacoes.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            <select id="fCompetencia"><option value="">Todas as Competências</option>${todasCompetencias.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            <select id="fPlanoEst"><option value="">Todos os Planos Estratégicos</option>${todosPlanosEstrategicos.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            <select id="fStatus"><option value="">Todos os status</option>${opcoes.status.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
            <select id="fSituacao"><option value="">Todos os prazos</option><option value="No prazo">No prazo</option><option value="Pausado">Pausado</option><option value="Atrasada">Atrasada</option><option value="Concluído">Concluído</option></select>
          </div>
        </div>

        <div id="gestaoContainer">${window._renderCardsContent()}</div>
      `;

      document.getElementById('fBusca').addEventListener('input', updateView);
      document.getElementById('fDestaque').addEventListener('change', updateView);
      document.getElementById('filterDir').addEventListener('change', updateView);
      document.getElementById('fCoordStr').addEventListener('change', updateView);
      document.getElementById('fCompetencia').addEventListener('change', updateView);
      document.getElementById('fPlanoEst').addEventListener('change', updateView);
      document.getElementById('fStatus').addEventListener('change', updateView);
      document.getElementById('fSituacao').addEventListener('change', updateView);
    }

    // --- RELATORIOS ---
    function renderRelatorios() {
        const page = document.getElementById('relatoriosPage');
        
        let logsHtml = '<tr><td colspan="4" style="text-align:center;">Nenhum registro de auditoria encontrado.</td></tr>';
        if(logsAudit.length > 0) {
            logsHtml = logsAudit.map(log => `
                <tr>
                    <td>${log.dataHora}</td>
                    <td><strong>${log.usuario}</strong></td>
                    <td><span class="tag tag-status">${log.acao}</span></td>
                    <td>${log.detalhe}</td>
                </tr>
            `).join('');
        }

        page.innerHTML = `
            <div class="card border-top">
              <h3 class="section-title">Relatórios de Auditoria (Logs)</h3>
              <p style="color:var(--cinza-600); font-size:13px; margin-bottom: 16px;">Acompanhe todas as inserções, edições e exclusões realizadas no sistema.</p>
              <div class="table-wrap">
                <table>
                    <thead><tr><th>Data / Hora</th><th>Usuário Responsável</th><th>Ação</th><th>Detalhe da Modificação</th></tr></thead>
                    <tbody>${logsHtml}</tbody>
                </table>
              </div>
            </div>
        `;
    }

    // --- USUÁRIOS ---
    let usuarioEditandoId = null;

    window.toggleUserStatus = function(id) {
        if(getPerfil() !== 'Master') { toast('Acesso restrito!'); return; }
        const u = usuarios.find(x => String(x.id) === String(id));
        if(u) {
            u.status = u.status === 'Ativo' ? 'Inativo' : 'Ativo';
            registrarLog('Usuário', `Status do usuário ${u.nome} alterado para ${u.status}`);
            salvarBancoLocal();
            toast(`Usuário ${u.status.toLowerCase()}!`);
            renderUsuarios();
        }
    };

    window.alterarSenha = async function(id) {
        if(getPerfil() !== 'Master') { toast('Acesso restrito!'); return; }
        const u = usuarios.find(x => String(x.id) === String(id));
        if(u) {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(u.email, { redirectTo: location.href });
            if (error) return toast(`Falha: ${error.message}`);
            registrarLog('Usuário', `Recuperação de senha enviada para ${u.nome}`);
            toast('Recuperação de senha enviada por e-mail.');
        }
    };

    window.editarUsuario = function(id) {
        const u = usuarios.find(x => String(x.id) === String(id));
        if(u) {
            usuarioEditandoId = id;
            document.querySelector('#usuarioForm input[name="nome"]').value = u.nome;
            document.querySelector('#usuarioForm input[name="email"]').value = u.email;
            document.querySelector('#usuarioForm input[name="cpf"]').value = u.cpf || '';
            document.querySelector('#usuarioForm select[name="perfil"]').value = u.perfil;
            document.getElementById('btnSubmitUsuario').innerText = 'Salvar Alterações';
            
            // Rola até o formulário
            document.getElementById('usuarioForm').scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    };

    
    window.editarSolicitacao = function(id) {
        const s = solicitacoes.find(x => String(x.id) === String(id));
        if (!s) return;

        const modalHtml = `
        <div class="modal-backdrop" onclick="fecharModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-header" style="color: var(--azul-900);">Editar Solicitação</div>
            <div class="modal-body">
                <form onsubmit="salvarEdicaoSolicitacao(event, '${id}')">
                <div class="form-group"><label>Nome Completo</label><input id="editNome" type="text" required value="${s.nome}" /></div>
                <div class="form-group"><label>E-mail Institucional</label><input id="editEmail" type="email" required value="${s.email}" /></div>
                <div class="form-group"><label>CPF</label><input id="editCpf" type="text" required value="${s.cpf}" oninput="this.value = maskCPF(this.value)" /></div>
                <div class="form-group"><label>Setor / Coordenação</label><input id="editSetor" type="text" required value="${s.setor}" /></div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
                </form>
            </div>
            </div>
        </div>
        `;
        document.getElementById('modalContainer').innerHTML = modalHtml;
        document.getElementById('modalContainer').classList.remove('hidden');
    };

    
    window.salvarEdicaoSolicitacao = async function(e, id) {
        e.preventDefault();
        
        const dadosAtualizados = {
            nome: document.getElementById('editNome').value,
            email: document.getElementById('editEmail').value,
            cpf: document.getElementById('editCpf').value,
            setor: document.getElementById('editSetor').value
        };

        const { error } = await supabaseClient
            .from('solicitacoes_acesso')
            .update(dadosAtualizados)
            .eq('id', id);

        if (error) {
            toast(`Erro ao salvar: ${error.message}`);
            return;
        }

        toast('Solicitação atualizada com sucesso!');
        registrarLog('Edição', `Solicitação de acesso editada: ${dadosAtualizados.nome}`);
        fecharModal();
        await carregarBancoSupabase();
        renderUsuarios(); // Recarrega a tabela de solicitações
    };

    window.aprovarSolicitacao = async function(e, id) {
            const btn = e.currentTarget;
            btn.innerText = '⏳ Aprovando...';
            btn.disabled = true;

            // 1. Busca os dados da solicitação para pegar o nome
            const solicitacao = solicitacoes.find(s => String(s.id) === String(id));
            const nomeUsuario = solicitacao ? solicitacao.nome : 'Usuário desconhecido';

            // Dispara a Edge Function criada no Supabase
            const { data, error } = await supabaseClient.functions.invoke('aprovar-cadastro', {
                body: { solicitacao_id: id, perfil_escolhido: 'Usuário' }
            });

            if (error) {
                toast(`Falha na aprovação: ${error.message}`);
                btn.innerText = '✔️ Aprovar';
                btn.disabled = false;
                return;
            }

            toast('Acesso aprovado! E-mail com a senha temporária foi enviado.');
            
            // 2. Grava o log com o NOME do usuário em vez do ID
            registrarLog('Aprovação de Acesso', `O cadastro do usuário ${nomeUsuario} foi aprovado.`);
            
            await carregarBancoSupabase(); // Recarrega os dados (tira o pendente da tela)
            renderUsuarios();
        };

    window.rejeitarSolicitacao = async function(id) {
        if(!confirm('Tem certeza que deseja rejeitar e excluir essa solicitação de acesso?')) return;
        
        // 1. Busca os dados da solicitação para pegar o nome
        const solicitacao = solicitacoes.find(s => String(s.id) === String(id));
        const nomeUsuario = solicitacao ? solicitacao.nome : 'Usuário desconhecido';
        
        const { error } = await supabaseClient
            .from('solicitacoes_acesso')
            .delete()
            .eq('id', id);
            
        if (error) return toast(`Erro ao rejeitar: ${error.message}`);
        
        toast('Solicitação rejeitada e excluída com sucesso.');
        
        // 2. Grava o log com o NOME da pessoa excluída
        registrarLog('Rejeição de Acesso', `A solicitação de acesso de ${nomeUsuario} foi excluída.`);
        
        await carregarBancoSupabase();
        renderUsuarios();
        };

    function renderUsuarios() {
    const page = document.getElementById('usuariosPage');
    usuarioEditandoId = null; 
    
    const renderTableUsuarios = () => {
        return usuarios.map(u => {
            const isAtivo = u.status === 'Ativo';
            
            // Ícones SVG
            const svgEditar = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            const svgSenha = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>`;
            const svgInativar = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
            const svgAtivar = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

            const svgStatus = isAtivo ? svgInativar : svgAtivar;
            const btnClassStatus = isAtivo ? 'danger' : 'success';
            const titleStatus = isAtivo ? 'Inativar Usuário' : 'Ativar Usuário';

            return `
            <tr>
                <td><strong>${u.nome}</strong></td>
                <td>${u.email}</td>
                <td>${u.cpf || '-'}</td>
                <td><span class="tag tag-status">${u.perfil}</span></td>
                <td><span class="tag ${isAtivo ? 'tag-concluida' : 'tag-atrasada'}">${u.status}</span></td>
                <td style="display: flex; gap: 8px;">
                    <button class="small-btn action" style="padding: 8px; display: inline-flex; align-items: center;" title="Editar Perfil" onclick="editarUsuario('${u.id}')">
                        ${svgEditar}
                    </button>
                    <button class="small-btn ${btnClassStatus}" style="padding: 8px; display: inline-flex; align-items: center;" title="${titleStatus}" onclick="toggleUserStatus('${u.id}')">
                        ${svgStatus}
                    </button>
                    <button class="small-btn action" style="padding: 8px; display: inline-flex; align-items: center;" title="Redefinir Senha" onclick="alterarSenha('${u.id}')">
                        ${svgSenha}
                    </button>
                </td>
            </tr>`;
        }).join('');
    };

    // NOVA FUNÇÃO: Renderiza a tabela da Sala de Espera
const renderTableSolicitacoes = () => {
        if (solicitacoes.length === 0) return '<tr><td colspan="5" style="text-align:center; color: var(--cinza-500);">Nenhuma solicitação de acesso pendente.</td></tr>';
        
        return solicitacoes.map(s => {
            // Ícones SVG para Aprovar e Rejeitar
            const svgAprovar = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            const svgRejeitar = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

            return `
            <tr>
                <td><strong>${s.nome}</strong></td>
                <td>${s.email}</td>
                <td>${s.cpf || '-'}</td>
                <td>${s.setor || '-'}</td>
                <td style="display: flex; gap: 8px;">
                    <button class="small-btn action" style="padding: 8px; display: inline-flex; align-items: center;" title="Editar Solicitação" onclick="editarSolicitacao('${s.id}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="small-btn success" style="padding: 8px; display: inline-flex; align-items: center;" title="Aprovar Solicitação" onclick="aprovarSolicitacao(event, '${s.id}')">
                        ${svgAprovar}
                    </button>
                    <button class="small-btn danger" style="padding: 8px; display: inline-flex; align-items: center;" title="Rejeitar Solicitação" onclick="rejeitarSolicitacao('${s.id}')">
                        ${svgRejeitar}
                    </button>
                </td>
            </tr>`;
        }).join('');
    };

    page.innerHTML = `
        <!-- TABELA 1: SALA DE ESPERA (Novos Cadastros) -->
        <div class="section-grid" style="grid-template-columns: 1fr; margin-bottom: 24px;">
            <div class="card" style="border-left: 4px solid var(--amarelo);">
            <h3 class="section-title">Solicitações Pendentes</h3>
            <p style="font-size:12px;color:var(--cinza-600); margin-top:-10px; margin-bottom:15px;">Ao aprovar, o sistema criará o usuário e enviará a senha temporária para o e-mail automaticamente.</p>
            <div class="table-wrap">
                <table><thead><tr><th>Nome</th><th>E-mail</th><th>CPF</th><th>Setor</th><th>Ações</th></tr></thead><tbody id="solicitacoesTableBody">${renderTableSolicitacoes()}</tbody></table>
            </div>
            </div>
        </div>

        <!-- CARDS EXISTENTES: Edição e Tabela Geral -->
        <div class="section-grid">
            <div class="card">
            <h3 class="section-title">Editar Perfil de Usuário</h3>
            <p style="font-size:12px;color:var(--cinza-600)">Os usuários agora solicitam acesso via tela inicial. Utilize este formulário apenas para atualizar dados de quem já está aprovado.</p>
            <form id="usuarioForm">
                <div class="form-group"><label>Nome Completo *</label><input name="nome" required placeholder="Nome do servidor" /></div>
                <div class="form-group"><label>E-mail Institucional *</label><input type="email" name="email" required placeholder="email@saeb.ba.gov.br" /></div>
                <div class="form-group"><label>CPF</label><input type="text" name="cpf" placeholder="000.000.000-00" oninput="this.value = maskCPF(this.value)" /></div>
                <div class="form-group"><label>Perfil de Acesso</label><select name="perfil"><option value="Master">Master</option><option value="Usuário">Usuário</option></select></div>
                <button type="submit" id="btnSubmitUsuario" class="btn btn-primary btn-full">Salvar Alterações</button>
            </form>
            </div>
            
            <div class="card">
            <h3 class="section-title">Usuários Cadastrados</h3>
            <div class="table-wrap">
                <table><thead><tr><th>Nome</th><th>E-mail</th><th>CPF</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody id="usuariosTableBody">${renderTableUsuarios()}</tbody></table>
            </div>
            </div>
        </div>
    `;

    document.getElementById('usuarioForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        
        if (usuarioEditandoId) {
            const idx = usuarios.findIndex(u => String(u.id) === String(usuarioEditandoId));
            if(idx > -1) {
                usuarios[idx] = { ...usuarios[idx], nome: data.nome, email: data.email, cpf: data.cpf, perfil: data.perfil };
                registrarLog('Edição de Usuário', `Usuário atualizado: ${data.nome}`);
                toast('Usuário atualizado com sucesso!');
            }
            usuarioEditandoId = null;
            document.getElementById('btnSubmitUsuario').innerText = 'Salvar Alterações';
            salvarBancoLocal();
            document.getElementById('usuariosTableBody').innerHTML = renderTableUsuarios();
            e.target.reset();
        } else {
            toast('Selecione um usuário na tabela clicando em Editar antes de salvar.');
        }
    });
    }

    async function iniciarSessao(session) {
      sessaoAtual = session;
      if (!session) return;
      const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
      if (error || !profile) {
        toast('Perfil não encontrado. Execute o schema SQL e confirme o usuário no Supabase.');
        await supabaseClient.auth.signOut();
        return;
      }
      if (profile.status !== 'Ativo') {
        toast('Este usuário está inativo.');
        await supabaseClient.auth.signOut();
        return;
      }
      perfilAtual = profile;
      try { await carregarBancoSupabase(); }
      catch (e) { console.error(e); toast(`Falha ao carregar dados: ${e.message}`); return; }
      const userPill = document.getElementById('userPillInfo');
      if(userPill) userPill.innerText = `👤 ${profile.nome || session.user.email} (${profile.perfil})`;
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('appPage').classList.remove('hidden');
      navegar('dashboard');
    }


    async function inicializarSupabase() {
      if (!supabaseClient) {
        toast('Supabase não configurado. Edite SUPABASE_URL e SUPABASE_ANON_KEY no HTML.');
        return;
      }
      const { data } = await supabaseClient.auth.getSession();
      if (data.session) await iniciarSessao(data.session);
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          document.getElementById('appPage').classList.add('hidden');
          document.getElementById('loginPage').classList.remove('hidden');
        }
      });
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const userEmail = document.getElementById('loginEmail').value.trim();
      const userPwd = document.getElementById('loginSenha').value;
      
      if (!supabaseClient) return toast('Supabase não configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY no código.');
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email: userEmail, password: userPwd });
      if (error) return toast(`Não foi possível entrar: ${error.message}`);
      await iniciarSessao(data.session);
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      if (supabaseClient) await supabaseClient.auth.signOut();
      sessaoAtual = null; perfilAtual = null; demandas = []; usuarios = []; logsAudit = [];
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginSenha').value = '';
      document.getElementById('appPage').classList.add('hidden');
      document.getElementById('loginPage').classList.remove('hidden');
    });

    document.querySelectorAll('.nav-button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => navegar(btn.dataset.page));
    });

    inicializarSupabase();