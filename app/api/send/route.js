import { Resend } from 'resend';
import { render } from '@react-email/render';
import { EmailTemplate } from '../../_components/email-template';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { recipientEmail, senderName, fileName, fileId } = await request.json();

    if (!recipientEmail || !senderName || !fileName || !fileId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const emailHtml = await render(
      EmailTemplate({
        senderName,
        fileName,
        fileId,
      })
    );

    const { data, error } = await resend.emails.send({
      from: 'Envoi <Envoi@resend.dev>',
      to: [recipientEmail],
      subject: `${senderName} shared a file with you on Envoi`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Email sending error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}