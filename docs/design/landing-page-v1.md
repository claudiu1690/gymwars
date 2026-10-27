# Gym Wars public landing page — v1

## Overview

The first public screen should explain the manager fantasy before asking for credentials. The page's promise is “Small gym. Big legacy.” Its primary action is **Start your gym**, leading to the existing registration flow. Returning managers get **Back to my gym**, preserving their save.

The director's target is full browser 1.0, with no public alpha launch. The landing page contains no alpha badge, mailing signup, paid-pack checkout, fake testimonials, fabricated player counts or claims about a live multiplayer population. Deployment and mailing remain deferred.

## Design pattern and player flow

Following the game-designer skill's player-experience and feature-spec approach:

1. **Hook:** a welcoming four-fighter team in the approved cartoon 3D style, one clear headline, short manager promise and signup action.
2. **Understand play:** three illustrated steps explain recruitment, preparation/manual End week and fight-night corner decisions.
3. **Care about the team:** existing fighter portraits show the four divisions, distinct builds and rarity-colored backings. Copy connects training, permanent signatures and mentoring.
4. **Understand competition:** one visual 4v4 section explains one fighter per division, saved tactics, rival gyms, cups and leaderboards.
5. **See a future:** an expanded gym and earned honors show what the club can become.
6. **Resolve practical uncertainty:** three open FAQ cards explain browser access, paced resource refills and the manager/coach role.
7. **Act:** repeat the same signup action. Login and returning-manager paths remain available.

The warm cream/navy/coral palette, large display type and simple card hierarchy match the game. No dropdowns, information accordions, checkmarks or button arrows were added. Desktop and phone layouts use different crops of the same hero, keeping text outside the faces on phones. All headings and buttons are real HTML rather than generated lettering.

## Art provenance

One original hero illustration generated with Higgsfield MCP, GPT Image 2.5, job `b0397b49-30ab-4898-9a34-81f1f2464d88`, using the approved style reference `ac808798-c049-411d-a588-98ea4d97a992`. The reference establishes rendering style, without copying a licensed game character.

Optimized local WebP files and provenance are in `frontend/public/art/landing`. Existing approved gym, room, arena and fighter assets provide the remaining illustrations. The image has no embedded marketing copy or UI. The desktop hero is about 81 KB and the phone crop about 77 KB.

## Behavior and acceptance

- `/` is the public landing page, including when a manager is logged in.
- Authenticated login/register routes continue directly to `/career`, avoiding a redirect loop or extra post-login landing step.
- Signup/login forms link back to the public page.
- Existing game routes stay authenticated. Landing navigation performs no career command, reset, purchase, allocation or calendar advance.
- The career interface is loaded on entry through a lazy route, with an accessible loading state. The public entry build is about 59 KB compressed JavaScript and 7 KB compressed CSS, instead of loading the complete career UI up front. The separately loaded career JavaScript is about 107 KB compressed. This removes the previous 500 KB JavaScript-chunk advisory; target-device load observation remains useful.
- Keyboard focus and a skip link are visible. Reduced-motion preferences disable button transitions. Images have meaningful text alternatives or are marked decorative.
- Browser tests check image loading, anchors, signup/login navigation, responsive layout and no save/revision change for returning managers. Existing full registration and career tests continue to verify the actual normal-resource account flow.
