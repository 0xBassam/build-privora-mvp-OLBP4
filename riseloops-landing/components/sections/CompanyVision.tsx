import { Reveal } from "../Reveal";

export function CompanyVision() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <p className="font-display text-2xl sm:text-4xl md:text-5xl font-medium leading-[1.2] text-balance">
            We don&apos;t build software for the sake of software.
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-3 font-display text-2xl sm:text-4xl md:text-5xl font-medium leading-[1.2] text-accent-400 text-balance">
            We build products that solve difficult problems.
          </p>
        </Reveal>
        <Reveal delay={0.24} className="mt-8">
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-mist-400 leading-relaxed text-balance">
            RiseLoops exists to identify complex operational challenges and
            transform them into secure, intelligent, beautifully designed
            technology products.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
