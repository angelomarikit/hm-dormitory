export interface PaymentInstructions {
  payment_qr_url: string | null
  payment_account_name: string | null
  payment_account_number: string | null
  payment_notes: string | null
}

export function PaymentQrCard({
  instructions,
  eyebrow = 'Pay using this account',
}: {
  instructions: PaymentInstructions
  eyebrow?: string
}) {
  const hasQr = Boolean(instructions.payment_qr_url)
  const hasText =
    Boolean(instructions.payment_account_name) ||
    Boolean(instructions.payment_account_number) ||
    Boolean(instructions.payment_notes)

  if (!hasQr && !hasText) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-8 text-center text-sm text-muted">
        No payment QR or account details have been set yet.
      </div>
    )
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_40px_-32px_rgba(10,10,10,0.4)]">
      <div className="grid gap-0 md:grid-cols-[14rem_1fr]">
        <div className="flex items-center justify-center bg-[#faf8f4] p-6">
          {hasQr ? (
            <img
              src={instructions.payment_qr_url ?? ''}
              alt="Payment QR code"
              className="h-48 w-48 rounded-xl border border-line bg-white object-contain p-3"
            />
          ) : (
            <p className="text-sm text-muted">QR not uploaded</p>
          )}
        </div>
        <div className="px-6 py-6">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">{eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl">Scan to pay</h2>
          <p className="mt-2 text-sm text-muted">
            Use this QR, or send to the account below if the code does not load.
          </p>
          <dl className="mt-5 grid gap-3 text-sm">
            <div>
              <dt className="text-xs tracking-[0.14em] text-muted uppercase">Account name</dt>
              <dd className="mt-1 font-medium">{instructions.payment_account_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.14em] text-muted uppercase">Account number</dt>
              <dd className="mt-1 font-medium tracking-wide">{instructions.payment_account_number || '—'}</dd>
            </div>
            {instructions.payment_notes ? (
              <div>
                <dt className="text-xs tracking-[0.14em] text-muted uppercase">Notes</dt>
                <dd className="mt-1 whitespace-pre-line text-muted">{instructions.payment_notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </article>
  )
}
