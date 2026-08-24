/* ================= Autenticação (Google Sign-In, restrita a @ifpb.edu.br) =================
 * IMPORTANTE — antes de usar, troque GOOGLE_CLIENT_ID pelo Client ID gerado no Google Cloud
 * Console (Credenciais OAuth 2.0), com https://dpi-ifpb.github.io como origem JavaScript
 * autorizada. Veja o passo a passo que acompanha este arquivo.
 *
 * LIMITAÇÃO IMPORTANTE: como este painel é só HTML/JS estático (sem servidor próprio), essa
 * checagem roda inteiramente no navegador de quem acessa. Ela barra o acesso casual/não
 * autorizado de forma eficaz, mas não é segurança formal — alguém com conhecimento técnico
 * poderia inspecionar o código e contornar. Não é adequado para dados ultrassensíveis sem
 * um backend validando o token também.
 */
const GOOGLE_CLIENT_ID = '807358818690-rg7qcv6bs38ltlgaf26qq228pdcuhie6.apps.googleusercontent.com';
const ALLOWED_DOMAIN = 'ifpb.edu.br';
// Opcional: restrinja a e-mails específicos, além do domínio. Deixe [] para liberar
// qualquer conta @ifpb.edu.br. Ex.: ['fulano@ifpb.edu.br', 'ciclana@ifpb.edu.br']
const EMAILS_ACESSO_COMPLETO = [
  'anderson.silva@ifpb.edu.br', 
  'mary.marinho@ifpb.edu.br', 
  'cleidenedia@ifpb.edu.br', 
  'maria.melo@ifpb.edu.br', 
  'silvana@ifpb.edu.br',
  'anna.mendonca@ifpb.edu.br',
  'erick.melo@ifpb.edu.br',
  'edmundo.silva@ifpb.edu.br'
];
const EMAILS_ACESSO_LIMITADO = [
  'dpi@ifpb.edu.br'
];
// Telas (ids usados em switchPage/PAGES) bloqueadas para o grupo "limitado".
// Por eliminação: qualquer tela que NÃO estiver nesta lista fica visível pra
// todo mundo, inclusive o grupo limitado. Ajuste conforme a necessidade.
//
// Ids disponíveis (nome do menu correspondente):
//   sobre       -> Início
//   formacao    -> Formação do Orçamento
//   estrutura   -> Estrutura Organizacional
//   funcoes     -> Funções Gratificadas
//   totais      -> Totais
//   detalhe     -> Detalhamento
//   extra       -> Nova Dist. de Custeio      (hoje já oculta do menu por outro motivo)
//   indicadores -> Indicadores
//   pares       -> Análise dos Pares          (hoje já oculta do menu)
//   simulador   -> Simulador QE               (hoje já oculta do menu)
//   simuladorF  -> Simulador Funcionamento    (hoje já oculta do menu)
const PAGINAS_BLOQUEADAS_LIMITADO = ['estrutura', 'funcoes', 'pares', 'simulador', 'simuladorF'];
// Tempo de inatividade até pedir login de novo (ms). 30 minutos por padrão.
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
let inactivityTimer = null;

