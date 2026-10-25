import test from "node:test";
import assert from "node:assert/strict";
import site from "../src/index.mjs";
import { HOUSE_CREATIVE_CATALOG } from "@red-cup-engineering/web-advertising-system-engineering-services-section/catalog";
import { listEligibleCreatives } from "@red-cup-engineering/web-advertising-system-engineering-services-section/advertising";
import { createAdServerWorker } from "@red-cup-engineering/web-advertising-system-engineering-services-section/web";

// These are the *installed* provider exports selected by this site's package
// manifest. An empty echo test or a merged upstream source alone cannot receive
// the deployed Worker. Native installation/version closure remains required.
const ID = "561-group-sustaining-support-20261019";
const URL = "https://buy.stripe.com/28E28s1b4gJcb2Y3Io5EY02";
const ORIGIN = "https://ads.561.group";
const now = new Date("2026-10-19T12:00:00.000Z");

test("selected installed package actually includes the support campaign", () => {
  const offer = HOUSE_CREATIVE_CATALOG.find(item => item.id === ID);
  assert.ok(offer, "site must install a package containing the qualified campaign");
  assert.equal(offer.relationship, "house");
  assert.equal(offer.status, "live");
  assert.equal(offer.href, URL);
  assert.match(offer.body, /\$10 per month/u);
  assert.match(offer.body, /cancel anytime/u);
  assert.match(offer.body, /No exclusive access, influence, or tax deduction/u);
  for (const target of [
    {slot: "afterArticle", property: "koios-news", context: ["science"]},
    {slot: "footer", property: "play-561-group", context: ["games"]},
  ]) {
    const offered = listEligibleCreatives({catalog: HOUSE_CREATIVE_CATALOG, ...target, now});
    assert.ok(offered.some(item => item.id === ID), target.property);
  }
  assert.deepEqual(listEligibleCreatives({
    catalog: HOUSE_CREATIVE_CATALOG.filter(item => item.id === ID),
    slot: "footer", property: "561-group-sustaining-support",
    context: ["games"], now,
  }), [], "no ad for a property on itself");
});

test("the existing Worker serves real catalog, house selection and redirect", async () => {
  const seen = [];
  const env = {AD_ACTIVITY: {writeDataPoint(value) { seen.push(value); }}};
  const health = await site.fetch(new Request(ORIGIN + "/health"),env);
  assert.equal(health.status,200);
  const catalog = await site.fetch(new Request(ORIGIN + "/catalog"),env);
  assert.equal(catalog.status,200);
  const rows = (await catalog.json()).catalog;
  assert.ok(rows.some(item => item.id === ID && item.href === URL));
  for (const target of [
    ["afterArticle","koios-news","science"],
    ["footer","play-561-group","games"],
  ]) {
    const [slot, property, context] = target;
    const query = new URLSearchParams({slot,property,context});
    const response = await site.fetch(new Request(ORIGIN + "/ad?" + query),env);
    assert.equal(response.status,200,property);
    const data=await response.json();
    assert.equal(data.creative.relationship,"house");
    assert.ok(HOUSE_CREATIVE_CATALOG.some(item => item.id === data.creative.id), "existing selector owns the choice");
  }
  const click = await site.fetch(new Request(ORIGIN + "/click?slot=footer&property=play-561-group&creative="+ID, {redirect:"manual"}),env);
  assert.equal(click.status,302);
  assert.equal(click.headers.get("location"),URL);
  assert.equal(click.headers.get("x-561-receipt-status"),"not-applicable", "house ads do not bill customers for clicks");
  assert.ok(seen.some(event => event.blobs?.[0] === "outbound-redirect"), "only aggregate server telemetry");
});

test("invalid publisher, self-promotion and unadmitted creative do not redirect",async()=>{
  const invalid = await site.fetch(new Request(ORIGIN+"/click?slot=footer&property=561-group-sustaining-support&creative="+ID),{});
  assert.equal(invalid.status,400,"publisher coordinates must begin with a letter");
  assert.equal(invalid.headers.get("location"),null);
  const news=HOUSE_CREATIVE_CATALOG.find(item=>item.status==="live"&&item.property==="koios-news");
  assert.ok(news,"the original live news creative supplies a valid self-promotion control");
  const self = await site.fetch(new Request(ORIGIN+"/click?slot=footer&property=koios-news&creative="+news.id),{});
  assert.equal(self.status,404);
  assert.equal(self.headers.get("location"),null);
  const fabricated = await site.fetch(new Request(ORIGIN+"/click?slot=footer&property=koios-news&creative=no-such-offer"),{});
  assert.equal(fabricated.status,404);
  assert.equal(fabricated.headers.get("location"),null);
});


