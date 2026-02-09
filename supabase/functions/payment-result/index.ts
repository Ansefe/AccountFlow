// Supabase Edge Function: payment-result
// Simple HTML page shown after Lemon Squeezy Checkout completes
// Deploy: supabase functions deploy payment-result --no-verify-jwt

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const status = url.searchParams.get('status') || 'unknown'

  const isSuccess = status === 'success'
  const isCancelled = status === 'cancelled'
  const isPortalReturn = status === 'portal-return'

  const title = isSuccess
    ? 'Payment Successful!'
    : isCancelled
      ? 'Payment Cancelled'
      : isPortalReturn
        ? 'Portal Complete'
        : 'Payment Status'

  const message = isSuccess
    ? 'Your payment was processed successfully. You can close this tab and return to AccountFlow.'
    : isCancelled
      ? 'The payment was cancelled. You can close this tab and return to AccountFlow to try again.'
      : isPortalReturn
        ? 'You have finished managing your subscription. You can close this tab and return to AccountFlow.'
        : 'You can close this tab and return to AccountFlow.'

  const color = isSuccess ? '#00E676' : isCancelled ? '#FF5252' : '#6C5CE7'
  const icon = isSuccess ? '&#10003;' : isCancelled ? '&#10005;' : '&#9679;'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - AccountFlow</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0A0A0F;
      color: #F0F0F5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #16161F;
      border: 1px solid #232333;
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      max-width: 420px;
      width: 100%;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${color}20;
      color: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: bold;
      margin: 0 auto 20px;
    }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p { font-size: 14px; color: #A0A0B0; line-height: 1.5; }
    .brand {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #232333;
      font-size: 12px;
      color: #505060;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">AccountFlow</div>
  </div>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
})
