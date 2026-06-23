import { Router } from 'express';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
});

export const contactRouter = Router();

contactRouter.post('/', async (request, response) => {
  const parsed = contactSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'Please provide a valid name, email, and message.' });
    return;
  }

  const { name, email, message } = parsed.data;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.CONTACT_FROM_EMAIL ?? process.env.SMTP_USER,
    to: process.env.CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `SewornaAI contact from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
  });

  response.status(202).json({ ok: true });
});
