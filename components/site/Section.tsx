import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TickList } from "@/components/ui/TickList";

/*
 * The parts a page of the site is built from, in the minimal look of 2026-11-13: a section's heading (a small label, a
 * heading and one sentence), a section of text beside a picture, and a row of short facts. The home page, the tool pages
 * and any later page (pricing, about) use these, so the look stays one system.
 */

type Head = {
  /** The heading's id, for the section's aria-labelledby. */
  id: string;
  title: ReactNode;
  /** A short label above the heading, in the brand colour. */
  kicker?: string;
  /** One or two sentences under the heading. */
  lead?: ReactNode;
  center?: boolean;
};

/** A section's heading: label, heading, one sentence. */
export function SectionHead({ id, title, kicker, lead, center = false }: Head) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : ""}>
      {kicker && <p className="kicker mb-2.5">{kicker}</p>}
      <h2 id={id} className="section-title">{title}</h2>
      {lead && <p className="mt-4 text-lg text-ink-2">{lead}</p>}
    </div>
  );
}

/** Text beside a picture: two columns on a wide screen, the text first on a narrow one. */
export function Feature({ id, kicker, title, lead, ticks, picture, pictureFirst = false, anchor, space = "mt-28" }: Head & {
  ticks?: string[];
  /** The picture: usually a `Card` drawn in HTML. Mark it aria-hidden when it only illustrates the text. */
  picture: ReactNode;
  /** Put the picture on the left on a wide screen. */
  pictureFirst?: boolean;
  /** An address for links to this section (`/#anchor`). */
  anchor?: string;
  /** The space above, when the section follows its own heading closely (`mt-16`). */
  space?: string;
}) {
  return (
    <section id={anchor} aria-labelledby={id} className={`${space} grid items-center gap-10 md:grid-cols-2 md:gap-14`}>
      <div className={pictureFirst ? "md:order-2" : ""}>
        <SectionHead id={id} kicker={kicker} title={title} lead={lead} />
        {ticks && <TickList items={ticks} className="mt-6" />}
      </div>
      <div className={pictureFirst ? "md:order-1" : ""}>{picture}</div>
    </section>
  );
}

export type Fact = { title: string; text: ReactNode; icon?: IconName };

/** A row of short facts between two hairlines: one column on a phone, two or more side by side on a wider screen. */
export function FactRow({ facts }: { facts: Fact[] }) {
  const cols = facts.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4 lg:divide-x" : "sm:grid-cols-3 sm:divide-x";
  return (
    <ul className={`mt-8 grid divide-y divide-line-soft border-y border-line-soft sm:divide-y-0 ${cols}`}>
      {facts.map((f) => (
        <li key={f.title} className="flex gap-3 py-6 sm:px-5 sm:first:pl-0">
          {f.icon && <Icon name={f.icon} className="ok-ink mt-0.5 h-5 w-5 shrink-0" />}
          <div>
            <p className="font-semibold">{f.title}</p>
            <p className="mt-1 text-[0.95rem] text-ink-2">{f.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
