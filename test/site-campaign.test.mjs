import test from "node:test";
import assert from "node:assert/strict";
import site from "../src/index.mjs";
import { HOUSE_CREATIVE_CATALOG } from "@red-cup-engineering/web-advertising-system-engineering-services-section/catalog";
import { listEligibleCreatives } from "@red-cup-engineering/web-advertising-system-engineering-services-section/advertising";

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
