/**
 * Kountz Push Notification Worker
 * Cloudflare Worker qui gère les notifications push pour la PWA Kountz
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/subscribe':
          return handleSubscribe(request, env, corsHeaders);
        case '/schedule':
          return handleSchedule(request, env, corsHeaders);
        case '/unsubscribe':
          return handleUnsubscribe(request, env, corsHeaders);
        case '/vapid-public-key':
          return new Response(JSON.stringify({ publicKey: env.VAPID_PUBLIC_KEY }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        default:
          return new Response('Kountz Push Service', { headers: corsHeaders });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  },

  // Cron trigger : vérifie toutes les 5 minutes s'il y a des notifications à envoyer
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processScheduledNotifications(env));
  }
};

/**
 * Enregistre un abonnement push
 */
async function handleSubscribe(request, env, cors) {
  const { subscription, deviceId } = await request.json();
  if (!subscription || !deviceId) {
    return new Response(JSON.stringify({ error: 'subscription et deviceId requis' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  await env.KV.put(`sub:${deviceId}`, JSON.stringify(subscription));
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}

/**
 * Supprime un abonnement
 */
async function handleUnsubscribe(request, env, cors) {
  const { deviceId } = await request.json();
  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'deviceId requis' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  await env.KV.delete(`sub:${deviceId}`);
  await env.KV.delete(`sched:${deviceId}`);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}

/**
 * Met à jour le planning de notifications
 * Format attendu : { deviceId, reminders: [{ id, time (ISO), title, body }] }
 */
async function handleSchedule(request, env, cors) {
  const { deviceId, reminders } = await request.json();
  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'deviceId requis' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors }
    });
  }

  await env.KV.put(`sched:${deviceId}`, JSON.stringify(reminders || []));
  return new Response(JSON.stringify({ ok: true, count: (reminders || []).length }), {
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}

/**
 * Traite les notifications planifiées (appelé par le cron)
 */
async function processScheduledNotifications(env) {
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;

  // Liste tous les schedules
  const schedList = await env.KV.list({ prefix: 'sched:' });

  for (const key of schedList.keys) {
    const deviceId = key.name.replace('sched:', '');
    const schedRaw = await env.KV.get(key.name);
    if (!schedRaw) continue;

    const reminders = JSON.parse(schedRaw);
    const remaining = [];
    let changed = false;

    for (const reminder of reminders) {
      const reminderTime = new Date(reminder.time).getTime();

      // La notification doit être envoyée (dans la fenêtre des 5 dernières minutes)
      if (reminderTime <= now && reminderTime > fiveMinAgo) {
        await sendPushNotification(env, deviceId, reminder);
        changed = true;
      } else if (reminderTime > now) {
        remaining.push(reminder);
      } else {
        // Notification trop ancienne, on la retire
        changed = true;
      }
    }

    if (changed) {
      if (remaining.length > 0) {
        await env.KV.put(key.name, JSON.stringify(remaining));
      } else {
        await env.KV.delete(key.name);
      }
    }
  }
}

/**
 * Envoie une notification push à un device
 */
async function sendPushNotification(env, deviceId, notification) {
  const subRaw = await env.KV.get(`sub:${deviceId}`);
  if (!subRaw) return;

  const subscription = JSON.parse(subRaw);
  const payload = JSON.stringify({
    title: notification.title || 'Kountz',
    body: notification.body || '',
    icon: './icons/icon-192.svg',
    tag: notification.tag || 'kountz-reminder',
    data: { objectiveId: notification.id }
  });

  try {
    await webPush(env, subscription, payload);
  } catch (e) {
    console.error(`Push failed for ${deviceId}:`, e.message);
    // Si l'abonnement est expiré (410 Gone), on le supprime
    if (e.status === 410 || e.status === 404) {
      await env.KV.delete(`sub:${deviceId}`);
    }
  }
}

/**
 * Implémentation Web Push avec VAPID pour Cloudflare Workers
 */
async function webPush(env, subscription, payload) {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;

  // Importe les clés
  const vapidPrivateKey = base64UrlToUint8Array(env.VAPID_PRIVATE_KEY);
  const clientPublicKey = base64UrlToUint8Array(p256dh);
  const clientAuth = base64UrlToUint8Array(auth);

  // Génère les clés éphémères pour le chiffrement
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);

  // ECDH shared secret
  const peerKey = await crypto.subtle.importKey(
    'raw', clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: peerKey },
    localKeyPair.privateKey,
    256
  );

  // HKDF pour les clés de chiffrement (RFC 8291)
  const payloadBytes = new TextEncoder().encode(payload);
  const encrypted = await encryptPayload(
    payloadBytes, sharedSecret, new Uint8Array(localPublicKeyRaw), clientPublicKey, clientAuth
  );

  // VAPID JWT
  const jwt = await createVapidJwt(env, endpoint);

  // Envoie la requête push
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': encrypted.byteLength.toString(),
      'TTL': '86400',
      'Authorization': `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
    },
    body: encrypted,
  });

  if (!res.ok) {
    const err = new Error(`Push failed: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
}

