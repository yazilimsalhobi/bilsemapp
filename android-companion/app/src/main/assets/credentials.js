(request=>{
  const reply=v=>JSON.stringify(v);
  const visible=e=>e.getClientRects().length>0&&!e.disabled;
  const norm=s=>String(s||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
  try {
    if(location.protocol!=='https:'||location.hostname!=='mebbis.meb.gov.tr')return reply({ok:false,state:'wrong_origin'});
    const passwords=Array.from(document.querySelectorAll('input[type=password]')).filter(visible);
    if(passwords.length!==1)return reply({ok:false,state:'unrecognized'});
    const password=passwords[0],form=password.form;
    if(password.readOnly||!form||form.method.toLowerCase()!=='post')return reply({ok:false,state:'unrecognized'});
    const target=new URL(form.action||location.href,location.href);
    if(target.protocol!=='https:'||target.hostname!=='mebbis.meb.gov.tr')return reply({ok:false,state:'wrong_target'});
    const inputs=Array.from(form.querySelectorAll('input')).filter(visible);
    const verification=e=>/KOD|CAPTCHA|DOGRULA|GUVENLIK|OTP|ONETIME/.test(norm(e.id+' '+e.name+' '+e.placeholder+' '+e.autocomplete));
    const text=inputs.filter(e=>['text','tel','number','email'].includes(e.type)&&!verification(e));
    let candidates=text.filter(e=>e.autocomplete==='username'||/KULLANICI|USERNAME|TCKIMLIK|LOGINNAME/.test(norm(e.id+' '+e.name+' '+e.placeholder)));
    if(!candidates.length)candidates=text;
    if(candidates.length!==1)return reply({ok:false,state:'unrecognized'});
    if(!request.username||!request.password)return reply({ok:false,state:'empty'});
    // Do not replace a username the user has already started entering for another account.
    const username=candidates[0];
    if(username.value&&username.value!==request.username)return reply({ok:false,state:'different_user'});
    username.value=request.username;password.value=request.password;
    username.dispatchEvent(new Event('input',{bubbles:true}));password.dispatchEvent(new Event('input',{bubbles:true}));
    if(inputs.some(e=>e!==username&&e!==password&&['text','tel','number'].includes(e.type)&&(verification(e)||e.required)&&!e.value.trim()))return reply({ok:true,state:'verification'});
    const buttons=Array.from(form.querySelectorAll('button,input[type=submit],input[type=button],a')).filter(e=>visible(e)&&norm(e.innerText||e.value||e.title)==='GIRIS');
    if(buttons.length!==1)return reply({ok:true,state:'filled'});
    buttons[0].click();return reply({ok:true,state:'submitted'});
  } catch(error) {return reply({ok:false,state:'unrecognized'});}
})
