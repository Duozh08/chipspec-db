/**
 * CloudBase 云函数：ocr
 * 调用腾讯云通用印刷体识别（GeneralBasicOCR）识别截图文字。
 * POST https://<env>.service.tcloudbase.com/ocr
 * 请求：{ imageBase64: "<base64 字符串>" }
 * 返回：{ ok: true, text: "识别文本", detections: [...] }
 *
 * 说明：
 * - 零依赖：手动实现腾讯云 TC3-HMAC-SHA256 签名（仅用 node 内置 crypto/https）；
 * - 凭证使用 SCF 运行时自动注入的临时密钥（TENCENTCLOUD_SECRETID/SECRETKEY/SESSIONTOKEN），
 *   无需在环境变量里配置任何密钥；
 * - 图片约束：base64 后 ≤ 7MB、长边 ≤ 8192px（前端已预处理压缩）；
 * - 免费额度以腾讯云控制台「OCR 通用印刷体识别」为准（个人认证通常每月 1000 次免费）。
 */

const crypto = require('crypto');
const https = require('https');

const SERVICE = 'ocr';
const HOST = 'ocr.tencentcloudapi.com';
const REGION = 'ap-shanghai';
const VERSION = '2018-11-19';
const ACTION = 'GeneralBasicOCR';

function sha256hex(msg) {
  return crypto.createHash('sha256').update(msg, 'utf8').digest('hex');
}

function hmacSha256(key, msg) {
  return crypto.createHmac('sha256', key).update(msg, 'utf8').digest();
}

/** 腾讯云 API TC3 签名后 POST JSON（返回解析后的响应体） */
function tc3Request(secretId, secretKey, token, payload) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const body = JSON.stringify(payload);

    const headers = {
      'content-type': 'application/json; charset=utf-8',
      host: HOST,
      'x-tc-action': ACTION.toLowerCase(),
      'x-tc-timestamp': String(timestamp),
      'x-tc-version': VERSION,
    };
    // 仅 content-type/host/x-tc-action/x-tc-timestamp/x-tc-version 参与签名；
    // X-TC-Region 与 X-TC-Token 只作为请求头发送，不加入 SignedHeaders（与腾讯云 SDK 一致）
    const signedKeys = ['content-type', 'host', 'x-tc-action', 'x-tc-timestamp', 'x-tc-version'];

    // 1. CanonicalRequest
    const canonicalHeaders = signedKeys.map((k) => `${k}:${headers[k]}`).join('\n') + '\n';
    const signedHeaders = signedKeys.join(';');
    const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, sha256hex(body)].join('\n');

    // 2. StringToSign
    const credentialScope = `${date}/${SERVICE}/tc3_request`;
    const stringToSign = [
      'TC3-HMAC-SHA256',
      String(timestamp),
      credentialScope,
      sha256hex(canonicalRequest),
    ].join('\n');

    // 3. Signature
    const kDate = hmacSha256('TC3' + secretKey, date);
    const kService = hmacSha256(kDate, SERVICE);
    const kSigning = hmacSha256(kService, 'tc3_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

    // 4. Authorization
    const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const req = https.request(
      {
        hostname: HOST,
        method: 'POST',
        path: '/',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Host: HOST,
          'X-TC-Action': ACTION,
          'X-TC-Region': REGION,
          'X-TC-Timestamp': String(timestamp),
          'X-TC-Version': VERSION,
          ...(token ? { 'X-TC-Token': token } : {}),
          Authorization: authorization,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.Response && json.Response.Error) {
              const err = new Error(`${json.Response.Error.Code}: ${json.Response.Error.Message}`);
              err.signatureDebug = {
                date,
                credentialScope,
                signedHeaders,
                canonicalRequest: canonicalRequest.slice(0, 300),
                stringToSign: stringToSign.slice(0, 300),
              };
              reject(err);
            } else {
              resolve(json.Response || {});
            }
          } catch (e) {
            reject(new Error(`OCR 响应解析失败: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('OCR 请求超时')));
    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

/** 构造腾讯云 API 凭证：
 * 1) 优先环境变量 OCR_SECRET_ID/OCR_SECRET_KEY（用户配置的永久密钥，建议子账号最小权限 QcloudOCRFullAccess）；
 * 2) 兜底 SCF 自动注入的临时密钥（TENCENTCLOUD_SECRETID/...，需在腾讯云控制台给 TCB_QcsRole 附加 OCR 策略）。 */
function buildCredential() {
  if (process.env.OCR_SECRET_ID && process.env.OCR_SECRET_KEY) {
    return {
      secretId: process.env.OCR_SECRET_ID,
      secretKey: process.env.OCR_SECRET_KEY,
      token: process.env.OCR_SESSION_TOKEN || '',
    };
  }
  const secretId = process.env.TENCENTCLOUD_SECRETID;
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
  const token = process.env.TENCENTCLOUD_SESSIONTOKEN;
  if (!secretId || !secretKey) return null;
  return { secretId, secretKey, token };
}

exports.main = async (event) => {
  // 参数兼容 HTTP 网关（event.body JSON 串）与内部调用
  let params = {};
  if (event && typeof event === 'object') {
    if (typeof event.body === 'string') {
      try { params = { ...JSON.parse(event.body) }; } catch { /* ignore */ }
    } else if (event.body && typeof event.body === 'object') {
      params = event.body;
    } else {
      params = event;
    }
  }

  const imageBase64 = typeof params.imageBase64 === 'string' ? params.imageBase64.trim() : '';
  if (!imageBase64) {
    return { ok: false, error: 'imageBase64 required' };
  }
  if (imageBase64.length > 7 * 1024 * 1024) {
    return { ok: false, error: '图片过大（base64 需 ≤ 7MB），请压缩后重试' };
  }

  const cred = buildCredential();
  if (!cred) {
    return { ok: false, error: 'OCR 服务未配置（云函数缺少临时密钥）' };
  }

  try {
    const res = await tc3Request(cred.secretId, cred.secretKey, cred.token, {
      ImageBase64: imageBase64,
    });
    const detections = Array.isArray(res.TextDetections)
      ? res.TextDetections.map((d) => ({
          text: d.DetectedText || '',
          confidence: typeof d.Confidence === 'number' ? d.Confidence : null,
        }))
      : [];
    const text = detections
      .map((d) => d.text)
      .filter(Boolean)
      .join('\n');
    if (!text) {
      return { ok: true, text: '', detections: [], note: '未识别到文字' };
    }
    return { ok: true, text, detections, language: res.Language };
  } catch (err) {
    console.error('[ocr] 调用失败:', err && err.message ? err.message : err);
    return {
      ok: false,
      error: err && err.message ? err.message : 'OCR 调用失败',
      ...(err && err.signatureDebug ? { debug: err.signatureDebug } : {}),
    };
  }
};