/**
 * Chiffre le payload selon RFC 8291 (aes128gcm)
 */
async function encryptPayload(payload, sharedSecret, localPublicKey, clientPublicKey, clientAuth) {
  // Salt aléatoire de 16 bytes
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM = HKDF(auth, sharedSecret, "WebPush: info\0" + clientPubKey + localPubKey)
  const authInfo = concatArrays(
    new TextEncoder().encode('WebPush: info\0'),
    clientPublicKey,
    localPublicKey
  );

  const ikm = await hkdf(clientAuth, new Uint8Array(sharedSecret), authInfo, 32);

  // PRK = HKDF-Extract(salt, IKM)
  // Content-Encryption Key = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  // Nonce = HKDF-Expand(PRK, "Content-Encoding: nonce\0", 12)
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Padding : ajoute 0x02 delimiter + padding bytes
  const paddedPayload = concatArrays(payload, new Uint8Array([2]));

  // AES-128-GCM
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    paddedPayload
  );

  // Header aes128gcm : salt(16) + rs(4) + idlen(1) + keyid(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096 + paddedPayload.byteLength);

  const header = concatArrays(
    salt,
    rs,
    new Uint8Array([localPublicKey.byteLength]),
    localPublicKey
  );

  return concatArrays(header, new Uint8Array(ciphertext));
}

/**
 * Crée un JWT VAPID signé
 */
async function createVapidJwt(env, endpoint) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = { typ: 'JWT', alg: 'ES256' };
  const body = { aud: audience, exp, sub: env.VAPID_SUBJECT };

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const bodyB64 = btoa(JSON.stringify(body)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const input = `${headerB64}.${bodyB64}`;

  // Importe la clé privée VAPID
  const privateKeyBytes = base64UrlToUint8Array(env.VAPID_PRIVATE_KEY);
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: uint8ArrayToBase64Url(privateKeyBytes),
    x: uint8ArrayToBase64Url(base64UrlToUint8Array(env.VAPID_PUBLIC_KEY).slice(1, 33)),
    y: uint8ArrayToBase64Url(base64UrlToUint8Array(env.VAPID_PUBLIC_KEY).slice(33, 65)),
  };

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(input)
  );

  // Convertit la signature DER en format r||s (64 bytes)
  const sigBytes = new Uint8Array(signature);
  const sigB64 = uint8ArrayToBase64Url(sigBytes);

  return `${input}.${sigB64}`;
}

// --- Utilitaires ---

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));

  const infoKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const t = concatArrays(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', infoKey, t));

  return okm.slice(0, length);
}

function concatArrays(...arrays) {
  const totalLen = arrays.reduce((acc, arr) => acc + arr.byteLength, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(new Uint8Array(arr.buffer || arr), offset);
    offset += arr.byteLength;
  }
  return result;
}

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const raw = atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(arr) {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
