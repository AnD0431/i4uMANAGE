# Sarah Universal Smart Search

Open Sarah and select **Universal Smart Search**, or type an explicit search such as `cari slaid latihan 2025`, `cari AKD aset`, `find working papers training` or `cari portal JDN`. Questions without a search request and attachments continue through the existing Sarah AI flow.

## Sources and coverage

- AKD metadata: existing Apps Script `source: akd`.
- Slides and working papers: existing Apps Script catalogue across eight categories each.
- Punca kuasa: the four links already on puncakuasa.html, plus any public punca-kuasa documents in RAG.
- Government portals: the existing Sarah government directory. This is a directory search, **not live web crawling or live policy verification**.
- Document body excerpts: the existing validated public RAG snapshot. Expired/invalid snapshots are unavailable; archived/replaced RAG entries are excluded. Results link to the actual source and show page/slide/section where available.

Results distinguish catalogue title/metadata matches from actual RAG excerpts and portal links. An excerpt is a search preview, not an AI summary or proof that a document remains in force. Category filters use catalogue categories; the current RAG format has no category metadata. Year filtering uses declared document year or a year in the title, not the last-updated date. Images/scans are searchable only if the RAG ingestion already extracted readable text.

## Configuration and deployment

Uses existing server-only environment variables; no new secret or paid search service:

- `I4UMANAGE_GAS_URL` / `I4UMANAGE_DOC_SECRET`: AKD, slides and working-paper metadata.
- `SARAH_RAG_INDEX_URL` / `SARAH_RAG_TOKEN`: public document contents.

Deploy the new `api/universal-search.js` function and all changed assets/pages together. `vercel.json` allows this endpoint 30 seconds. Request body: POST JSON `{q, type, category, year, page}`. Page is zero-based; 12 results per page. Blank query is allowed with a type/year/category filter. Source states report ready, partial, unavailable or disabled independently; missing sources never masquerade as a complete search with no matches.

The server bounds queries (300 characters / 12 distinct terms), results, response bodies, source concurrency (four requests), per-source timeout and catalogue deadline. Same-instance concurrent requests share catalogue loading; successful catalogues cache for five minutes and failed/partial loads retry after 15 seconds. RAG caching/validation remains in sarah-rag.js. These caches are per server instance, not a distributed rate limiter. Production capacity still depends on Apps Script quotas and hosting capacity.

## Matching and interface

Deterministic ranking prioritizes exact title, content and metadata. Malay/English synonyms and existing routing normalization help common wording; a bounded one-edit/transposition match helps longer title/metadata words. It does not understand every typo/language. Numeric references and short acronyms are not fuzzy matched. URLs are HTTPS-only and rendered with DOM text nodes; source text is never executed or treated as instructions. Google Drive URL variants are deduplicated.

The search dialog provides source/category/year filters, examples, pagination, an accessible heading, native dialog keyboard handling, status announcements and cancellation on close/new requests. Chat search results retain the existing reading-position and progressive-display behavior and offer a button to refine the search.

## Validation

Run `node --test tests/*.test.mjs`. Universal-search tests cover ranking, natural queries, synonyms, filters, unsafe URLs, duplicate sources, pagination, public RAG results, source failures/timeouts and simultaneous catalogue loads. UI preview fixtures exercise success/empty/error states without sending private files or calling a production model. Live Apps Script data, production credentials, quotas and deployment require separate verification in the deployed environment.
