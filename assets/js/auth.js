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
const ALLOWED_EMAILS = ['anderson.silva@ifpb.edu.br'];

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
  showApp(claims.name || claims.email || '');
}

function showApp(label){
  document.getElementById('authGate').style.display = 'none';
  document.getElementById('appRoot').style.display = '';
  const el = document.getElementById('authUserLabel');
  if(el) el.textContent = label || '';
}

function signOut(){
  sessionStorage.removeItem('gedi_auth_email');
  sessionStorage.removeItem('gedi_auth_name');
  if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
  document.getElementById('appRoot').style.display = 'none';
  document.getElementById('authGate').style.display = 'flex';
}

function initAuthGate(){
  // já logado nesta aba (sessão do navegador) — evita pedir login de novo a cada navegação interna
  const savedEmail = sessionStorage.getItem('gedi_auth_email');
  if(savedEmail){
    showApp(sessionStorage.getItem('gedi_auth_name') || savedEmail);
    return;
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
