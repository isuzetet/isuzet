import 'dotenv/config';
import { generateId } from '@ruit/shared-db';

const SMS_TIMEOUT_MS = 5000; // 5 second timeout
const SMS_MAX_RETRIES = 3;
const SMS_RETRY_DELAY_MS = 1000; // Initial delay, will exponentially backoff

export type SmsPayload = {
  phone: string;
  message: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  referenceId?: string;
};

export type SmsResult = {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

/**
 * Helper to fetch with timeout and retry logic
 */
async function fetchWithTimeoutAndRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = SMS_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SMS_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const delay = SMS_RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff

      if (attempt < maxRetries) {
        console.warn(
          `[SMS] Fetch attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms: ${lastError.message}`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('SMS fetch failed after all retries');
}

async function sendViaAfricasTalking(payload: SmsPayload): Promise<SmsResult | null> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME || 'sandbox';

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetchWithTimeoutAndRetry(
      'https://api.africastalking.com/version1/messaging',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'apiKey': apiKey,
        },
        body: new URLSearchParams({
          username: username,
          to: payload.phone,
          message: payload.message,
        }).toString(),
      }
    );

    if (!response.ok) {
      console.error(`[SMS] Africa's Talking failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const messageId = data.SMSMessageData?.Recipients?.[0]?.messageId;

    console.log(`SMS sent via Africa's Talking to ${payload.phone} ref:${payload.referenceId || 'none'}`);

    return {
      success: true,
      provider: 'AFRICAS_TALKING',
      messageId: messageId || generateId('sms'),
    };
  } catch (error) {
    console.error('[SMS] Africa\'s Talking error:', error);
    return null;
  }
}

async function sendViaTwilio(payload: SmsPayload): Promise<SmsResult | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    return null;
  }

  try {
    const response = await fetchWithTimeoutAndRetry(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({
          To: payload.phone,
          From: fromNumber || '+15005550000',
          Body: payload.message,
        }).toString(),
      }
    );

    if (!response.ok) {
      console.error(`[SMS] Twilio failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    console.log(`SMS sent via Twilio to ${payload.phone} ref:${payload.referenceId || 'none'}`);

    return {
      success: true,
      provider: 'TWILIO',
      messageId: data.sid || generateId('sms'),
    };
  } catch (error) {
    console.error('[SMS] Twilio error:', error);
    return null;
  }
}

async function sendViaMock(payload: SmsPayload): Promise<SmsResult> {
  console.log(`[SMS MOCK] To: ${payload.phone} Message: ${payload.message.substring(0, 50)}... ref:${payload.referenceId || 'none'}`);

  return {
    success: true,
    provider: 'MOCK',
    messageId: generateId('sms'),
  };
}

export async function sendSms(payload: SmsPayload): Promise<SmsResult> {
  // Provider cascade: Africa's Talking -> Twilio -> Mock

  // Try Africa's Talking first
  const atResult = await sendViaAfricasTalking(payload);
  if (atResult) {
    return atResult;
  }

  // Fallback to Twilio
  const twilioResult = await sendViaTwilio(payload);
  if (twilioResult) {
    return twilioResult;
  }

  // Final fallback: Mock (always succeeds)
  return sendViaMock(payload);
}

export async function sendBulkSms(payloads: SmsPayload[]): Promise<SmsResult[]> {
  const results: SmsResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const batchPromises = batch.map(payload => sendSms(payload));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}
