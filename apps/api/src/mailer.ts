import { createTransport } from 'nodemailer';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/**
 * `log` prints messages for local development only (they contain links with
 * secrets); production requires SMTP, enforced at startup in main.ts.
 */
export function createMailer(config: {
  MAIL_TRANSPORT: 'log' | 'smtp';
  SMTP_URL?: string | undefined;
  MAIL_FROM: string;
}): Mailer {
  if (config.MAIL_TRANSPORT === 'log')
    return {
      async send(mail) {
        console.info(
          `\n--- E-mail de développement pour ${mail.to} ---\n${mail.subject}\n\n${mail.text}\n---\n`,
        );
      },
    };
  if (!config.SMTP_URL) throw new Error('Invalid environment: SMTP_URL');
  const transport = createTransport(config.SMTP_URL);
  return {
    async send(mail) {
      await transport.sendMail({ from: config.MAIL_FROM, ...mail });
    },
  };
}
