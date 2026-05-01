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

export interface InviteEmailProps {
  tenantName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresInDays: number;
}

export function InviteEmail({
  tenantName,
  inviterName,
  role,
  acceptUrl,
  expiresInDays,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;ve been invited to join {tenantName} on Family Guardian</Preview>
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
            You&apos;ve been invited to {tenantName}
          </Heading>
          <Text style={{ fontSize: '15px', lineHeight: 1.6, color: '#44403c' }}>
            {inviterName} invited you to join <strong>{tenantName}</strong> on Family Guardian as a{' '}
            <strong>{role}</strong>.
          </Text>
          <Button
            href={acceptUrl}
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
            Accept invite
          </Button>
          <Text style={{ fontSize: '13px', color: '#78716c', marginTop: '24px' }}>
            This invite expires in {expiresInDays} days. If you weren&apos;t expecting it, you can
            safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
