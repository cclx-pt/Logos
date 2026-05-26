import { HomeHero } from '@/components/site/home-hero';
import { HomeMotto } from '@/components/site/home-motto';
import { HomePresentationVideo } from '@/components/site/home-presentation-video';
import { HomeTestimonials } from '@/components/site/home-testimonials';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <>
      <HomeHero isAuthenticated={user !== null} ctaHref="/conteudos" />
      <HomeMotto />
      <HomePresentationVideo />
      <HomeTestimonials />
    </>
  );
}
