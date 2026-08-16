def send_otp_email(to_email: str, otp_code: str, user_name: str = "Doctor"):
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        msg = "RESEND_API_KEY not set on Render"
        print(f"[!] {msg}")
        return False, msg

    try:
        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F2; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0A3D62; margin: 0;">EndoAI Medical System</h2>
                <p style="color: #8A97A8; font-size: 13px; margin-top: 4px;">Security Verification Code</p>
            </div>
            <p style="color: #0D1B2A; font-size: 14px;">Hello {user_name},</p>
            <p style="color: #4A5568; font-size: 14px; line-height: 1.5;">We received a request to verify your identity and reset your account password. Enter the 6-digit verification code below:</p>
            <div style="background: #F4F7FB; border: 2px dashed #00B4D8; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0A3D62; font-family: monospace;">{otp_code}</span>
            </div>
            <p style="color: #8A97A8; font-size: 12px; line-height: 1.4;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #E2E8F2; margin: 24px 0;" />
            <p style="color: #8A97A8; font-size: 11px; text-align: center; margin: 0;">© 2026 EndoAI · HIPAA Compliant Dental Imaging Platform</p>
        </div>
        """

        payload = json.dumps({
            "from":    "EndoAI Medical <onboarding@resend.dev>",
            "to":      [to_email],
            "subject": "Your EndoAI Verification Code",
            "html":    html_content,
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"[+] Email sent via Resend: {result}")
            return True, "Email delivered successfully"

    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read().decode("utf-8"))
        except Exception:
            err = {"message": str(e)}
        print(f"[!] Resend API error: {err}")
        return False, err.get("message", str(err))
    except Exception as e:
        print(f"[!] Email error: {e}")
        return False, str(e)
