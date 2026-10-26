# house-ads-server-site

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Deployable Cloudflare Worker site for the house advertising engine (v0, unlisted workers.dev route) — wraps @red-cup-engineering/web-advertising-system-engineering-services-section for deploy; carries no application logic of its own.

## Received ASSIST house promotion supplier

The existing host selects advertising engine `0.3.0-dev.2`, including its
original sustaining-support, paid-product and seven inactive game creatives,
plus `assist-public-guides-20261025`. Supplier PR #7 merged at
`2fa6576097ac2f1590248fd54d2e76c3aedd9531`. The source package's complete native
suite passes 60 cases. Its ASSIST destination was actually received in a public
browser: hub, VeChain/Mugshot, B3/B3TR distinction, previous-day navigation and
Gig provider requirements. The campaign invites that browser journey; it
promises no account, machine API, completed task, payment or financial action.

The site imports the same supplier's original `createAdServerWorker`. Its
existing `AD_RECEIPTS` KV namespace, custom `ads.561.group` route and Wrangler
version are unchanged. House ad, view and click requests do not write paid KV
receipts. Aggregate activity uses the optional `AD_ACTIVITY` binding when it is
available. The original six
host tests remain intact, including the 192-request zero-KV house burst and
paid quota/refusal/reset case. A seventh test receives the installed ASSIST
catalog record through this host and checks both publisher contexts, original
ad/view/redirect behavior, no paid KV writes, aggregate observations and
wrong-context/expiry refusal.

A source-packed archive can qualify this host before publication when received
explicitly, without changing the declared exact dependency pin. That evidence
is source-built, not a registry receipt. The authorized production release
retains the verified selected archive, resolved supplier identities and built
artifact digest. A registry release is received independently before claiming
registry provenance; a genuinely source-built release keeps that explicit
provenance. Neither local tests nor a catalog entry establish live Koios/Play
placement, verified human views, subscribers or revenue. Receive the deployed
catalog and actual publisher rendering separately.

The exact source-packed `0.3.0-dev.2` candidate passes all **7/7** native host
cases with zero skips. Wrangler **4.127.1** completed the original deployment
command in `--dry-run` mode, emitting the Worker without uploading it or
changing cloud resources. The deployment retains the existing receipt namespace.

## Optional aggregate analytics

The production account rejected the `AD_ACTIVITY` binding with Cloudflare error
`10089` because Analytics Engine is not enabled. The default Wrangler
configuration therefore omits that optional binding. The supplier serves house
ads with its existing `unbound` activity result and performs zero paid-receipt KV
writes. Request logs remain enabled through Workers observability.

After Analytics Engine is available in the account, add this original dataset
binding to `wrangler.jsonc` and deploy through the same release workflow:

```json
"analytics_engine_datasets": [
  { "binding": "AD_ACTIVITY", "dataset": "house_ads_activity" }
]
```

The release must select the same binding configuration and receive it from the
active Worker before using aggregate activity results.
