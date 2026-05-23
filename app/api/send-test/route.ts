import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        // Read the user's access token from the Authorization header
        const authHeader = request.headers.get('Authorization');
        const accessToken = authHeader?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized: No access token provided.' }, { status: 401 });
        }

        // Create a Supabase client authenticated as the user
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: { Authorization: `Bearer ${accessToken}` },
                },
            }
        );

        // Verify the user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid session.' }, { status: 401 });
        }

        const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Customer';

        // Calculate the date range: today → 7 days from now
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const todayISO = today.toISOString().split('T')[0];
        const sevenDaysISO = sevenDaysLater.toISOString().split('T')[0];

        // Query warranties expiring in the next 7 days for this user
        const { data: warranties, error: dbError } = await supabase
            .from('warranties')
            .select('id, name, expiry_date')
            .eq('user_id', user.id)
            .gte('expiry_date', todayISO)
            .lte('expiry_date', sevenDaysISO);

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        if (!warranties || warranties.length === 0) {
            return NextResponse.json({ message: 'No warranties expiring in the next 7 days.', emailsSent: 0 });
        }

        // Send an email for each expiring warranty
        let emailsSent = 0;
        const results = [];

        for (const warranty of warranties) {
            const formattedDate = new Date(warranty.expiry_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            const htmlContent = `
<h3>Warranty Expiry Alert</h3>
<p>Hello <strong>${userName}</strong>,<br />
This is a reminder that coverage for your <strong>${warranty.name}</strong> will end on <strong>${formattedDate}</strong>. Please ensure the item is working properly before the deadline.</p>
<p>Best regards,<br />
<strong>The Warranty Vault Team</strong></p>
<hr style='border: none; border-top: 1px solid #eaeaea; margin: 20px 0;' />
<p style='font-size: 12px; color: #666666; font-style: italic;'>
Note: This is an automated, system-generated email. Please do not reply directly to this message.
</p>
            `;

            const { data, error } = await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: user.email!,
                subject: `⚠️ Warranty Expiring Soon: ${warranty.name}`,
                text: `Hey, your warranty for ${warranty.name} is expiring on ${formattedDate}!`,
                html: htmlContent,
            });

            if (error) {
                results.push({ product: warranty.name, status: 'failed', error });
            } else {
                emailsSent++;
                results.push({ product: warranty.name, status: 'sent', id: data?.id });
            }
        }

        return NextResponse.json({
            message: `Done! ${emailsSent} of ${warranties.length} email(s) sent.`,
            emailsSent,
            total: warranties.length,
            results,
        });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
