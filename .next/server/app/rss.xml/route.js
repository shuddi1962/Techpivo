"use strict";(()=>{var e={};e.id=2287,e.ids=[2287],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},5253:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>m,patchFetch:()=>g,requestAsyncStorage:()=>p,routeModule:()=>c,serverHooks:()=>d,staticGenerationAsyncStorage:()=>u});var s={};r.r(s),r.d(s,{GET:()=>l});var n=r(9303),i=r(8716),a=r(670),o=r(5655);async function l(){let e=(0,o.e)(),t="https://blizine.com",{data:r}=await e.from("posts").select("title, slug, excerpt, content, published_at, author:profiles(full_name), category:categories(name)").eq("status","published").order("published_at",{ascending:!1}).limit(50),s=r?.map(e=>`
  <item>
    <title><![CDATA[${e.title}]]></title>
    <link>${t}/${e.slug}</link>
    <guid>${t}/${e.slug}</guid>
    <description><![CDATA[${e.excerpt||""}]]></description>
    <author>${e.author?.full_name||"Blizine"}</author>
    <category>${e.category?.name||"Tech"}</category>
    <pubDate>${new Date(e.published_at).toUTCString()}</pubDate>
  </item>`).join("")||"";return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blizine</title>
    <link>${t}</link>
    <description>Tech, decoded. Fast.</description>
    <language>en</language>
    <atom:link href="${t}/rss.xml" rel="self" type="application/rss+xml"/>
    ${s}
  </channel>
</rss>`,{headers:{"Content-Type":"application/rss+xml","Cache-Control":"public, max-age=3600"}})}let c=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/rss.xml/route",pathname:"/rss.xml",filename:"route",bundlePath:"app/rss.xml/route"},resolvedPagePath:"C:\\Users\\USER\\Desktop\\Blizine\\src\\app\\rss.xml\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:p,staticGenerationAsyncStorage:u,serverHooks:d}=c,m="/rss.xml/route";function g(){return(0,a.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:u})}},9303:(e,t,r)=>{e.exports=r(517)},8238:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"ReflectAdapter",{enumerable:!0,get:function(){return r}});class r{static get(e,t,r){let s=Reflect.get(e,t,r);return"function"==typeof s?s.bind(e):s}static set(e,t,r,s){return Reflect.set(e,t,r,s)}static has(e,t){return Reflect.has(e,t)}static deleteProperty(e,t){return Reflect.deleteProperty(e,t)}}},5655:(e,t,r)=>{r.d(t,{e:()=>i});var s=r(3452),n=r(1615);function i(){let e=(0,n.cookies)();return(0,s.l)("https://xkhvojjogoeuvrifekwr.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraHZvampvZ29ldXZyaWZla3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcwODE2MTAsImV4cCI6MjA0MjY1NzYxMH0.placeholder",{cookies:{getAll:()=>e.getAll(),setAll(t){t.forEach(({name:t,value:r,options:s})=>e.set(t,r,s))}}})}}};var t=require("../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[8948,8456,6400],()=>r(5253));module.exports=s})();