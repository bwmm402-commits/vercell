import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS Başlıkları
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST istekleri kabul edilir.' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-posta adresi gereklidir.' });
  }

  // 6 haneli rastgele kod üret
  const resetCode = Math.floor(100000 + Math.random() * 900000);

  try {
    await resend.emails.send({
      from: 'M53G Studio <onboarding@resend.dev>',
      to: email,
      subject: 'M53G — Şifre Sıfırlama Kodu',
      html: `<p>Merhaba,</p><p>Şifre sıfırlama kodunuz: <strong>${resetCode}</strong></p>`
    });

    return res.status(200).json({ success: true, message: 'Kod gönderildi!' });
  } catch (error) {
    return res.status(500).json({ error: 'Mail gönderilirken hata oluştu.', details: error.message });
  }
}
