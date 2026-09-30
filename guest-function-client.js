// Guest Edge Function caller: uses apikey only so no customer login/JWT is required.
(function(){
  if(typeof db==='undefined'||!db.functions) return;
  const base='https://xiziwoquiatlpkihkdoh.supabase.co/functions/v1';
  const publishableKey='sb_publishable_3TmqRI06OhjnXkxelxDwWQ__YsvBgXQ';
  const originalInvoke=db.functions.invoke.bind(db.functions);

  db.functions.invoke=async function(functionName,options={}){
    if(functionName!=='bakong-payment') return originalInvoke(functionName,options);
    const body=options.body||{};
    // Telegram delivery uses a dedicated endpoint so paid private-channel links
    // can expire and be revoked immediately after the first successful join.
    const endpoint=body.action==='telegram'
      ? `${base}/telegram-access`
      : `${base}/bakong-payment`;
    try{
      const res=await fetch(endpoint,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey':publishableKey
        },
        body:JSON.stringify(body)
      });
      let data=null;
      try{data=await res.json()}catch{}
      if(!res.ok){
        const error=new Error(data?.error||`HTTP ${res.status}`);
        error.status=res.status;
        return {data,error};
      }
      return {data,error:null};
    }catch(error){
      return {data:null,error};
    }
  };
})();
