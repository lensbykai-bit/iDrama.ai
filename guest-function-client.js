// Guest Edge Function caller: uses apikey only so no customer login/JWT is required.
(function(){
  if(typeof db==='undefined'||!db.functions) return;
  const endpoint='https://xiziwoquiatlpkihkdoh.supabase.co/functions/v1/bakong-payment';
  const publishableKey='sb_publishable_3TmqRI06OhjnXkxelxDwWQ__YsvBgXQ';
  const originalInvoke=db.functions.invoke.bind(db.functions);

  db.functions.invoke=async function(functionName,options={}){
    if(functionName!=='bakong-payment') return originalInvoke(functionName,options);
    try{
      const res=await fetch(endpoint,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey':publishableKey
        },
        body:JSON.stringify(options.body||{})
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
