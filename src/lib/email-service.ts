const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzS2fUP8m6TMccSJZnMMRRbqvSuY0NZO5Dxy3_16SWl29wWXBrrqaVwPzF_AvZZCXRT/exec'

interface EmailPayload {
  to: string
  subject: string
  html: string
}

/**
 * Sends an email using the provided Google Apps Script WebApp.
 */
export async function sendEmail(payload: EmailPayload) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: fetch to Google Script often follows redirects (302)
      redirect: 'follow',
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Email Service Error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Specifically sends a Judge Invitation
 */
export async function sendJudgeInvite(email: string, eventName: string, consoleUrl: string) {
  return sendEmail({
    to: email,
    subject: `Invitation to Judge: ${eventName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">You're Invited to Judge!</h2>
        <p>Hello,</p>
        <p>You have been invited to be a Judge for the <strong>${eventName}</strong> Egg Drop challenge.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${consoleUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Judge Console</a>
        </div>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link: ${consoleUrl}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Egg Drop Console | Powered by Edstellar</p>
      </div>
    `
  })
}

/**
 * Specifically sends a Password Reset link
 */
export async function sendPasswordReset(email: string, resetUrl: string) {
  return sendEmail({
    to: email,
    subject: 'Reset your Egg Drop Console password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your Egg Drop Console account (<strong>${email}</strong>).</p>
        <p>Click the button below to choose a new password. This link will expire in 1 hour.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #18181b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; font-size: 12px; color: #555;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Egg Drop Console | Powered by Edstellar</p>
      </div>
    `
  })
}

/**
 * Specifically sends Team Join Codes
 */
export async function sendTeamJoinCode(email: string, teamName: string, joinCode: string, appUrl: string) {
  return sendEmail({
    to: email,
    subject: `Join Code for ${teamName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #10b981;">Ready to Build?</h2>
        <p>Your team, <strong>${teamName}</strong>, is registered for the Egg Drop challenge.</p>
        <p>Use the following code to join your team console:</p>
        <div style="margin: 20px 0; padding: 20px; background-color: #f4f4f5; border-radius: 8px; text-align: center;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #18181b;">${joinCode}</span>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/team/join" style="background-color: #18181b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Enter Code Here</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Egg Drop Console | Powered by Edstellar</p>
      </div>
    `
  })
}
