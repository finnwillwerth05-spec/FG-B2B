import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';

export interface ResetPasswordEmailProps {
  resetUrl: string;
  expiresInMinutes: number;
}

export function ResetPasswordEmail({ resetUrl, expiresInMinutes }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Family Guardian password</Preview>
      <Body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#fafaf9',
          padding: '24px',
        }}
      >
        <Container
          style={{
            maxWidth: '480px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #e7e5e4',
          }}
        >
          <Heading style={{ fontSize: '20px', margin: '0 0 16px 0', color: '#1c1917' }}>
            Reset your password
          </Heading>
          <Text style={{ fontSize: '15px', lineHeight: 1.6, color: '#44403c' }}>
            We received a request to reset your Family Guardian password. Click below to choose a
            new one.
          </Text>
          <Button
            href={resetUrl}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Reset password
          </Button>
          <Text style={{ fontSize: '13px', color: '#78716c', marginTop: '24px' }}>
            This link expires in {expiresInMinutes} minutes. If you didn&apos;t request a reset, you
            can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
