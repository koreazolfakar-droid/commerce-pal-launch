# Independence from Lovable

## Application

Cloudflare Workers serves the three existing Space Call production domains directly.
GitHub main is connected to Cloudflare Builds. Supabase remains the existing database,
Auth and Storage service. No data migration or production test writes are required.

The repository's default Vite build now uses the framework plugins directly.
The Cloudflare-specific build remains the production deploy artifact.
No Lovable package or package-registry mirror is required by the lockfile.
React error reporting uses the browser console instead of editor hooks.
Authentication remains tab-scoped with legacy session migration and blocked-storage fallback;
embedded pages no longer exchange tokens with the former editor.

The Dashboard AI assistant keeps direct Gemini, Google Search grounding, schema validation,
the search-free retry and manual suggestion approval. The unconfigured Lovable AI fallback
is removed. Inspected production logs reported Gemini configured and Lovable unconfigured.
Deploy the matching dashboard-ai-assist Edge Function after tests; never change production
records to test it. Keep its existing JWT verification setting and companion files.

## Domain registration is a separate remaining step

The existing domain was purchased through Lovable. Nameservers, DNS and website hosting
are already on Cloudflare, but registration/renewal remains managed through Lovable/Name.com.
Do not delete the Lovable account, domain registration or disable renewal before handover.

Official transfer-out flow:

1. Workspace settings → Workspace domains → Configure the domain.
2. Open the three-dot menu → Transfer out.
3. Check the exact eligibility date; new registrations have a mandatory 60-day lock.
4. When eligible, unlock and reveal the authorization/EPP code only in a secure session.
5. Enter it directly at the destination registrar. Never commit or post the code in chat.

The owner-provided registration screenshot showed 2026-09-05. Sixty days after that date
is 2026-11-04; the registrar's exact eligibility timestamp is authoritative.
The current cloud-browser session is not signed in to Lovable, so the live transfer dialog
and its eligibility timestamp have not been verified.

Cloudflare Registrar requires a valid payment method and a paid transfer for most domains,
usually including another registration year. The owner has prohibited payment setup.
Do not initiate a transfer, add a payment method or accept registration terms automatically.
The read-only transfer eligibility check without an EPP code returned invalid_auth_code_format;
this is not proof of eligibility or ineligibility by registration age.

After registration is independently controlled and renewed, disconnect the old Lovable
project's Git sync and hosting from the Lovable UI. Do not revoke the GitHub app globally:
it may serve other projects. Keep the GitHub repository and Supabase project intact.
Verification TXT records are not runtime dependencies and can remain during handover.

### Possible no-payment registration handover

Name.com documents free internal transfers between Name.com accounts, separate from
paid transfers to another registrar. Whether Lovable can release this reseller-managed
domain into the owner's own Name.com account must be confirmed by Lovable/Name.com support;
the Lovable transfer-out UI documents only the EPP flow. Do not promise this route is
available, create an account, or contact support without the owner's instruction.
If supported, keep the existing Cloudflare nameservers and registrant details unchanged.

- https://cs.name.com/hc/en-us/articles/205934797-Domain-transfer-FAQ

References:

- https://docs.lovable.dev/features/custom-domain
- https://developers.cloudflare.com/registrar/get-started/transfer-domain-to-cloudflare/
