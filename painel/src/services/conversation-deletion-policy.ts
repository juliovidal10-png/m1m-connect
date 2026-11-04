/** Missing, malformed or wildcard scope never grants new deletion. Durable protection is independent. */
export function configuredDeletionScope(companyId:string,instanceName:string,env:Record<string,string|undefined>=process.env):boolean {
  if(env.M1M_CONVERSATION_DELETION_ENABLED!=="true")return false;
  try{
    const scopes:unknown=JSON.parse(env.M1M_CONVERSATION_DELETION_SCOPES??'null');
    if(!Array.isArray(scopes)||scopes.length===0||scopes.length>100)return false;
    const seen=new Set<string>();
    for(const row of scopes){
      if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='companyId,instanceName')return false;
      for(const k of ['companyId','instanceName'])if(typeof row[k]!=='string'||!row[k]||row[k]!==row[k].trim()||row[k].length>180||/[\s*]/.test(row[k]))return false;
      const key=JSON.stringify([row.companyId,row.instanceName]);if(seen.has(key))return false;seen.add(key);
    }
    return seen.has(JSON.stringify([companyId,instanceName]));
  }catch{return false;}
}
