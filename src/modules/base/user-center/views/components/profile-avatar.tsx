import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/reui/primitives/avatar'

const tx = createTextTranslator('base.user-center.ui')

function getInitial(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() || tx('管')
}

export function ProfileAvatar({
  name,
  avatar,
  size = 'lg',
}: {
  name: string
  avatar?: string | null
  size?: 'default' | 'sm' | 'lg'
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <Avatar size={size}>
      {avatar && <AvatarImage src={avatar} alt={tx('{0}的头像', { '0': name })} />}
      <AvatarFallback className="bg-primary text-primary-foreground">{getInitial(name)}</AvatarFallback>
    </Avatar>
  )
}
