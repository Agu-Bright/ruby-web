'use client';
declare global { interface Window { PaystackPop?: { setup:(config:Record<string,unknown>)=>{openIframe:()=>void} } } }
export function openPaystackInline(config:{key:string;email:string;amountKobo:number;reference:string;onSuccess:(reference:string)=>void;onClose?:()=>void}){if(!window.PaystackPop)throw new Error('Paystack is not loaded.');window.PaystackPop.setup({key:config.key,email:config.email,amount:config.amountKobo,ref:config.reference,callback:(response:{reference:string})=>config.onSuccess(response.reference),onClose:config.onClose}).openIframe()}
