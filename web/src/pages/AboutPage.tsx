const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function AboutPage() {
  return (
    <div style={{ overflowY: 'auto', height: '100%', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 720, padding: '24px 24px 40px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
          <img src={`${BASE}/assets/Misc/about_icon.png`} alt="" width={52} height={52}
               style={{ objectFit: 'contain', flexShrink: 0 }}
               onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>About</h2>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, margin: '0 0 4px' }}>
          MHFU LookUp is an unofficial, offline reference tool for Monster Hunter Freedom Unite (MHP2G).
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text)', fontSize: 14, margin: '0 0 20px' }}>
          Created by <strong>Armored_Raven</strong>.
        </p>

        <Divider />

        {/* AI Disclaimer */}
        <Section title="AI Use Disclaimer">
          <Li>Built with substantial assistance from AI (Anthropic's Claude), used to write code and to parse, organize, and cross-check the data.</Li>
          <Li>The data was validated against the sources listed below, but errors may remain — please verify any critical values against the originals before relying on them.</Li>
        </Section>

        <Divider />

        {/* Data Sources */}
        <Section title="Data Sources & Attribution">
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 10px', lineHeight: 1.6 }}>
            Compiled from openly available community sources. The underlying values are factual game data;
            English names follow Capcom's official localization.
          </p>

          <Li><strong>Monsters</strong> (hitzones, ailment tolerances, rewards) and <strong>Veggie Elder trades</strong> — MHP2G @wiki: <A href="https://w.atwiki.jp/mhp2g/">w.atwiki.jp/mhp2g</A></Li>
          <Li><strong>Quests, armor, decorations, armor skills, gathering, weapon sharpness, items & account items, combinations, treasures, kitchen recipes, Felyne Whim skills, Felyne Comrades, Trenya, and Pokke Farm</strong> — Monster Hunter Wiki (Fandom), used under the CC BY-SA license: <A href="https://monsterhunter.fandom.com/wiki/Monster_Hunter_Wiki">monsterhunter.fandom.com</A></Li>
          <Li><strong>Decoration/jewel & crafting-material icon colors, and weapon-data cross-referencing</strong> (upgrade trees, rarity, materials, and MHP2G-exclusive "dummy" weapons) — vallode/mhfu-blacksmith (MIT License, © 2022 vallode): <A href="https://github.com/vallode/mhfu-blacksmith">github.com/vallode/mhfu-blacksmith</A></Li>
          <Li><strong>Monster icons</strong> — from the Monster Hunter Wiki (Fandom); the underlying artwork is © Capcom.</Li>
          <Li><strong>Map / location area icons</strong> — from the Monster Hunter Wiki (Fandom); the underlying artwork is © Capcom.</Li>
          <Li><strong>Element & status value icons</strong> — from the Monster Hunter Wiki (Fandom); the underlying artwork is © Capcom.</Li>
          <Li><strong>Hunting Horn note icons & sheet music</strong> — Monster Hunter Wiki (Fandom), "Hunting Horn Sheet Music" page; note artwork © Capcom: <A href="https://monsterhunter.fandom.com/wiki/Hunting_Horn_Sheet_Music_(file)">monsterhunter.fandom.com</A></Li>
          <Li><strong>Item descriptions, carry counts, Guild Card awards, Training School quests & weapon-type icons</strong> — Monster Hunter Wiki (monsterhunterwiki.org), CC BY-SA 4.0 (award & equipment icons © Capcom): <A href="https://monsterhunterwiki.org/wiki/MHFU/Items">monsterhunterwiki.org</A></Li>
          <Li><strong>Armor-skill category groupings</strong> — the skills and their data are the app's own; only the category sort order follows <em>Athena's Armor Set Search</em> for MHFU, so users of both tools see familiar groupings.</Li>
          <Li><strong>Bowgun stats (verification)</strong> — Minegarde, accessed via the Internet Archive: <A href="https://web.archive.org/web/2id_/http://minegarde.com/">web.archive.org</A></Li>
          <Li><strong>Bowgun ammo stats</strong> — from the <em>Bowgun Damage Guide (PSP)</em> by VampireCosmonaut, published on GameFAQs: <A href="https://gamefaqs.gamespot.com">gamefaqs.gamespot.com</A></Li>
          <Li><strong>Gathering area structure</strong> — per-node drop rates are from the ROM; the gathering-map layout was structured with the help of the MHFU <em>Guide and Walkthrough (PSP)</em> by ryin77, on GameFAQs: <A href="https://gamefaqs.gamespot.com">gamefaqs.gamespot.com</A></Li>
          <Li><strong>Pokke Farm structure</strong> — farm-node rates from the ROM; the tab's structure and early direction came from the <em>Pokke Farm Guide (PSP)</em> by VioletKIRA, on GameFAQs: <A href="https://gamefaqs.gamespot.com">gamefaqs.gamespot.com</A></Li>
          <Li><strong>Bow damage formula (verification)</strong> — cross-confirmed against the MHFU <em>Bow Damage Formula FAQ</em> by Boldrin (2009) and the MHF2 <em>Bow Damage Formula FAQ</em> by Deathslayer31 / Brian VanWulfen (2007), both on GameFAQs: <A href="https://gamefaqs.gamespot.com">gamefaqs.gamespot.com</A></Li>

          <p style={{ color: 'var(--muted)', fontSize: 11, margin: '10px 0 0', lineHeight: 1.5 }}>
            Reused Fandom wiki content is licensed CC BY-SA; the data set derived from it is shared under the same terms (attribution + share-alike).
          </p>
        </Section>

        <Divider />

        {/* ROM extraction */}
        <Section title="Gathering Rates — Extracted from the ROM">
          <Li>The per-node gathering percentages in the Gathering tab aren't published on any community site — no one had them. They were pulled straight from the game by reverse-engineering MHFU's ROM: tracing the gather mechanism in live memory, then cracking the XOR-encrypted gather tables (a four-stream, round-robin Lehmer-LCG keystream) to decrypt every map and rank from the ROM files. As far as we know, this is the first source for real MHFU gathering rates.</Li>
          <Li>The full method, tooling, and ROM addresses are documented for anyone who wants the details.</Li>
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
          <Li><strong>Game reference data</strong> — CC BY-SA 4.0 (derived from the wikis above; attribution + share-alike).</Li>
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
