import * as admin from 'firebase-admin';

import {
  MINIMUM_NOTIFICATION_DELAY_UNTIL_FURTHER_ENGAGEMENT_WITH_OPEN_ENTRIES_DAYS,
  MAXIMUM_ALLOWED_AGE_FOR_ENTRY_TO_BE_ASK_FOR_RE_ENGAGEMENT_DAYS,
  SEND_EMAILS,
  sendingMailsDisabledLogMessage,
} from '@config';

import { sendEmailToUser } from '@utilities/email/sendEmailToUser';

import { AskForHelpCollectionEntry } from '@interface/collections/AskForHelpCollectionEntry';
import { SendgridTemplateData } from '@interface/email/SendgridTemplateData';
import { CollectionName } from '@enum/CollectionName';

export async function searchAndSendNotificationEmailsForOpenOffersWithoutAnswers(): Promise<void> {
  try {
    const db = admin.firestore();
    const askForHelpSnapsWithoutAnswers = await db.collection(CollectionName.AskForHelp)
      .where('d.timestamp', '<=', Date.now() - MAXIMUM_ALLOWED_AGE_FOR_ENTRY_TO_BE_ASK_FOR_RE_ENGAGEMENT_DAYS * 24 * 60 * 60 * 1000)
      .where('d.timestamp', '<=', Date.now() - MINIMUM_NOTIFICATION_DELAY_UNTIL_FURTHER_ENGAGEMENT_WITH_OPEN_ENTRIES_DAYS * 24 * 60 * 60 * 1000)
      .where('d.responses', '==', 0)
      .limit(3)
      .get();

    // eslint-disable-next-line no-console
    console.log('askForHelpSnapsWithoutAnswers: Requests to execute', askForHelpSnapsWithoutAnswers.docs.length);
    // RUN SYNC
    const asyncOperations = askForHelpSnapsWithoutAnswers.docs.map(async (askForHelpSnap) => {
      const askForHelpSnapData = askForHelpSnap.data() as AskForHelpCollectionEntry;
      const askForHelpId = askForHelpSnap.id;
      // eslint-disable-next-line no-console
      console.log('askForHelpId', askForHelpId);
      // eslint-disable-next-line no-console
      if (SEND_EMAILS) {
        const templateId = 'd-46ce2fad54b84395abd2d615c01c69cb';
        const templateData: SendgridTemplateData = {
          subject: 'QuarantäneHeld*innen - Benötigst du weiterhin Hilfe?',
          request: askForHelpSnapData.d.request,
          location: askForHelpSnapData.d.location,
          link: `https://www.quarantaenehelden.org/#/offer-help/${askForHelpId}`,
          requestMoreHelpLink: `https://www.quarantaenehelden.org/#/offer-help/${askForHelpId}?more-help`,
          deleteLink: `https://www.quarantaenehelden.org/#/offer-help/${askForHelpId}?deleteLink`,
        };
        const email = await sendEmailToUser(askForHelpSnapData.d.uid, templateId, templateData);
        return email;
      }
      // eslint-disable-next-line no-console
      console.log(sendingMailsDisabledLogMessage);
      return null;
    });
    const result = await Promise.all(asyncOperations);
    console.log('result', result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}
