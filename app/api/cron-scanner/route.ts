import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // Create a Supabase client using the Service Role Key to bypass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Calculate the date range: today → 7 days from now
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const todayISO = today.toISOString().split('T')[0];
        const sevenDaysISO = sevenDaysLater.toISOString().split('T')[0];

        console.log(`[DEBUG] Looking for warranties expiring between: ${todayISO} and ${sevenDaysISO}`);

        // Query warranties expiring in the next 7 days across the platform
        const { data: warranties, error: dbError } = await supabase
            .from('warranties')
            .select('id, name, expiry_date, user_id')
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
            console.log(`[DEBUG] Found warranty: ${warranty.name}, raw expiry_date: ${warranty.expiry_date}`);

            // Fetch user info for this warranty using Supabase Admin Auth API
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(warranty.user_id);
            if (userError) {
                console.error(`Error fetching user details for user_id ${warranty.user_id}:`, userError.message);
            }

            const user = userData?.user;
            if (user?.user_metadata?.notifications === false) {
                console.log(`Skipping warranty ${warranty.id}: User ${user.email} has disabled email notifications.`);
                continue;
            }

            const userName = user?.user_metadata?.full_name || 'Customer';
            const userEmail = user?.email;

            if (!userEmail) {
                console.error(`Skipping warranty ${warranty.id}: No email found for user_id ${warranty.user_id}`);
                continue;
            }

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
                to: userEmail,
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
