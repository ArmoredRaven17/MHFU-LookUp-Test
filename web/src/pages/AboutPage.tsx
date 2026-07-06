const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function AboutPage() {
  return (
    <div style={{ overflowY: 'auto', height: '100%', background: 'transparent' }}>
      <div style={{ maxWidth: 720, padding: '24px 24px 40px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
          <img src={`${BASE}/assets/Misc/about_icon.png`} alt="" width={52} height={52}
               style={{ objectFit: 'contain', flexShrink: 0 }}
               onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>About</h2>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, margin: '0 0 20px' }}>
          MHFU LookUp is an unofficial reference tool for Monster Hunter Freedom Unite (MHP2G).
        </p>

        <Divider />

        {/* AI Disclaimer */}
        <Section title="AI Use Disclaimer">
          <Li>Built with substantial assistance from AI (Anthropic's Claude), used to write code and to parse, organize, and cross-check the data.</Li>
          <Li>The data was validated against the sources listed below, but errors may remain — please verify any critical values against the originals before relying on them.</Li>
        </Section>

        <Divider />

        {/* ROM extraction — now the majority of the app's factual values */}
        <Section title="Extracted Directly from the ROM">
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 10px', lineHeight: 1.6 }}>
            A large and growing share of this app's data no longer comes from any community source — it's
            decrypted and reverse-engineered straight out of MHFU's own game files, so it can't drift from
            what the game actually does.
          </p>

          <Li><strong>Item rarity, sell value, carry/stack size, and descriptions</strong> — the game's internal item-master table, which wasn't documented anywhere before this.</Li>
          <Li><strong>Item, location/map, weapon-type, and Guild Card award icons</strong> — dumped from the game's own sprite sheets and re-tinted using the game's own colour palette.</Li>
          <Li><strong>All armor recipes and stats</strong> (defense, resistances, deco slots, forge cost, max defense, and skill points, all 5 slots) — decoded from the game's static forge tables.</Li>
          <Li><strong>Monster hitzones</strong> — all 83 monsters, cross-checked byte-for-byte against the game's own per-part damage tables.</Li>
          <Li><strong>Monster carve, capture, and break/wound-part rewards</strong> — decoded from the game's reward-data tables.</Li>
          <Li><strong>Treasure-Hunt turn-in points.</strong></Li>
          <Li><strong>Gathering-area drop rates</strong> — Possibly the first time these values have been published anywhere; no community source had them.</Li>
          <Li><strong>Pokke Farm rates</strong> for Mining Points, Insect Thicket, Mushroom Tree, Bee Hive, Bomb Mining, Bug Tree, Great Sword Cave, and the Casting Machine — plus confirmation that Trenya's returns are drawn uniformly at random, with no hidden per-item rates.</Li>
          <Li><strong>Weapon damage constants</strong> — sharpness modifiers, element/status multipliers, and the per-class "True Raw" divisor shown in the Weapons tab.</Li>

          <p style={{ color: 'var(--muted)', fontSize: 12, margin: '4px 0 10px', lineHeight: 1.5 }}>
            Still open: Pokke Farm's Field Rows per-crop rates and the Fishing Pier's full per-spot catch
            pools haven't been fully extracted yet — those sections still reflect the best community
            information available.
          </p>
          <p style={{ color: 'var(--text)', fontSize: 13, margin: 0 }}>
            The full method, tooling, and ROM addresses are documented for anyone who wants the details —
            see <code>docs/rom-data-extraction.md</code> in the source repository.
          </p>
        </Section>

        <Divider />

        {/* Data Sources still from community references */}
        <Section title="Data Sources & Attribution">
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 10px', lineHeight: 1.6 }}>
            Everything not listed above as ROM-extracted is compiled from openly available community
            sources. The underlying values are factual game data; English names follow Capcom's official
            localization.
          </p>

          <Li><strong>Monster ailment tolerances</strong> and <strong>Veggie Elder trades</strong> — MHP2G @wiki: <A href="https://w.atwiki.jp/mhp2g/">w.atwiki.jp/mhp2g</A></Li>
          <Li><strong>Quests, Training School quest objectives, decorations, weapon sharpness/stats, combinations, treasure "where to find" text, kitchen recipes, Felyne Whim skills, Felyne Comrades, and Trenya's item lists</strong> — Monster Hunter Wiki (Fandom), used under the CC BY-SA license: <A href="https://monsterhunter.fandom.com/wiki/Monster_Hunter_Wiki">monsterhunter.fandom.com</A></Li>
          <Li><strong>Weapon data</strong> (attack, sharpness, slots, affinity, materials, upgrade trees, rarity, and the MHP2G-exclusive "dummy" weapons) — vallode/mhfu-blacksmith (MIT License, © 2022 vallode): <A href="https://github.com/vallode/mhfu-blacksmith">github.com/vallode/mhfu-blacksmith</A></Li>
          <Li><strong>Monster icons</strong> — from the Monster Hunter Wiki (Fandom); the underlying artwork is © Capcom.</Li>
          <Li><strong>Element & status value icons</strong> — from the Monster Hunter Wiki (Fandom); the underlying artwork is © Capcom.</Li>
          <Li><strong>Hunting Horn note icons & sheet music</strong> — Monster Hunter Wiki (Fandom), "Hunting Horn Sheet Music" page; note artwork © Capcom: <A href="https://monsterhunter.fandom.com/wiki/Hunting_Horn_Sheet_Music_(file)">monsterhunter.fandom.com</A></Li>
          <Li><strong>Guild Card award names, descriptions & unlock conditions</strong> — Monster Hunter Wiki (monsterhunterwiki.org), CC BY-SA 4.0 (the award icons themselves are ROM-extracted — see above; icon artwork © Capcom): <A href="https://monsterhunterwiki.org/wiki/MHFU/Items">monsterhunterwiki.org</A></Li>
          <Li><strong>Armor-skill category groupings</strong> — the skills and their data are the app's own; only the category sort order follows <em>Athena's Armor Set Search</em> for MHFU, so users of both tools see familiar groupings.</Li>
          <Li><strong>Bowgun ammo stats</strong> — from the <em>Bowgun Damage Guide (PSP)</em> by VampireCosmonaut, published on GameFAQs: <A href="https://gamefaqs.gamespot.com">gamefaqs.gamespot.com</A></Li>

          <p style={{ color: 'var(--muted)', fontSize: 11, margin: '10px 0 0', lineHeight: 1.5 }}>
            Reused Fandom wiki content is licensed CC BY-SA; the data set derived from it is shared under the same terms (attribution + share-alike).
          </p>
        </Section>

        <Divider />

        {/* Community guides used as references / cross-checks while decoding the ROM */}
        <Section title="Community Guides Used While Decoding the ROM">
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 10px', lineHeight: 1.6 }}>
            These guides didn't supply the final numbers shown in the app, but were genuinely useful as
            references and cross-checks while reverse-engineering the ROM.
          </p>

          <Li><strong>Gathering-area structure</strong> (which nodes belong to which area, and the Secret Area) — the MHFU <em>Guide and Walkthrough (PSP)</em> by ryin77, published on GameFAQs: <A href="https://gamefaqs.gamespot.com">gamefaqs.gamespot.com</A></Li>
          <Li><strong>Pokke Farm tab structure & Bomb Mining tier labels</strong> — the <em>Pokke Farm Guide (PSP)</em> by VioletKIRA, published on GameFAQs: <A href="https://gamefaqs.gamespot.com">gamefaqs.gamespot.com</A></Li>
          <Li><strong>Bowgun stats</strong> — cross-verified against Minegarde, a now-defunct community site, accessed via the Internet Archive: <A href="https://web.archive.org/web/2id_/http://minegarde.com/">web.archive.org</A></Li>
          <Li><strong>Bow damage formula</strong> — cross-confirmed against two community FAQs published on GameFAQs: the MHFU <em>Bow Damage Formula FAQ</em> by Boldrin (2009) and the MHF2 <em>Bow Damage Formula FAQ</em> by Deathslayer31 / Brian VanWulfen (2007): <A href="https://gamefaqs.gamespot.com">gamefaqs.gamespot.com</A></Li>
        </Section>

        <Divider />

        {/* Acknowledgements */}
        <Section title="Acknowledgements">
          <Li>A big thank you to the <strong>PPSSPP</strong> developers for making such a great emulator with proper developer-tool support. Its debugger and developer tools are what made it possible to crack the in-game gathering drop rates and to extract many of the icons and other assets from the ROM used throughout this app. <A href="https://www.ppsspp.org">ppsspp.org</A></Li>
        </Section>

        <Divider />

        {/* License */}
        <Section title="License">
          <Li><strong>Source code</strong> — MIT License, © 2026 Armored_Raven.</Li>
          <Li><strong>Game reference data</strong> derived from the wikis above — CC BY-SA 4.0 (attribution + share-alike). Data extracted directly from the ROM is factual game data, not independently copyrightable.</Li>
          <Li>Monster Hunter names & assets remain © Capcom (see below).</Li>
        </Section>

        <Divider />

        {/* Trademarks */}
        <Section title="Trademarks & Ownership">
          <Li>Monster Hunter, Monster Hunter Freedom Unite, and all related names, characters, and content are trademarks of and © CAPCOM CO., LTD.</Li>
          <Li>This is an unofficial, non-commercial, fan-made tool, not affiliated with, sponsored by, or endorsed by Capcom.</Li>
        </Section>

        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 20 }}>
          Built with React + TypeScript + Vite and SQLite.
        </p>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{title}</h3>
      {children}
    </div>
  )
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ display: 'flex', gap: 8, margin: '0 0 6px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
      <span style={{ flexShrink: 0, color: 'var(--accent)' }}>•</span>
      <span>{children}</span>
    </p>
  )
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       style={{ color: 'var(--accent)', textDecoration: 'none' }}>
      {children}
    </a>
  )
}
