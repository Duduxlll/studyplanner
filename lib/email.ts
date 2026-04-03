import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? 'missing');
}

export async function sendVerificationCode(
  email: string,
  code: string,
  type: 'register' | 'reset'
) {
  const subject =
    type === 'register'
      ? 'Seu código de verificação — StudyPlanner'
      : 'Redefinir sua senha — StudyPlanner';

  const heading = type === 'register' ? 'Confirme seu email' : 'Redefinir senha';
  const body =
    type === 'register'
      ? 'Use o código abaixo para confirmar seu cadastro.'
      : 'Use o código abaixo para criar uma nova senha.';

  await getResend().emails.send({
    from: `StudyPlanner <${FROM}>`,
    to: email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:440px;margin:0 auto;padding:40px 24px;background:#18181b;color:#fff;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;width:56px;height:56px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:14px;align-items:center;justify-content:center;font-size:28px;">📚</div>
        </div>
        <h2 style="color:#a78bfa;margin:0 0 8px;font-size:22px;text-align:center;">${heading}</h2>
        <p style="color:#a1a1aa;font-size:14px;text-align:center;margin:0 0 32px;">${body}</p>
        <div style="background:#27272a;border:1px solid #3f3f46;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Código</p>
          <p style="color:#fff;font-size:36px;font-weight:700;letter-spacing:10px;margin:0;">${code}</p>
          <p style="color:#52525b;font-size:12px;margin:12px 0 0;">Válido por 15 minutos</p>
        </div>
        <p style="color:#52525b;font-size:12px;text-align:center;margin:0;">Se você não solicitou isso, ignore este email.</p>
      </div>
    `,
  });
}