test("installed advert supplier refuses private/publicly unsafe first-party customer redirects",async()=>{
  const now=new Date("2026-10-23T12:00:00Z");
  const qualified=HOUSE_CREATIVE_CATALOG.find(item => item.id===ID);
  assert.ok(qualified,"actual source-selected support seller must remain present");
  assert.equal(listEligibleCreatives({catalog:[qualified],slot:"footer",
    property:"play-561-group",context:["games"],now}).length,1);
  for(const href of [
    "http://merchant.example.org/offer",
    "https://127.0.0.1/private",
    "https://localhost/private",
    "https://operator:password@merchant.example.org/offer",
    "https://merchant.example.org/offer?session=secret",
  ]){
    const altered={...qualified,href};
    assert.deepEqual(listEligibleCreatives({catalog:[altered],slot:"footer",
      property:"play-561-group",context:["games"],now}),[],
      "a source-live but unsafe link may not enter original publisher inventory");
    const activity=[];
    const testWorker=createAdServerWorker({catalog:[altered],nowMs:()=>now.getTime()});
    const response=await testWorker.fetch(new Request(
      ORIGIN+"/click?slot=footer&property=play-561-group&creative="+ID,
      {redirect:"manual"}),{
        AD_ACTIVITY:{writeDataPoint(value){activity.push(value);}}
      });
    assert.equal(response.status,404,"the installed provider must not redirect to a private sink");
    assert.equal(response.headers.get("location"),null);
    assert.deepEqual(activity,[],"refused links are not counted as prospects");
  }
});

test("installed paid source refuses unqualified sponsor before campaign cost or view receipt",async()=>{
  const now=new Date("2026-10-23T12:00:00Z");
  const sponsored={
    id:"candidate-sponsor",status:"live",relationship:"sponsored",
    title:"Candidate supplier",body:"No purchase yet",property:"merchant",
    slots:["footer"],properties:["play-561-group"],allowedContexts:["games"],
    disclosure:"Sponsored by a separately admitted seller",
    href:"https://supplier.example.org/offer",expiresAt:"2027-03-01T12:00:00Z"
  };
  assert.equal(listEligibleCreatives({catalog:[sponsored],slot:"footer",
    property:"play-561-group",context:["games"],now}).length,1);
  for(const altered of [
    {...sponsored,expiresAt:"2027-02-30T12:00:00Z"},
    {...sponsored,expiresAt:"2027-03-01T24:00:00Z"},
    {...sponsored,href:"https://127.0.0.1/offer"},
    {...sponsored,href:"https://supplier.example.org/offer?token=private"},
    {...sponsored,allowedContexts:["games","games"]},
  ]){
    const receipts=[],worker=createAdServerWorker({catalog:[altered],
      nowMs:()=>now.getTime()});
    const path="/ad?slot=footer&property=play-561-group&context=games";
    const response=await worker.fetch(new Request(ORIGIN+path),{
      AD_RECEIPTS:{async put(...args){receipts.push(args);}},
    });
    assert.equal(response.status,404,"invalid paid offer must not be selected");
    assert.deepEqual(receipts,[],"no false paid event is generated");
  }
});


test("installed host preserves the free KV PUT budget under first-party load, quota refusal and reset",async()=>{
  // This is a host/selected-package receiving test. A catalog-source promise
  // alone cannot establish that the actual installed Worker uses zero paid
  // KV writes for ordinary, first-party acquisition traffic.
  const support=HOUSE_CREATIVE_CATALOG.find(item=>item.id===ID);
  assert.ok(support);
  let clock=Date.parse("2026-10-24T23:59:00.000Z");
  const reset=Date.parse("2026-10-25T00:00:00.000Z");
  const activity=[],writeAttempts=[];
  const kv={
    async put(key){writeAttempts.push(key);if(clock<reset){
      const error=new Error("KV PUT quota exceeded: private provider detail");
      error.status=429;throw error;
    }},
  };
  const env={AD_RECEIPTS:kv,AD_ACTIVITY:{writeDataPoint(point){activity.push(point);}}};
  const house=createAdServerWorker({catalog:[support],nowMs:()=>clock});
  const paths=[
    ["/ad?slot=footer&property=play-561-group&context=games","GET",200],
    ["/view?slot=footer&property=play-561-group&context=games&creative="+ID,"POST",202],
    ["/click?slot=footer&property=play-561-group&context=games&creative="+ID,"GET",302],
  ];
  // A 64-client burst comprises 192 admitted source requests, not 192
  // impressions, accepted customers, charged events or billed usage.
  const burst=await Promise.all(Array.from({length:64},()=>paths).flat().map(
    async ([path,method,status])=>{
      const response=await house.fetch(new Request(ORIGIN+path,{method,redirect:"manual"}),env);
      assert.equal(response.status,status,path);
      if(method==="GET"&&path.startsWith("/click")) {
        assert.equal(response.headers.get("location"),URL);
        assert.equal(response.headers.get("x-561-receipt-status"),"not-applicable");
      }
      return response.status;
    }));
  assert.equal(burst.length,192);
  assert.equal(activity.length,192,"only best-effort aggregate observations were submitted");
  assert.equal(writeAttempts.length,0,"192 house requests must not consume any KV PUT allowance");
  const refused=await house.fetch(new Request(
    ORIGIN+"/click?slot=footer&property=play-561-group&creative=unissued"),env);
  assert.equal(refused.status,404);
  assert.equal(activity.length,192,"refused requests do not become aggregate activity");
  assert.equal(writeAttempts.length,0);

  // A real paid/source-qualified event remains different: one PUT is required
  // to record it. Provider 429 must refuse the event, hold further attempts
  // in this isolate, and never silently count an unrecorded paid action.
  const sponsor={id:"quota-test-sponsor",status:"live",relationship:"sponsored",
    title:"Qualifying supplier",body:"Test-only candidate",property:"merchant",
    slots:["footer"],properties:["play-561-group"],allowedContexts:["games"],
    disclosure:"Sponsored by test supplier",href:"https://supplier.example.org/offer",
    expiresAt:"2027-03-01T12:00:00Z"};
  const paid=createAdServerWorker({catalog:[support,sponsor],nowMs:()=>clock});
  const paidPath="/view?slot=footer&property=play-561-group&context=games&creative="+sponsor.id;
  const former=console.error,logs=[];
  console.error=message=>logs.push(String(message));
  try {
    const first=await paid.fetch(new Request(ORIGIN+paidPath,{method:"POST"}),env);
    assert.equal(first.status,503,"429 cannot be represented as recorded paid delivery");
    assert.equal(writeAttempts.length,1);
    const held=await Promise.all(Array.from({length:64},()=>
      paid.fetch(new Request(ORIGIN+paidPath,{method:"POST"}),env)));
    assert.ok(held.every(reply=>reply.status===503));
    assert.equal(writeAttempts.length,1,"quota backpressure prevents 64 pointless retries");
    assert.equal(logs.length,1,"known quota failure is not logged once per refused event");
    assert.equal(JSON.parse(logs[0]).errorClass,"kv-write-quota-exhausted");
    assert.doesNotMatch(logs[0],/private provider detail/u);
    const fallback=await paid.fetch(new Request(
      ORIGIN+"/ad?slot=footer&property=play-561-group&context=games"),env);
    assert.equal(fallback.status,200,"house delivery survives a paid-storage hold");
    assert.equal((await fallback.json()).creative.relationship,"house");
    assert.equal(writeAttempts.length,1);
    clock=reset;
    const recovered=await paid.fetch(new Request(ORIGIN+paidPath,{method:"POST"}),env);
    assert.equal(recovered.status,202,"paid receiving retries only after quota reset");
    assert.equal((await recovered.json()).status,"recorded");
    assert.equal(writeAttempts.length,2);
  }finally{console.error=former;}
});

