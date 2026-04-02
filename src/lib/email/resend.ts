import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendOTPEmailParams {
  to: string;
  studentName: string;
  electionTitle: string;
  otp: string;
  expiresInMinutes: number;
}

export async function sendOTPEmail(
  params: SendOTPEmailParams,
): Promise<boolean> {
  const { to, studentName, electionTitle, otp, expiresInMinutes } = params;

  try {
    const { error } = await resend.emails.send({
      from: `OSEM Secure Vote <onboarding@resend.dev>`,
      to,
      subject: `Your verification code for ${electionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your OTP Code</title>
          </head>
          <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background:#0B1E35;padding:28px 40px;">
                        <p style="margin:0;color:#F9A825;font-size:13px;font-weight:bold;letter-spacing:2px;">OSEM TECHNOLOGIES</p>
                        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:bold;">Secure Vote Platform</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:36px 40px;">
                        <p style="margin:0 0 8px;color:#2C3E50;font-size:16px;">Hello <strong>${studentName}</strong>,</p>
                        <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
                          You requested a verification code to vote in:
                        </p>
                        <p style="margin:0 0 28px;color:#0B1E35;font-size:15px;font-weight:bold;">
                          ${electionTitle}
                        </p>

                        <!-- OTP Box -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="background:#f4f6fb;border:2px dashed #0B1E35;border-radius:8px;padding:28px;">
                              <p style="margin:0 0 8px;color:#555;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Your verification code</p>
                              <p style="margin:0;color:#0B1E35;font-size:42px;font-weight:bold;letter-spacing:12px;">${otp}</p>
                              <p style="margin:12px 0 0;color:#e74c3c;font-size:12px;">
                                Expires in ${expiresInMinutes} minutes
                              </p>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:28px 0 0;color:#555;font-size:13px;line-height:1.6;">
                          Enter this code on the verification page to continue voting.
                          Do not share this code with anyone.
                        </p>
                      </td>
                    </tr>

                    <!-- Warning -->
                    <tr>
                      <td style="background:#fff8e1;padding:16px 40px;border-top:1px solid #f0e0a0;">
                        <p style="margin:0;color:#7d6608;font-size:12px;line-height:1.6;">
                          <strong>Did not request this?</strong> Ignore this email.
                          Your account is safe — no action is needed.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background:#f4f6fb;padding:20px 40px;border-top:1px solid #e8edf5;">
                        <p style="margin:0;color:#aaa;font-size:11px;text-align:center;">
                          OSEM Technologies · Secure Voting Platform<br>
                          This is an automated message — do not reply
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("[sendOTPEmail] Resend error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[sendOTPEmail] Unexpected error:", error);
    return false;
  }
}
