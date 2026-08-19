const GOOGLE_CLIENT_ID = '807358818690-rg7qcv6bs38ltlgaf26qq228pdcuhie6.apps.googleusercontent.com';
const ALLOWED_DOMAIN = 'ifpb.edu.br';
// Opcional: restrinja a e-mails específicos, além do domínio. Deixe [] para liberar
// qualquer conta @ifpb.edu.br. Ex.: ['fulano@ifpb.edu.br', 'ciclana@ifpb.edu.br']
const ALLOWED_EMAILS = [
  'anderson.silva@ifpb.edu.br', 
  'mary.marinho@ifpb.edu.br', 
  'cleidenedia@ifpb.edu.br', 
  'maria.melo@ifpb.edu.br', 
  'silvana@ifpb.edu.br',
  'anna.mendonca@ifpb.edu.br',
  'erick.melo@ifpb.edu.br'
];
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
  const emailOk = ALLOWED_EMAILS.length === 0 || ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email);

  if(!domainOk || !emailOk){
    showAuthError(`A conta ${claims.email || ''} não tem acesso a este painel. Entre com uma conta @${ALLOWED_DOMAIN} autorizada.`);
    if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    return;
  }

  sessionStorage.setItem('gedi_auth_email', claims.email || '');
  sessionStorage.setItem('gedi_auth_name', claims.name || claims.email || '');
  touchActivity();
  showApp(claims.name || claims.email || '');
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

// Link "Fazer login novamente" — recarrega a página pra reiniciar o fluxo de login do zero,
// caso o botão do Google não tenha renderizado corretamente por algum motivo.
function retryLogin(){
  window.location.reload();
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

function initAuthGate(){
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
  if(!window.google || !google.accounts || !google.accounts.id){
    setTimeout(initAuthGate, 200); // biblioteca do Google ainda carregando
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    hd: ALLOWED_DOMAIN,
  });
  google.accounts.id.renderButton(
    document.getElementById('googleSignInButton'),
    { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill' }
  );
}

initAuthGate();
