import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/reui/primitives/avatar'

export function ProfileAvatar({
  name,
  avatar,
  size = 'lg',
}: {
  name: string
  avatar?: string | null
  size?: 'default' | 'sm' | 'lg'
}) {
  const tx = useTextTranslator('base.user-center.ui')
  function getInitial(name: string) {
    return Array.from(name.trim())[0]?.toUpperCase() || tx('管')
  }

  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <Avatar size={size}>
      {avatar && <AvatarImage src={avatar} alt={tx('{0}的头像', { '0': name })} />}
      <AvatarFallback className="bg-primary text-primary-foreground">{getInitial(name)}</AvatarFallback>
    </Avatar>
  )
}