test("selected installed supplier carries the received ASSIST browser campaign through the original host", async () => {
  const campaignId = "assist-public-guides-20261025";
  const destination = "https://assist-561.briskolm35.chatgpt.site/";
  const response = await site.fetch(new Request(ORIGIN + "/catalog"), {});
  assert.equal(response.status, 200);
  const catalog = (await response.json()).catalog;
  const offer = catalog.find(creative => creative.id === campaignId);
  assert.ok(offer, "the actual installed supplier must contain the received ASSIST creative");
  assert.equal(offer.href, destination);
  assert.equal(offer.status, "live");
  assert.equal(offer.relationship, "house");
  assert.equal(offer.expiresAt, "2026-11-25T00:00:00Z");
  const clock = Date.parse("2026-10-25T12:00:00Z");
  const instance = createAdServerWorker({ catalog: [offer], nowMs: () => clock });
  for (const target of [
    { slot: "afterArticle", property: "koios-news", context: "technology" },
    { slot: "footer", property: "play-561-group", context: "games" },
  ]) {
    assert.ok(listEligibleCreatives({ catalog, ...target, now: new Date(clock) }).some(c => c.id === campaignId));
    const activity = [], writes = [];
    const env = { AD_ACTIVITY: { writeDataPoint: point => activity.push(point) },
      AD_RECEIPTS: { put: async (...args) => writes.push(args) } };
    const query = new URLSearchParams({ ...target, creative: campaignId });
    const ad = await instance.fetch(new Request(ORIGIN + "/ad?" + query), env);
    assert.equal(ad.status, 200);
    assert.equal((await ad.json()).creative.id, campaignId);
    assert.equal((await instance.fetch(new Request(ORIGIN + "/view?" + query, { method: "POST" }), env)).status, 202);
    const redirect = await instance.fetch(new Request(ORIGIN + "/click?" + query, { redirect: "manual" }), env);
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get("location"), destination);
    assert.equal(redirect.headers.get("x-561-receipt-status"), "not-applicable");
    assert.deepEqual(writes, [], "ASSIST house acquisition does not consume paid KV writes");
    assert.deepEqual(activity.map(point => point.blobs[0]), ["creative-response", "client-visible-opportunity", "outbound-redirect"]);
    const count = activity.length;
    const foreign = new URLSearchParams({ ...target, context: "unrelated", creative: campaignId });
    assert.equal((await instance.fetch(new Request(ORIGIN + "/click?" + foreign), env)).status, 404);
    assert.equal(activity.length, count, "an ineligible redirect creates no aggregate prospect");
    const expired = createAdServerWorker({ catalog: [offer], nowMs: () => Date.parse(offer.expiresAt) });
    assert.equal((await expired.fetch(new Request(ORIGIN + "/click?" + query), env)).status, 404);
    assert.deepEqual(writes, []);
    assert.equal(activity.length, count);
  }
});
