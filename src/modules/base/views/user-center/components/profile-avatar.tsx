import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function getInitial(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() || '管'
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
  return (
    <Avatar size={size}>
      {avatar && <AvatarImage src={avatar} alt={`${name}的头像`} />}
      <AvatarFallback className="bg-primary text-primary-foreground">{getInitial(name)}</AvatarFallback>
    </Avatar>
  )
}
