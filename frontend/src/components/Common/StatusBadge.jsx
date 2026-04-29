import { statusBadgeClass, statusDotClass } from '../../utils/helpers'

export default function StatusBadge({ status, showDot = true, size = 'sm' }) {
  const badgeClass = statusBadgeClass(status)
  const dotClass   = statusDotClass(status)
  return (
    <span className={badgeClass}>
      {showDot && <span className={dotClass} />}
      {status}
    </span>
  )
}