function base64UrlDecode(str){
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while(str.length % 4) str += '=';
  return decodeURIComponent(
    atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
}

function decodeJwt(token){
  return JSON.parse(base64UrlDecode(token.split('.')[1]));
}

function showAuthError(msg){
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}

function grupoDoEmail(email){
  const e = (email || '').toLowerCase();
  if(EMAILS_ACESSO_COMPLETO.map(x => x.toLowerCase()).includes(e)) return 'completo';
  if(EMAILS_ACESSO_LIMITADO.map(x => x.toLowerCase()).includes(e)) return 'limitado';
  return null; // não está em nenhuma lista -> sem acesso
}

function handleCredentialResponse(response){
  let claims;
  try{
    claims = decodeJwt(response.credential);
  } catch(e){
    showAuthError('Não foi possível validar o login. Tente novamente.');
    return;
  }
  const email = (claims.email || '').toLowerCase();
  const hd = (claims.hd || '').toLowerCase();
  const domainOk = hd === ALLOWED_DOMAIN || email.endsWith('@' + ALLOWED_DOMAIN);
  const grupo = grupoDoEmail(email);

  if(!domainOk || !grupo){
    showAuthError(`A conta ${claims.email || ''} não tem acesso a este painel. Fale com a DPI para ser incluído na lista de usuários autorizados.`);
    if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    return;
  }

  sessionStorage.setItem('gedi_auth_email', claims.email || '');
  sessionStorage.setItem('gedi_auth_name', claims.name || claims.email || '');
  sessionStorage.setItem('gedi_auth_grupo', grupo);
  touchActivity();
  showApp(claims.name || claims.email || '');
}

function aplicarRestricaoDeGrupo(){
  const grupo = sessionStorage.getItem('gedi_auth_grupo') || 'limitado';
  PAGINAS_BLOQUEADAS_LIMITADO.forEach(pagina => {
    const nomeNav = 'nav' + pagina.charAt(0).toUpperCase() + pagina.slice(1);
    const navEl = document.getElementById(nomeNav);
    if(navEl) navEl.style.display = (grupo === 'completo') ? '' : 'none';
  });
}

function initials(name){
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if(parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length-1][0] : '')).toUpperCase();
}

function showApp(label){
  document.getElementById('authGate').style.display = 'none';
  document.getElementById('appRoot').style.display = '';
  const el = document.getElementById('authUserLabel');
  if(el) el.textContent = label || '';
  const av = document.getElementById('authUserAvatar');
  if(av) av.textContent = initials(label);
  aplicarRestricaoDeGrupo();
  startInactivityWatch();
}

function signOut(){
  sessionStorage.removeItem('gedi_auth_email');
  sessionStorage.removeItem('gedi_auth_name');
  sessionStorage.removeItem('gedi_auth_last_active');
  if(inactivityTimer) clearInterval(inactivityTimer);
  if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
  document.getElementById('appRoot').style.display = 'none';
  document.getElementById('authGate').style.display = 'flex';
}

function touchActivity(){
  sessionStorage.setItem('gedi_auth_last_active', String(Date.now()));
}

function startInactivityWatch(){
  // qualquer interação do usuário renova o prazo
  ['click','keydown','mousemove','scroll'].forEach(evt =>
    document.addEventListener(evt, touchActivity, { passive: true })
  );
  touchActivity();
  if(inactivityTimer) clearInterval(inactivityTimer);
  inactivityTimer = setInterval(() => {
    const last = parseInt(sessionStorage.getItem('gedi_auth_last_active') || '0', 10);
    if(Date.now() - last > INACTIVITY_LIMIT_MS){
      signOut();
    }
  }, 30 * 1000); // confere a cada 30s
}

function initGoogleButton(){
  if(!window.google || !google.accounts || !google.accounts.id){
    setTimeout(initGoogleButton, 200); // biblioteca do Google ainda carregando
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    hd: ALLOWED_DOMAIN,
  });
  const btnContainer = document.getElementById('googleSignInButton');
  google.accounts.id.renderButton(
    btnContainer,
    { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', width: btnContainer.clientWidth }
  );
}

function initAuthGate(){
  // sempre inicializa e desenha o botão do Google, esteja ou não logado agora —
  // assim ele já está pronto e funcional quando o usuário fizer logout depois,
  // sem precisar recarregar a página pra ele reaparecer
  initGoogleButton();

  // já logado nesta aba (sessão do navegador) — evita pedir login de novo a cada navegação interna,
  // mas expira depois de INACTIVITY_LIMIT_MS sem interação
  const savedEmail = sessionStorage.getItem('gedi_auth_email');
  const lastActive = parseInt(sessionStorage.getItem('gedi_auth_last_active') || '0', 10);
  const expired = savedEmail && (Date.now() - lastActive > INACTIVITY_LIMIT_MS);
  if(savedEmail && !expired){
    showApp(sessionStorage.getItem('gedi_auth_name') || savedEmail);
    return;
  }
  if(expired){
    sessionStorage.removeItem('gedi_auth_email');
    sessionStorage.removeItem('gedi_auth_name');
    sessionStorage.removeItem('gedi_auth_last_active');
  }
}

initAuthGate();
