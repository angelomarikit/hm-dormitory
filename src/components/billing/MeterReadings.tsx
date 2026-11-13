import { formatPeso } from '@/utils/money'
import { formatMeterRange, periodKey } from '@/services/utilityService'
import type { UtilityCharge } from '@/types/ops'

export function chargeForPeriod(charges: UtilityCharge[], periodStart: string) {
  return charges.find((item) => periodKey(item.period_start) === periodKey(periodStart) && item.applied_at) ?? null
}

export function MeterReadings({
  charge,
  electricityCentavos,
  waterCentavos,
}: {
  charge?: UtilityCharge | null
  electricityCentavos?: number
  waterCentavos?: number
}) {
  const electricRange = formatMeterRange(charge?.electricity_previous_reading, charge?.electricity_current_reading)
  const waterRange = formatMeterRange(charge?.water_previous_reading, charge?.water_current_reading)
  const showElectric = (electricityCentavos ?? 0) > 0 || Boolean(electricRange)
  const showWater = (waterCentavos ?? 0) > 0 || Boolean(waterRange)
  if (!showElectric && !showWater) return null

  return (
    <div className="mt-1 space-y-1 text-xs font-normal text-muted">
      {showElectric ? (
        <p>
          Electric {electricityCentavos ? formatPeso(electricityCentavos) : ''}
          {electricRange ? ` · reading ${electricRange}` : ''}
        </p>
      ) : null}
      {showWater ? (
        <p>
          Water {waterCentavos ? formatPeso(waterCentavos) : ''}
          {waterRange ? ` · reading ${waterRange}` : ''}
        </p>
      ) : null}
      {charge?.occupant_count ? (
        <p>Room meter split among {charge.occupant_count} boarder{charge.occupant_count === 1 ? '' : 's'}.</p>
      ) : null}
    </div>
  )
}
