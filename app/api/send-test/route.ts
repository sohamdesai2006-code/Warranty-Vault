import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        let productName = 'a product';
        try {
            const body = await request.json();
            if (body.productName) productName = body.productName;
        } catch (e) {
            // No body or invalid JSON, use fallback
        }

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'sohamdesai206@gmail.com',
            subject: `Warranty Expiring: ${productName}`,
            text: `Your warranty for ${productName} is expiring soon!`,
        });

        if (error) {
            return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json({ message: 'Email sent successfully', data });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
