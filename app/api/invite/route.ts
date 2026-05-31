import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { email, inviteLink, groupName } = await req.json();

        const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: `You're invited to join ${groupName}`,
            html: `
        <h2>You're invited!</h2>
        <p>You've been invited to join a group order.</p>

        <p>
          <a
            href="${inviteLink}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#D97757;
              color:white;
              text-decoration:none;
              border-radius:8px;
            "
          >
            Join Group Order
          </a>
        </p>

        <p>Or copy this link:</p>
        <p>${inviteLink}</p>
      `,
        });

        console.log('Invite email sent:', data);

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('Invite email error:', error);

        return NextResponse.json(
            {
                success: false,
                error: String(error),
            },
            { status: 500 }
        );
    }
}