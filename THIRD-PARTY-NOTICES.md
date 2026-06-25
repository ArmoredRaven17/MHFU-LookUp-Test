# Third-party notices

This project includes assets/data derived from the following third-party sources.

## Monster Hunter Wiki (monsterhunterwiki.org)

This MediaWiki community wiki (<https://monsterhunterwiki.org>), used under the
**Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** license
(<https://creativecommons.org/licenses/by-sa/4.0/>), is the source for **data**: item
descriptions, carry counts, Training School quest data, and the Guild Card award data
(names, descriptions, conditions).

The **weapon-type icons** (`Assets/WeaponTypes/`) and **Guild Card award icons**
(`Assets/Awards/`) were originally this wiki's "MH2 Equipment Icons" but have since been
replaced with art extracted from the game ROM. The underlying icon artwork is © Capcom.

## ryin77 — MHFU Guide and Walkthrough (PSP), GameFAQs

The gathering-map **area/node structure** (which gather points belong to which area, and the Secret
Area) was organized with reference to the *Monster Hunter Freedom Unite Guide and Walkthrough (PSP)*
by **ryin77**, published on GameFAQs (<https://gamefaqs.gamespot.com>). The per-node drop **rates**
themselves are extracted from the game ROM; ryin77's guide was used only to structure that data into
the correct in-game area layout.

## vallode/mhfu-blacksmith

The tinted icons under `src/MhfuLookup.App/Assets/Decorations/` (jewels) and
`src/MhfuLookup.App/Assets/Materials/` (recipe ingredients) are baked from the grayscale
type sprites and the per-item colour palette of <https://github.com/vallode/mhfu-blacksmith>.
The derived data maps (`../mhfu-lookup/data/decoration_colors.json` and
`material_icons.json`) come from that project's `data/decorations.json` and
`sources/materials.json`.

That project's weapon data (`data/weapons/*.json`) was also used to cross-reference and
correct the weapon upgrade trees, per-weapon rarity, crafting materials, and the
MHP2G-exclusive ("dummy") weapons.

```
MIT License

Copyright (c) 2022 vallode

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
