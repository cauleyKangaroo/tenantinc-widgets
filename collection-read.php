<?php
/**
 * collection-read.php — READ-proxy for Duda collections the editor-side tooling
 * needs outside a published page.
 *
 * WHY THIS EXISTS
 *   The Widget Builder's external-settings page (spacelist-ordering-settings.html)
 *   runs in an iframe on OUR domain inside the Duda editor — `window.dmAPI`
 *   (the free client-side Collections API) exists on PUBLISHED pages only, and
 *   Duda's REST read needs Partner-API Basic auth that a public page can never
 *   hold. So the read goes through here, exactly like writes go through
 *   accordion-sync.php. GET only — this file cannot write anything.
 *
 * USAGE
 *   GET ?collection=PropertiesInternal&siteId=XXXX
 *     → { ok: true, collection, siteId, rows: [ { id, data: {…fields} }, … ] }
 *   Rows are returned as Duda hands them over (fields nested under `data` with
 *   a row-level id). The caller normalises — PropertiesInternal is a NATIVE
 *   collection, so text cells arrive rteBlock-wrapped and JSON cells as text.
 *
 * SETUP (one-time, on the server — NOT in the repo)
 *   Shares accordion-sync.php's un-committed sibling `accordion-creds.php`
 *   ($DUDA_API_USER / $DUDA_API_PASS), so this file too can be copied wholesale.
 *
 * SECURITY
 *   The collection name must be on the whitelist below. Everything in these
 *   collections already renders on public pages, but there is no reason to
 *   expose an arbitrary-collection reader to the internet.
 */

// ── CREDENTIALS (loaded from the un-committed sibling file; env can override) ──
$DUDA_API_USER = '';
$DUDA_API_PASS = '';
$credsFile = __DIR__ . '/accordion-creds.php';
if (is_file($credsFile)) require $credsFile;
$DUDA_API_USER = getenv('DUDA_API_USER') ?: $DUDA_API_USER;
$DUDA_API_PASS = getenv('DUDA_API_PASS') ?: $DUDA_API_PASS;

// ── CONFIG ────────────────────────────────────────────────────────────────────
$DUDA_API_BASE = 'https://api.duda.co';          // EU accounts: https://api.eu.duda.co
$ALLOWED_COLLECTIONS = ['PropertiesInternal'];     // read-only whitelist
// ──────────────────────────────────────────────────────────────────────────────

// ── CORS (the settings iframe is on another origin than this host) ───────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

function respond($code, $payload) {
  http_response_code($code);
  echo json_encode($payload);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
  respond(405, ['error' => 'GET only — this proxy cannot write']);
}
if ($DUDA_API_USER === '' || $DUDA_API_PASS === '') {
  respond(500, ['error' => 'Missing credentials — create accordion-creds.php with $DUDA_API_USER / $DUDA_API_PASS']);
}

$collection = trim((string) ($_GET['collection'] ?? ''));
$siteId     = trim((string) ($_GET['siteId'] ?? ''));
if (!in_array($collection, $ALLOWED_COLLECTIONS, true)) {
  respond(400, ['error' => 'Unknown collection', 'allowed' => $ALLOWED_COLLECTIONS]);
}
// Duda's own ids are short alphanumerics; this also keeps the id out of path tricks.
if ($siteId === '' || !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $siteId)) {
  respond(400, ['error' => 'A valid siteId is required']);
}

$url = $DUDA_API_BASE . '/api/sites/multiscreen/' . rawurlencode($siteId)
     . '/collection/' . rawurlencode($collection);

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER     => ['Authorization: Basic ' . base64_encode($DUDA_API_USER . ':' . $DUDA_API_PASS)],
  CURLOPT_TIMEOUT        => 20,
]);
$raw  = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$cerr = curl_error($ch);
curl_close($ch);

if ($raw === false) respond(502, ['error' => 'Duda request failed', 'detail' => $cerr]);
if ($code < 200 || $code >= 300) {
  respond(502, ['error' => 'Duda GET collection failed', 'status' => $code, 'body' => json_decode($raw, true) ?? $raw]);
}

$decoded = json_decode($raw, true);

/** Pull a rows array out of whatever envelope Duda returns (same as accordion-sync). */
$rows = [];
if (is_array($decoded)) {
  if (isset($decoded[0])) {
    $rows = $decoded;
  } else {
    foreach (['values', 'data', 'rows'] as $k) {
      if (isset($decoded[$k]) && is_array($decoded[$k])) { $rows = $decoded[$k]; break; }
    }
  }
}

respond(200, ['ok' => true, 'collection' => $collection, 'siteId' => $siteId, 'rows' => $rows]);
