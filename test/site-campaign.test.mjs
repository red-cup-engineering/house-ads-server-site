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

test("unsellable publisher and unadmitted creative do not redirect",async()=>{
  const self = await site.fetch(new Request(ORIGIN+"/click?slot=footer&property=561-group-sustaining-support&creative="+ID),{});
  assert.equal(self.status,404);
  const fabricated = await site.fetch(new Request(ORIGIN+"/click?slot=footer&property=koios-news&creative=no-such-offer"),{});
  assert.equal(fabricated.status,404);
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
