import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

initializeApp();

const invalidTokenCodes = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered'
]);

export const sendNotificationPush = onDocumentCreated('notificacoes/{notificationId}', async event => {
  const notification = event.data?.data();
  if (!notification) return;

  const deviceSnapshot = await getFirestore().collectionGroup('devices').get();
  const devices = deviceSnapshot.docs
    .map(snapshot => ({ ref: snapshot.ref, token: snapshot.get('token') }))
    .filter(device => typeof device.token === 'string' && device.token.length > 0);

  if (devices.length === 0) {
    logger.info('Push not sent: no registered devices.');
    return;
  }

  const title = String(notification.title || 'Nova notificação').slice(0, 100);
  const body = String(notification.message || '').slice(0, 300);

  for (let offset = 0; offset < devices.length; offset += 500) {
    const batch = devices.slice(offset, offset + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch.map(device => device.token),
      data: { title, body, url: '/' },
      webpush: { headers: { TTL: '86400' } }
    });

    const invalidDevices = response.responses
      .map((result, index) => ({ result, device: batch[index] }))
      .filter(({ result }) => !result.success && invalidTokenCodes.has(result.error?.code))
      .map(({ device }) => device.ref.delete());

    await Promise.all(invalidDevices);
    logger.info('Push batch processed.', {
      successCount: response.successCount,
      failureCount: response.failureCount,
      removedInvalidTokens: invalidDevices.length
    });
  }
});
