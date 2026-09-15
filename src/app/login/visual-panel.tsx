import { Slideshow } from "@/app/login/slideshow";

/**
 * Right half of the sign-in card — hidden on phones, where it would push the
 * form below the fold. See `slideshow.tsx` for what it shows.
 */
export function VisualPanel() {
  return (
    <aside className="relative hidden p-3 lg:block">
      <Slideshow />
    </aside>
  );
}
