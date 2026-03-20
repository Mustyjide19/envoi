import { Resend } from 'resend';
import { render } from '@react-email/render';
import { EmailTemplate } from '../../_components/email-template';
import { auth } from '../../../auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const emailMode = process.env.EMAIL_MODE?.trim().toLowerCase() || "live";
const devEmail = process.env.DEV_EMAIL?.trim();

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isVerified: true },
    });

    if (!user?.isVerified) {
      return Response.json(
        { error: 'You must verify your account before sharing files.' },
        { status: 403 }
      );
    }

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

    if (emailMode === "dev") {
      console.log("DEV email send:", {
        to: recipientEmail,
        deliveredTo: devEmail || recipientEmail,
        subject: `${senderName} shared a file with you on Envoi`,
        fileId,
      });

      return Response.json({
        success: true,
        mode: "dev",
        deliveredTo: devEmail || recipientEmail,
        message: devEmail
          ? `Dev email captured for ${devEmail}.`
          : `Dev email captured for ${recipientEmail}.`,
      });
    }

    if (!process.env.RESEND_API_KEY?.trim()) {
      return Response.json(
        { error: "Email delivery is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'Envoi <Envoi@resend.dev>',
      to: [recipientEmail],
      subject: `${senderName} shared a file with you on Envoi`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      const errorMessage =
        error.message === "API key is invalid"
          ? "Email delivery is not configured correctly."
          : error.message;

      return Response.json({ error: errorMessage }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Email sending error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
