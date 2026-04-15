import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import appUrl from "../../utils/appUrl";
import passwordResetToken from "../../utils/passwordResetToken";

export const ResetPasswordEmailTemplate = ({ userName, resetToken }) => {
  const resetUrl = appUrl.buildResetPasswordUrl(
    resetToken,
    appUrl.getServerAppUrl()
  );
  const expiresInMinutes = Math.round(
    passwordResetToken.PASSWORD_RESET_TOKEN_TTL_MS / 60000
  );

  return (
    <Html>
      <Head />
      <Preview>Reset your Envoi password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>ENVOI</Heading>
            <Text style={headerSubtitle}>Secure Student File Sharing</Text>
          </Section>

          <Section style={content}>
            <Heading style={title}>Reset your password</Heading>

            <Text style={paragraph}>
              {userName ? `Hi ${userName},` : "Hi,"}
            </Text>

            <Text style={paragraph}>
              We received a request to reset the password for your Envoi account.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Text style={paragraph}>
              This link expires in {expiresInMinutes} minutes. If you did not request
              a password reset, you can ignore this email and your password will stay
              the same.
            </Text>

            <Text style={linkText}>
              If the button does not work, copy and paste this link into your browser:
            </Text>
            <Text style={urlText}>{resetUrl}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#f9fafb",
  fontFamily: "Arial, sans-serif",
  padding: "24px 0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 6px rgba(15, 23, 42, 0.08)",
};

const header = {
  backgroundColor: "#1d4ed8",
  padding: "28px 32px",
  textAlign: "center",
};

const headerTitle = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
};

const headerSubtitle = {
  color: "#dbeafe",
  fontSize: "14px",
  margin: "8px 0 0 0",
};

const content = {
  padding: "36px 32px",
};

const title = {
  color: "#0f172a",
  fontSize: "24px",
  marginBottom: "20px",
};

const paragraph = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  marginBottom: "18px",
};

const buttonContainer = {
  textAlign: "center",
  margin: "28px 0",
};

const button = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  padding: "14px 36px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "16px",
  display: "inline-block",
};

const linkText = {
  color: "#475569",
  fontSize: "14px",
  marginBottom: "8px",
};

const urlText = {
  color: "#1d4ed8",
  fontSize: "14px",
  lineHeight: "1.6",
  wordBreak: "break-all",
};
