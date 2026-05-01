import { Button } from '@fg/ui';

export interface UserMenuProps {
  displayName: string;
  email: string | null;
}

export function UserMenu({ displayName, email }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <p className="font-medium leading-tight">{displayName}</p>
        {email ? <p className="text-xs text-muted-foreground">{email}</p> : null}
      </div>
      <form action="/api/auth/sign-out" method="post">
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
