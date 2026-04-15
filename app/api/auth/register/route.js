import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { render } from "@react-email/render";
import verificationTokenUtils from "../../../../utils/verificationToken";
import verificationEmail from "../../../../utils/verificationEmail";
import authRedirect from "../../../../utils/authRedirect";
import passwordValidation from "../../../../utils/passwordValidation";
import { VerificationEmailTemplate } from "../../../_components/verification-email-template";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const callbackUrl = authRedirect.sanitizeRelativeRedirectPath(
      body?.callbackUrl,
      ""
    );

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const passwordErrors =
      passwordValidation.getPasswordValidationErrors(password);
    if (passwordErrors.length > 0) {
      return NextResponse.json(
        {
          error: `Password must contain ${passwordErrors.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationRecord =
      verificationTokenUtils.createVerificationTokenRecord();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isVerified: false,
        verificationTokenHash: verificationRecord.verificationTokenHash,
        verificationTokenExpiresAt: verificationRecord.verificationTokenExpiresAt,
        verificationEmailSentAt: null,
      },
    });

    const emailSettings = verificationEmail.getVerificationEmailSettings();
    let verificationEmailSent = false;

    if (!emailSettings.configured) {
      console.error("Verification email delivery is not configured.", {
        hasResendApiKey: !!emailSettings.resendApiKey,
        hasEmailFromVerify: !!emailSettings.emailFromVerify,
        emailMode: emailSettings.emailMode,
      });
    } else {
      const emailHtml = await render(
        VerificationEmailTemplate({
          userName: user.name,
          verificationToken: verificationRecord.rawToken,
          returnTo: callbackUrl,
        })
      );

      if (emailSettings.emailMode === "dev") {
        console.log("DEV verification email send:", {
          to: user.email,
          deliveredTo: emailSettings.devEmail || user.email,
          userId: user.id,
          callbackUrl,
        });
        verificationEmailSent = true;
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
        } else {
          verificationEmailSent = true;
        }
      }
    }

    if (verificationEmailSent) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationEmailSentAt: new Date() },
      });
    }

    return NextResponse.json(
      {
        message: verificationEmailSent
          ? "Account created successfully. Check your email to verify your account."
          : "Account created successfully. You can resend your verification email from the verification page.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        verificationEmailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
