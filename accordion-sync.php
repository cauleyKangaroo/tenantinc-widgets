<?php
/**
 * accordion-sync.php — write-proxy for the Space List widget's per-instance
 * sidebar-accordion order (which sections show, in what order).
 *
 * WHY THIS EXISTS
 *   The widget bundle is public (GitHub Pages / Plesk), so it can never hold
 *   Duda API credentials. Duda's client-side Collections JS API is READ-ONLY.
 *   So writes go through this server-side proxy, which holds the credentials and
 *   calls Duda's REST API. The widget only calls this from the Duda editor, on Save.
 *
 * FLOW
 *   Widget POSTs JSON: { siteId, elementId, instanceKey, order:[], hidden:[] }
 *   -> upsert a row in the Duda `accordionConfig` collection keyed by instanceKey.
 *
 * SETUP (one-time, on the server — NOT in the repo)
 *   Create a sibling file `accordion-creds.php` next to this one containing:
 *       <?php
 *       $DUDA_API_USER = 'your-duda-api-username';
 *       $DUDA_API_PASS = 'your-duda-api-password';
 *   That keeps secrets out of the public repo, so THIS file can be copy-pasted
 *   wholesale anytime without disturbing your credentials.
 *
 * DEBUG
 *   GET ?debug=1&siteId=XXXX  → dumps Duda's raw collection response (auth + shape).
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
$COLLECTION    = 'accordionConfig';
$ALLOWED_ORIGINS = ['*'];                          // tighten to your domains if desired
$VALID_KEYS = ['store', 'nearby', 'reviews', 'faq', 'blog', 'sizeguide'];
// ──────────────────────────────────────────────────────────────────────────────

// ── CORS ──────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array('*', $ALLOWED_ORIGINS, true)) {
  header('Access-Control-Allow-Origin: *');
} elseif ($origin !== '' && in_array($origin, $ALLOWED_ORIGINS, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

// ── Helpers ─────────────────────────────────────────────────────────────────
function respond($code, $payload) {
  http_response_code($code);
  echo json_encode($payload);
  exit;
}

/** One authenticated call to the Duda REST API. Returns [code, body(decoded), raw]. */
function duda_call($method, $url, $user, $pass, $body = null) {
  $ch = curl_init($url);
  $headers = ['Authorization: Basic ' . base64_encode($user . ':' . $pass)];
  if ($body !== null) $headers[] = 'Content-Type: application/json';
  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_POSTFIELDS     => $body !== null ? json_encode($body) : null,
    CURLOPT_TIMEOUT        => 20,
  ]);
  $raw  = curl_exec($ch);
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $cerr = curl_error($ch);
  curl_close($ch);
  if ($raw === false) return [0, null, $cerr];
  return [$code, json_decode($raw, true), $raw];
}

/** Pull a rows array out of whatever envelope Duda returns. */
function extract_rows($decoded) {
  if (is_array($decoded)) {
    if (isset($decoded[0])) return $decoded;                 // bare array of rows
    foreach (['values', 'data', 'rows'] as $k) {
      if (isset($decoded[$k]) && is_array($decoded[$k])) return $decoded[$k];
    }
  }
  return [];
}

/** Find this instance's row + its id. Row fields may be flat or nested under 'data'. */
function find_row($rows, $instanceKey) {
  foreach ($rows as $row) {
    if (!is_array($row)) continue;
    $fields = (isset($row['data']) && is_array($row['data'])) ? $row['data'] : $row;
    if (($fields['instanceKey'] ?? null) === $instanceKey) {
      $id = $row['id'] ?? $row['row_id'] ?? $fields['id'] ?? null;
      return ['id' => $id, 'row' => $row];
    }
  }
  return null;
}

// ── Guards ──────────────────────────────────────────────────────────────────
$isDebug = isset($_GET['debug']);
if ($DUDA_API_USER === '' || $DUDA_API_PASS === '') {
  respond(500, ['error' => 'Missing credentials — create accordion-creds.php with $DUDA_API_USER / $DUDA_API_PASS']);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' && !$isDebug) {
  respond(405, ['error' => 'POST only']);
}

// ── Parse + validate input ────────────────────────────────────────────────────
$siteId = $elementId = ''; $order = $hidden = [];
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  $in = json_decode(file_get_contents('php://input'), true);
  if (!is_array($in)) respond(400, ['error' => 'Invalid JSON body']);

  $siteId    = trim((string) ($in['siteId'] ?? ''));
  $elementId = trim((string) ($in['elementId'] ?? ''));
  if ($siteId === '' || $elementId === '') {
    respond(400, ['error' => 'siteId and elementId are required']);
  }
  $order  = is_array($in['order']  ?? null) ? array_values(array_intersect($in['order'],  $VALID_KEYS)) : [];
  $hidden = is_array($in['hidden'] ?? null) ? array_values(array_intersect($in['hidden'], $VALID_KEYS)) : [];
} else {
  $siteId = trim((string) ($_GET['siteId'] ?? ''));
  if ($siteId === '') respond(400, ['error' => 'debug GET needs ?siteId=']);
}

$instanceKey = $siteId . '_' . $elementId;
$collUrl = $DUDA_API_BASE . '/api/sites/multiscreen/' . rawurlencode($siteId)
         . '/collection/' . rawurlencode($COLLECTION);

// ── 1) Read the collection to find an existing row for this instance ─────────
list($getCode, $getBody, $getRaw) = duda_call('GET', $collUrl, $DUDA_API_USER, $DUDA_API_PASS);

if ($isDebug) {
  respond(200, [
    'debug'         => true,
    'collectionUrl' => $collUrl,
    'getStatus'     => $getCode,
    'rowsFound'     => count(extract_rows($getBody)),
    'rawResponse'   => $getBody ?? $getRaw,
  ]);
}

if ($getCode < 200 || $getCode >= 300) {
  respond(502, ['error' => 'Duda GET collection failed', 'status' => $getCode, 'body' => $getBody ?? $getRaw]);
}

$existing = find_row(extract_rows($getBody), $instanceKey);

// ── 2) Build the row fields + upsert ─────────────────────────────────────────
$fields = [
  'instanceKey' => $instanceKey,
  'siteId'      => $siteId,
  'elementId'   => $elementId,
  'order'       => json_encode($order),
  'hidden'      => json_encode($hidden),
  'updatedAt'   => gmdate('c'),
];

// Per the official @dudadev/partner-api client, the body is a BARE ARRAY of row
// objects (NOT wrapped in {"values": ...}). Create: [{data:{…}}]. Update adds id.
if ($existing && $existing['id'] !== null) {
  $row = ['id' => $existing['id'], 'data' => $fields];
  $action = 'updated';
  list($code, $body) = duda_call('PUT', $collUrl . '/row', $DUDA_API_USER, $DUDA_API_PASS, [$row]);
} else {
  $row = ['data' => $fields];
  $action = 'created';
  list($code, $body) = duda_call('POST', $collUrl . '/row', $DUDA_API_USER, $DUDA_API_PASS, [$row]);
}

if ($code < 200 || $code >= 300) {
  respond(502, [
    'error'    => 'Duda write failed',
    'action'   => $action,
    'status'   => $code,
    'sentBody' => [$row],   // exactly what we POSTed, for debugging
    'body'     => $body,
  ]);
}

respond(200, ['ok' => true, 'action' => $action, 'instanceKey' => $instanceKey]);
