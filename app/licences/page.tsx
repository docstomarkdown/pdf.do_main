import type { Metadata } from "next";
import { Disclosure } from "@/components/ui/Disclosure";
import { TextLink } from "@/components/ui/TextLink";
import { shippedLicences } from "@/lib/licences";

export const metadata: Metadata = {
  title: "Licences",
  description: "The open-source software and the font pdf.do is built with, and the licence each one is used under.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 leading-relaxed";

// The SIL Open Font License, version 1.1, as published at https://openfontlicense.org. Google Sans is used under it.
const OFL = `Copyright 2025 The Google Sans Project Authors

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.`;

export default function Licences() {
  const packages = shippedLicences();
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Licences</h1>
      <p className={p}>
        pdf.do is built on open-source software and one open font. Each is used under its own licence, and this page lists them with the licence text each one carries.
        Nothing with a copyleft licence is included in what your browser downloads. <TextLink href="/how-it-works">How it works and your privacy</TextLink> explains what the site does with your files.
      </p>

      <h2 className={h2}>Font</h2>
      <p className={p}>
        The text on this site is set in Google Sans, copyright 2025 The Google Sans Project Authors, used under the SIL Open Font License, Version 1.1. The font is
        served from this site, not from another host. &ldquo;Google&rdquo; and &ldquo;Google Sans&rdquo; are trademarks of Google LLC, and their use here does not mean Google endorses pdf.do.
      </p>
      <div className="mt-4">
        <Disclosure summary="SIL Open Font License, Version 1.1: the full text">
          {/* A box that scrolls must be reachable by keyboard, so it can take focus. */}
          <pre className="licence-text" tabIndex={0} role="region" aria-label="SIL Open Font License, Version 1.1">{OFL}</pre>
        </Disclosure>
      </div>

      <h2 className={h2}>Software</h2>
      <p className={p}>These packages are part of what your browser downloads when you use a tool, listed with the licence each declares.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="licence-table">
          <caption className="sr-only">Software that ships to your browser, with version and licence</caption>
          <thead>
            <tr className="border-b border-line text-ink-3">
              <th scope="col" className="py-2 pr-4 font-semibold">Package</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Version</th>
              <th scope="col" className="py-2 font-semibold">Licence</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.name} className="border-b border-line-soft">
                <th scope="row" className="py-2 pr-4 font-medium">{pkg.name}</th>
                <td className="py-2 pr-4 text-ink-2">{pkg.version}</td>
                <td className="py-2 text-ink-2">{pkg.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={h2}>Licence texts</h2>
      <div className="mt-4 grid gap-3">
        {packages.filter((pkg) => pkg.text !== "").map((pkg) => (
          <Disclosure key={pkg.name} summary={`${pkg.name}, ${pkg.license}`}>
            <pre className="licence-text" tabIndex={0} role="region" aria-label={`Licence text of ${pkg.name}`}>{pkg.text}</pre>
          </Disclosure>
        ))}
      </div>

      <p className="mt-10"><TextLink href="/">Back to the tools</TextLink></p>
    </article>
  );
}
