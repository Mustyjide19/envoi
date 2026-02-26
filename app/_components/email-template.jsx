import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export const EmailTemplate = ({ senderName, fileName, fileId }) => {
  const sharedUrl = `http://localhost:3000/file-view/${fileId}`;
  
  return (
    <Html>
      <Head />
      <Preview>Someone shared a file with you on Envoi</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>📁 ENVOI</Heading>
            <Text style={headerSubtitle}>Secure Student File Sharing</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={title}>Someone shared a file with you! 🎉</Heading>
            
            <Text style={paragraph}>
              <strong style={senderHighlight}>{senderName}</strong> has shared a file with you using <strong>Envoi</strong>.
            </Text>

            <Section style={fileBox}>
              <Text style={fileLabel}>FILE NAME:</Text>
              <Text style={fileName}>📄 {fileName}</Text>
            </Section>

            <Text style={paragraph}>
              Click the button below to view and download the file:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={sharedUrl}>
                View File
              </Button>
            </Section>

            <Section style={securityBox}>
              <Text style={securityText}>
                🔒 Security Notice: This link provides access to view and download the shared file.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent because someone shared a file with you via Envoi.
            </Text>
            <Text style={footerCopyright}>
              © 2026 Envoi. All rights reserved. | Student File Sharing Platform
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f9fafb',
  fontFamily: 'Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const header = {
  backgroundColor: '#1e40af',
  padding: '30px',
  textAlign: 'center',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
};

const headerSubtitle = {
  color: '#e0e7ff',
  fontSize: '14px',
  margin: '10px 0 0 0',
};

const content = {
  padding: '40px 30px',
};

const title = {
  color: '#1f2937',
  fontSize: '24px',
  marginBottom: '20px',
};

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  marginBottom: '20px',
};

const senderHighlight = {
  color: '#1e40af',
};

const fileBox = {
  backgroundColor: '#f3f4f6',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '30px',
};

const fileLabel = {
  margin: '0 0 5px 0',
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
};

const fileName = {
  margin: '0',
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
};

const buttonContainer = {
  textAlign: 'center',
  marginBottom: '30px',
};

const button = {
  backgroundColor: '#1e40af',
  color: '#ffffff',
  padding: '14px 40px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '16px',
  display: 'inline-block',
};

const securityBox = {
  backgroundColor: '#fef3c7',
  padding: '15px',
  borderRadius: '8px',
  borderLeft: '4px solid #f59e0b',
};

const securityText = {
  margin: '0',
  color: '#92400e',
  fontSize: '14px',
};

const footer = {
  backgroundColor: '#f9fafb',
  padding: '30px',
  textAlign: 'center',
  borderTop: '1px solid #e5e7eb',
};

const footerText = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 10px 0',
};

const footerCopyright = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
};