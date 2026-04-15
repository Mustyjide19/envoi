import { Resend } from 'resend';
import { render } from '@react-email/render';
import { EmailTemplate } from '../../_components/email-template';
import { auth } from '../../../auth';
import { PrismaClient } from '@prisma/client';
import shareEmail from '../../../utils/shareEmail';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, isVerified: true, shareEmailSentAt: true },
    });

    if (!user?.isVerified) {
      return Response.json(
        { error: 'You must verify your account before sharing files.' },
        { status: 403 }
      );
    }

    if (shareEmail.hasRecentShareEmailRequest(user.shareEmailSentAt)) {
      return Response.json(
        { error: 'Please wait before sending another share email.' },
        { status: 429 }
      );
    }

    const { recipientEmail, senderName, fileName, fileId } = await request.json();
    const emailSettings = shareEmail.getShareEmailSettings();

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

    if (emailSettings.emailMode === "dev") {
      console.log("DEV email send:", {
        to: recipientEmail,
        deliveredTo: emailSettings.devEmail || recipientEmail,
        subject: `${senderName} shared a file with you on Envoi`,
        fileId,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { shareEmailSentAt: new Date() },
      });

      return Response.json({
        success: true,
        mode: "dev",
        deliveredTo: emailSettings.devEmail || recipientEmail,
        message: emailSettings.devEmail
          ? `Dev email captured for ${emailSettings.devEmail}.`
          : `Dev email captured for ${recipientEmail}.`,
      });
    }

    if (!emailSettings.configured) {
      console.error("Share email delivery is not configured.", {
        hasResendApiKey: !!emailSettings.resendApiKey,
        hasEmailFromShare: !!emailSettings.emailFromShare,
        emailMode: emailSettings.emailMode,
      });

      return Response.json(
        { error: "Share email delivery is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(emailSettings.resendApiKey);
    const { data, error } = await resend.emails.send(
      shareEmail.buildShareEmailPayload({
        from: emailSettings.emailFromShare,
        recipientEmail,
        senderName,
        emailHtml,
      })
    );

    if (error) {
      console.error('Resend share email error:', error);

      return Response.json(
        { error: "Failed to send share email right now." },
        { status: 500 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { shareEmailSentAt: new Date() },
    });

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Share email sending error:', error);
    return Response.json(
      { error: "Failed to send share email right now." },
      { status: 500 }
    );
  }
}
