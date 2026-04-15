import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { auth } from "../../../../../auth";
import verificationTokenUtils from "../../../../../utils/verificationToken";
import verificationEmail from "../../../../../utils/verificationEmail";
import authRedirect from "../../../../../utils/authRedirect";
import { VerificationEmailTemplate } from "../../../../_components/verification-email-template";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const returnTo = authRedirect.sanitizeRelativeRedirectPath(
      body?.returnTo,
      ""
    );

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        verificationEmailSentAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: "Your account is already verified." },
        { status: 400 }
      );
    }

    if (
      verificationTokenUtils.hasRecentVerificationEmailRequest(
        user.verificationEmailSentAt
      )
    ) {
      return NextResponse.json(
        { error: "Please wait before requesting another verification email." },
        { status: 429 }
      );
    }

    const emailSettings = verificationEmail.getVerificationEmailSettings();

    if (!emailSettings.configured) {
      console.error("Verification email delivery is not configured.", {
        hasResendApiKey: !!emailSettings.resendApiKey,
        hasEmailFromVerify: !!emailSettings.emailFromVerify,
        emailMode: emailSettings.emailMode,
      });

      return NextResponse.json(
        { error: "Verification email delivery is not configured." },
        { status: 500 }
      );
    }

    const verificationRecord =
      verificationTokenUtils.createVerificationTokenRecord();
    const emailHtml = await render(
      VerificationEmailTemplate({
        userName: user.name,
        verificationToken: verificationRecord.rawToken,
        returnTo,
      })
    );

    if (emailSettings.emailMode === "dev") {
      console.log("DEV verification email resend:", {
        to: user.email,
        deliveredTo: emailSettings.devEmail || user.email,
        userId: user.id,
        returnTo,
      });
    } else {
      const resend = new Resend(emailSettings.resendApiKey);
      const { error } = await resend.emails.send(
        verificationEmail.buildVerificationEmailPayload({
          from: emailSettings.emailFromVerify,
          recipientEmail: user.email,
          userName: user.name,
          emailHtml,
        })
      );

      if (error) {
        console.error("Resend verification email error:", error);
        return NextResponse.json(
          { error: "Failed to send verification email right now." },
          { status: 500 }
        );
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: verificationTokenUtils.buildVerificationTokenUpdate(
        verificationRecord
      ),
    });

    return NextResponse.json({
      success: true,
      message: verificationTokenUtils.VERIFICATION_EMAIL_GENERIC_MESSAGE,
    });
  } catch (error) {
    console.error("Verification email resend error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email." },
      { status: 500 }
    );
  }
}
