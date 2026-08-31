import { Reveal } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""} ${className ?? ""}`}
    >
      <Reveal>
        <span className="inline-block text-xs font-semibold tracking-[0.25em] text-accent-400 uppercase">
          {eyebrow}
        </span>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.1] text-balance">
          {title}
        </h2>
      </Reveal>
      {description ? (
        <Reveal delay={0.16}>
          <p className="mt-5 text-base sm:text-lg text-mist-400 leading-relaxed text-balance">
            {description}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
