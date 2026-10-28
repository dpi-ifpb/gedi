/* ================= Autenticação (Firebase Auth + Google, restrita a @ifpb.edu.br) =================
 * Agora a checagem de identidade é feita pelo Firebase, não só decodificando o
 * token no navegador — e os perfis de acesso (acumuláveis) vêm do Firestore
 * (coleção "usuarios", campo "perfis"), protegidos pelas regras em
 * firebase/firestore.rules. A restrição é aplicada no servidor: quem não tem o
 * perfil necessário não consegue baixar os dados, mesmo burlando a interface.
 */
const ALLOWED_DOMAIN = 'ifpb.edu.br';
// Quem vê cada tela agora é definido por perfil em PAGINAS_PERFIS (config.js).
// Tempo de inatividade até pedir login de novo (ms). 30 minutos por padrão.
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
let inactivityTimer = null;

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();

function showAuthError(msg){
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}
function esconderAuthError(){
  const el = document.getElementById('authError');
  if(el) el.style.display = 'none';
}

function showAuthLoading(msg){
  const el = document.getElementById('authLoading');
  if(el){ el.textContent = msg || 'Carregando…'; el.style.display = 'block'; }
}
function esconderAuthLoading(){
  const el = document.getElementById('authLoading');
  if(el) el.style.display = 'none';
}

function entrarComGoogle(){
  esconderAuthError();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ hd: ALLOWED_DOMAIN }); // sugere já filtrar contas @ifpb.edu.br na tela do Google
  auth.signInWithPopup(provider).catch(err => {
    if(err.code === 'auth/popup-closed-by-user') return; // usuário só fechou a janela, não é erro de verdade
    showAuthError('Não foi possível fazer login. Tente novamente.');
    console.error(err);
  });
}

// Perfis do usuário (null = e-mail não cadastrado). Ver Repo.usuarios.
function buscarPerfisDoUsuario(email){
  return Repo.usuarios.perfisDoUsuario(email);
}

// Dispara sempre que o estado de login muda (login, logout, retomada de sessão)
auth.onAuthStateChanged(async (user) => {
  if(!user){
    if(typeof pararAssinaturas === 'function') pararAssinaturas();
    PERFIS_ATUAIS = [];
    esconderAuthLoading();
    document.getElementById('authGate').style.display = 'flex';
    document.getElementById('appRoot').style.display = 'none';
    if(inactivityTimer) clearInterval(inactivityTimer);
    return;
  }

  const email = (user.email || '').toLowerCase();
  const domainOk = email.endsWith('@' + ALLOWED_DOMAIN);
  if(!domainOk){
    showAuthError(`A conta ${user.email} não é do domínio @${ALLOWED_DOMAIN}.`);
    await auth.signOut();
    return;
  }

  showAuthLoading('Verificando acesso…');
  let perfis;
  try{
    perfis = await buscarPerfisDoUsuario(email);
  } catch(err){
    console.error(err);
    showAuthError('Não foi possível verificar seu acesso. Tente novamente em instantes.');
    await auth.signOut();
    return;
  }

  if(!perfis || perfis.length === 0){
    showAuthError(`A conta ${user.email} não tem acesso a este painel. Fale com a DPI para ser incluído na lista de usuários autorizados.`);
    await auth.signOut();
    return;
  }

  PERFIS_ATUAIS = perfis;
  showAuthLoading('Carregando dados do painel…');
  try{
    await carregarDadosEstaticos();
  } catch(err){
    console.error(err);
    showAuthError('Login feito, mas houve um problema ao carregar os dados do painel. Recarregue a página.');
    esconderAuthLoading();
    return;
  }

  esconderAuthLoading();
  touchActivity();
  showApp(user.displayName || user.email);
});

// Esconde do menu as telas que os perfis do usuário não podem ver e, em seguida,
// os títulos de seção que ficaram sem nenhum item visível. Itens já ocultos de
// propósito no HTML (style="display:none") continuam ocultos.
function aplicarRestricaoDePerfil(){
  Object.keys(PAGINAS_PERFIS).forEach(pagina => {
    const navEl = document.getElementById('nav' + pagina.charAt(0).toUpperCase() + pagina.slice(1));
    if(navEl) navEl.classList.toggle('sem-permissao', !podeVerPagina(pagina));
  });
  document.querySelectorAll('.nav-list-wrap .nav-section-label').forEach(label => {
    let el = label.nextElementSibling, algumVisivel = false;
    while(el && !el.classList.contains('nav-section-label')){
      if(el.classList.contains('nav-item') && !el.classList.contains('sem-permissao') && el.style.display !== 'none') algumVisivel = true;
      el = el.nextElementSibling;
    }
    label.classList.toggle('sem-permissao', !algumVisivel);
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
  const box = document.getElementById('authUser');
  if(box) box.title = 'Perfis: ' + PERFIS_ATUAIS.map(p => PERFIS[p] || p).join(', ');
  aplicarRestricaoDePerfil();
  iniciarAssinaturas();
  if(typeof iniciarPainelComDados === 'function') iniciarPainelComDados();
  startInactivityWatch();
}

function signOut(){
  if(inactivityTimer) clearInterval(inactivityTimer);
  if(typeof pararAssinaturas === 'function') pararAssinaturas();
  auth.signOut();
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
