import { signInWithGoogleAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';

export function SignInButton() {
  return (
    <form action={signInWithGoogleAction}>
      <Button type="submit" size="sm">
        Entrar
      </Button>
    </form>
  );
}
