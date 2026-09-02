Yes — your impression is accurate: the product already communicates its basic function, but visually and interaction-wise it still feels like an internal tool rather than a polished consumer product.

The biggest issue is not that individual components are “bad.” It is that the interface lacks a strong product hierarchy and personality. Almost everything has the same visual weight, the app exposes some implementation-oriented concepts directly to the user, and the layouts feel assembled from generic UI components rather than designed around the specific workflow of **record → sync → free space → find → replay**.

## Overall assessment

I would rate the current state roughly like this:

| Area                     | Current | Potential |
| ------------------------ | ------: | --------: |
| Core concept clarity     |    7/10 |      9/10 |
| Information architecture |    6/10 |      9/10 |
| Media browsing UX        |    6/10 |      9/10 |
| Sync UX                  |    5/10 |     10/10 |
| Player UX                |    6/10 |      9/10 |
| Visual hierarchy         |    4/10 |      9/10 |
| Modern / premium feel    |    3/10 |      9/10 |
| Trust / reassurance      |    5/10 |     10/10 |
| Product personality      |    3/10 |      9/10 |

There is a good product underneath. The redesign should avoid making it more complicated. In fact, I would make it **visually richer but structurally simpler**.

---

# 1. The product proposition needs to be more visible in the UI

The current interface behaves like a generic video file manager.

But Move Sync is not really a file manager.

Its value proposition is:

**“Keep all your movement videos without filling your phone.”**

That should influence the entire UX.

Right now the prominent concepts are:

> Medias
> Synced
> Queue
> AutoSync
> Upload videos

Those describe system operations.

The user is probably thinking:

> “Are my videos safe?”
> “Can I delete these from my phone?”
> “How much space did I recover?”
> “Did yesterday's class sync?”
> “Where is the choreography I recorded last week?”

That difference is fundamental.

The interface should orient itself more strongly around **content, storage and confidence**, and keep technical sync states secondary.

---

# 2. Current Media Library

The library is functional, but this is where the “prototype” feeling is strongest.

### What works

The video grid is immediately understandable. Duration labels are useful. The upload action is visible. Dark mode fits video content well, and separating queued and uploaded content is a reasonable starting point.

### What makes it feel unfinished

There is an enormous amount of unused space.

On the screenshot, the main grid occupies a relatively small island in the middle of a 2048px-wide screen. There is a sidebar, then a very large empty gap, then the actual content.

The result is visually disconnected.

The hierarchy is also very flat:

- small logo,
- small eyebrow “MOVE SYNC,”
- large title,
- segmented control,
- cards,
- tiny metadata,
- tiny sync status.

Nothing really establishes a sophisticated rhythm.

The cards themselves look like standard developer-dashboard cards. Thumbnail, title, size, status. They communicate data but not much personality.

---

# 3. Redesign the library around the videos

I would make the media much more dominant.

A possible desktop structure:

```text
┌ Sidebar ┐   Videos                                  Upload
│         │   Your movement library
│ Videos  │
│ Sync    │   All   On cloud   Uploading
│ Devices │
│         │   Search videos...        Filter   Sort
│         │
│         │   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│         │   │ Video  │ │ Video  │ │ Video  │ │ Video  │
│         │   │        │ │        │ │        │ │        │
│         │   └────────┘ └────────┘ └────────┘ └────────┘
```

The grid should adapt to screen width rather than staying at three columns while half the display remains empty.

For a large display, I would expect perhaps 4–5 cards across depending on minimum thumbnail width.

The maximum content width could still be constrained, but substantially wider than it is now.

---

# 4. Change “Medias”

I would strongly recommend changing **Medias** to **Videos**.

“Media” is generally uncountable in English UI language, and “Medias” feels technical / non-native.

More importantly, the app is specifically built around video.

Use the language the customer uses:

**Videos**

Not:

**Media objects / media assets / medias**

This tiny change already makes the product feel more consumer-facing.

---

# 5. Rethink “Synced / Queue”

This binary segmentation exposes how the infrastructure works rather than what users care about.

A queue also isn't necessarily a destination the user wants to browse regularly.

I would instead use:

**All · On cloud · Uploading**

or even simply:

**All · Uploading**

Then show the state directly on affected items.

For example:

```text
class rehearsal
Today · 02:14

Uploading 62% ━━━━━━━━━━━
```

Once something is successfully in the cloud, you do not necessarily need to keep repeating “Synced” under every card.

That creates visual noise.

The absence of an error/progress state can already imply “available.”

---

# 6. Search is missing

As soon as someone uses this product seriously, browsing thumbnails will stop being enough.

A dancer could easily accumulate hundreds or thousands of clips.

The library needs search from the start.

Search should work against:

- filename/title,
- date,
- collection,
- location if available.

Later, you could add smarter metadata, but simple search is enough initially.

Filters could include:

- Recent
- Collection
- Device
- Duration
- Upload state

Do not expose all of these permanently. Put the secondary ones behind a filter control.

---

# 7. Collections are underrepresented

This is perhaps the biggest information architecture opportunity.

People doing dance, yoga or movement are unlikely to mentally organize everything as an undifferentiated video grid.

They have natural contexts:

- Ballet class
- Improvisation
- Workshop — Berlin
- Yoga training
- Floorwork
- Rehearsals
- Personal practice

The app should preserve those contexts.

On mobile, these may originate as Albums / Collections.

On cloud, they should continue to exist as first-class organizational units.

You could therefore eventually have:

**Videos**
**Collections**

without turning the product into Dropbox.

---

# 8. Give the home/library some useful status information

One restrained storage indicator would communicate Move Sync's purpose much better than multiple “Synced” labels.

For example:

> **128 videos safely backed up**
> 14.8 GB can be removed from this phone

or:

> **Cloud library**
> 428 videos · 37.2 GB

On mobile in particular:

> **12.4 GB ready to free up**

That is a very powerful product moment.

It connects synchronization with an actual benefit.

---

# 9. Avoid calling everything “Sync”

The current terminology makes the app feel infrastructure-heavy.

A user needs several different concepts:

**Uploading**
The video is being transferred.

**Backed up / On cloud**
The cloud copy is safely available.

**On this device**
There is still a local version.

**Cloud only**
The local copy has been removed.

These are much easier to understand than a generic “Sync state”.

And they answer the question users actually have:

> “Where does this video currently exist?”

---

# 10. Sync needs to generate confidence

For this type of product, synchronization is not merely a background operation. It involves the user's irreplaceable recordings.

The UX needs to feel extremely trustworthy.

Before suggesting that a user frees phone storage, Move Sync should communicate something like:

> ✓ Backed up to Move Sync
> Safe to remove from this device

The difference between:

**Synced**

and

**Safely backed up**

is important psychologically.

The latter tells users what the state means.

---

# 11. AutoSync should be conceptually simpler

“AutoSync” currently sounds like a system preference.

Instead, design it around the user's albums/collections.

For example:

## Automatic backup

> Automatically back up new videos from selected collections.

Then:

```text
Camera Roll                      ON
Ballet                           ON
Yoga                             OFF
Rehearsals                       ON
```

Each selected collection could show:

> Last backup 3 min ago

or, if needed:

> 4 videos waiting for Wi-Fi

The advanced options can live under a small settings section:

- Wi-Fi only
- While charging
- Include existing videos
- Remove local copy after backup

The main screen should not feel like configuring a sync daemon.

---

# 12. Mobile should be the center of the sync experience

Because the distinctive capability is freeing storage on a phone, the mobile experience is strategically more important than the desktop one.

I would make the mobile navigation extremely simple:

**Videos · Backup · Settings**

Possibly only:

**Videos · Backup**

with settings behind the avatar/menu.

Avoid reproducing desktop sidebar concepts literally on mobile.

The mobile app has a very specific job:

1. Notice new recordings.
2. Back them up.
3. Reassure the user.
4. Help free storage.
5. Let the user replay them.

Everything else is secondary.

---

# 13. Web should feel like the cloud library, not the sync controller

The desktop experience has a slightly confused identity today because “AutoSync” appears beside the media library.

On web, I would orient navigation more like:

**Videos**
**Collections**
**Devices** — optional

Then put upload in the header.

If web can configure the behavior of connected mobile devices, **Devices & backup** is clearer than AutoSync.

For example:

> Michael's iPhone
> Last backup 8 minutes ago
> Camera Roll, Rehearsals
> Wi-Fi only

That makes the relationship between mobile and cloud understandable.

---

# 14. The Video Player is closer, but still feels like an admin tool

The player view has a reasonable foundation: video in the center, metadata alongside it.

But there are several UX problems.

The top of the page currently has:

- back,
- title,
- share icon,
- info icon.

Then the side panel also contains:

- information,
- Share video,
- Delete cloud copy.

This duplicates actions and makes it unclear what the info button actually does when the panel is already visible.

Choose one system.

On desktop I would keep the inspector permanently available or toggleable.

On mobile it becomes a bottom sheet.

---

# 15. Make the video the hero

Currently the details sidebar competes visually with the video.

A media player page should feel cinematic and calm.

I would structure it more like:

```text
← Videos                      Share     •••

              [ VIDEO PLAYER ]

Classic dance

Sep 23, 2026 · 17 sec · 1.4 MB
✓ Backed up

-------------------------------------------

Details                                     >
```

Desktop can place Details on the right if there is enough room.

But it should be visually quieter than the video itself.

---

# 16. Remove duplicate metadata

The screenshot has title/duration information in several places:

- title in the header,
- title beneath the video,
- duration in native controls,
- duration in Details.

Repetition contributes to the prototype feeling.

A polished interface decides where each piece of information belongs.

For example:

Header:

> Classic dance

Below player:

> Sep 23 · 17 sec

Inspector:

> File size
> Collection
> Location
> Storage state

No need to repeat everything.

---

# 17. “Delete cloud copy” is dangerous wording

This deserves attention.

Imagine the user backed up a video, deleted it from their phone to save storage, and then sees:

**Delete cloud copy**

This could mean permanent data loss.

The UI needs to communicate the consequence.

If the cloud copy is the last remaining copy:

> **Delete video permanently**

Confirmation:

> This video is only stored in Move Sync. Deleting it will permanently remove it.

If the video still exists locally:

> Remove from cloud

The distinction should be explicit.

Similarly, on mobile there should be a very different action:

> **Free up 286 MB**

which removes local copies only after validating the cloud versions.

That is likely to become one of Move Sync's signature actions.

---

# 18. Sharing can be simplified

There are currently two share actions in the player screen.

You only need one.

Use a header action:

**Share**

and move destructive/secondary actions under:

**•••**

For example:

```text
Share
Download
Move to collection
View details
──────────
Delete
```

This is much cleaner.

---

# 19. Visual design: the biggest issue is hierarchy

The UI uses a dark background, slightly lighter cards, blue buttons and white text.

That technically constitutes a design system, but it is not yet a distinctive visual language.

The biggest problem isn't the chosen colors.

It is that most components are represented as **rectangles with borders**.

Sidebar → rectangle.
Tabs → rectangle.
Cards → rectangle.
Player → rectangle.
Inspector → rectangle.
Buttons → rectangles.

This creates the dashboard/prototype feeling.

Modern interfaces rely much more on:

- spacing,
- typography,
- alignment,
- layering,
- imagery,
- subtle surface differentiation.

Use fewer visible boxes.

---

# 20. Lighten the visual density

The dark theme is currently extremely dark with very high contrast boundaries.

I would make the interface slightly softer.

For example, conceptually:

```text
App background      #0B0E12
Surface             #12171D
Elevated surface    #171D24
Divider             white at ~8–10%
Primary text        white at ~92%
Secondary text      white at ~55–65%
Accent              clean electric blue
```

The exact hex values are less important than the relationships.

Most borders should become almost invisible.

Use elevation/surface changes instead.

---

# 21. Give blue a clearer role

Blue appears everywhere as a generic action/status color.

Instead, establish a semantic hierarchy:

**Blue:** primary actions / active states
**Green or neutral success:** safely backed up
**Amber:** pending / waiting
**Red:** destructive/error

You do not need colored badges on everything.

For completed content, a subtle ✓ icon and neutral text may be enough.

If everything that works is bright blue, the interface becomes visually noisy.

---

# 22. Typography needs more character

The current typography is extremely utilitarian.

I would introduce a stronger type scale.

For example:

**Page heading:** 28–32px / semibold
**Section title:** 18–20px / semibold
**Card title:** 14–15px / medium
**Metadata:** 12–13px / regular
**Micro/status:** 11–12px

More importantly, increase the contrast between hierarchy levels.

Currently many labels are small, which contributes to the sensation of a developer tool.

---

# 23. Stop using tiny all-caps headings

The small `MOVE SYNC` eyebrow above “Medias” adds almost nothing.

Likewise `LIBRARY` in the sidebar.

These are common design-system patterns, but here they reinforce the template feeling.

The Move Sync logo already tells the user which product they're in.

Just say:

# Videos

Cleaner.

---

# 24. Improve the logo / brand presence

The cloud-outline icon communicates cloud storage, but not movement.

Move Sync has an opportunity to have a much more expressive identity.

The brand sits at the intersection of:

**motion + video + continuity + cloud**

The visual identity could hint at motion paths, frames or looping/synchronization without becoming literal.

The product should feel closer to a creative media application than enterprise cloud storage.

Think:

**calm, cinematic, fluid, precise**

rather than:

**server dashboard**.

---

# 25. Video cards need a redesign

Today:

```text
THUMBNAIL
filename
3.7 MB
☁ Synced
```

I'd move toward:

```text
┌──────────────────────────────┐
│                              │
│         VIDEO IMAGE          │  00:33
│                              │
└──────────────────────────────┘

Trailer iPhone
Today · 33 sec                         ✓
```

File size is rarely useful while browsing.

Put it in Details.

Likewise “Synced” shouldn't dominate every card.

For items actively uploading:

```text
Rehearsal
Uploading · 64%

━━━━━━━━━━━━━━━━━━━━━━
```

Now states become visible only when they matter.

---

# 26. Thumbnail presentation needs consistency

Some videos have white title frames, some have dance imagery, one is nearly black.

This makes the grid visually chaotic.

You obviously cannot control the content, but you can control presentation.

Use:

- fixed aspect ratio,
- consistent crop,
- subtle thumbnail gradient at the bottom,
- duration overlay,
- hover treatment,
- optional preview on hover on desktop.

That will immediately make the grid feel closer to a video product.

---

# 27. Add selection as a deliberate interaction mode

Because users need to share/delete/download/manage groups, desktop and mobile should have multi-select.

Desktop:

Hover → checkbox.

Then selecting several items creates a floating or top contextual bar:

> 4 selected — Share · Download · Add to collection · Delete

Mobile:

Long press one video → selection mode.

This is much cleaner than putting action buttons on every card.

---

# 28. Design empty, progress and failure states

This will make a huge difference to product quality.

You should explicitly design:

**No videos yet**

> Your synced videos will appear here.

**Uploading**

> 4 of 18 videos · 820 MB remaining

**Waiting for Wi-Fi**

> Backup will resume when Wi-Fi is available.

**Phone offline**

> Last connected 2h ago.

**Backup failed**

> Couldn't back up 3 videos. Retry.

**Storage almost full**

Cloud versus device storage states.

Products feel polished when their transitional states are as intentional as their ideal state.

---

# 29. A dedicated “backup activity” surface would be useful

Rather than turning Queue into a permanent library mode, treat transfers as activity.

For example:

> ↑ 3 uploads in progress

Clicking it opens a compact activity drawer:

```text
Uploading

Ballet practice      72%
Sequence 04          Waiting
Yoga flow            Complete
```

Once everything is done, it collapses to:

> ✓ Backup complete

Much cleaner.

---

# 30. Make “freeing storage” a first-class experience

This is currently the most underused opportunity.

Suppose the phone has:

> **8.7 GB backed up**

Move Sync should be able to say:

> **Free up 8.7 GB**

Then:

> 143 videos are safely stored in Move Sync and can be removed from this iPhone.

Afterwards:

> **8.7 GB freed**

That provides a very tangible success moment.

It may be more valuable than the entire AutoSync settings page.

---

# 31. Suggested information architecture

For **mobile**, I would use:

### Videos

All cloud-accessible videos and collections.

### Backup

Current status, auto-backup collections, storage recovery.

### Account / Settings

Accessible from avatar rather than bottom navigation.

For **web**:

### Videos

### Collections

### Devices / Backup

And Upload in the header.

You can potentially omit Devices until the product actually needs multi-device management.

---

# 32. Proposed mobile Videos screen

Visually:

```text
Move Sync                              ◎

Videos
128 videos

[ Search videos ]

Recent                         See all

┌──────────┐ ┌──────────┐
│          │ │          │
│   vid    │ │   vid    │
│      :32 │ │     1:12 │
└──────────┘ └──────────┘
Rehearsal     Floorwork
Yesterday     Monday

Collections

[ Ballet ]   42 videos
[ Yoga   ]   18 videos


Videos                    Backup
```

Notice how little “sync terminology” appears.

---

# 33. Proposed mobile Backup screen

This is where the product can really differentiate.

```text
Backup

✓ Everything is backed up
Last checked 2 min ago

────────────────────────

Ready to free up
12.4 GB

143 videos are safely stored
in Move Sync.

[ Free up 12.4 GB ]

────────────────────────

Automatic backup

Camera Roll                 ●
Ballet                      ●
Yoga                        ○

[ Manage collections ]

────────────────────────

Wi-Fi only                  ●
```

That feels like a finished consumer product.

---

# 34. Proposed desktop library

I would move from the current centered dashboard layout to something much broader and calmer.

```text
Move Sync

Videos
──────────────────────────────────────────────────
Search videos...                 ⌁ Filter    Upload

All    Uploading

Today

[ video ] [ video ] [ video ] [ video ]

Last week

[ video ] [ video ] [ video ] [ video ]
[ video ] [ video ]


                 ↑ 2 uploads
```

Use the available viewport.

The current three-column layout makes the interface feel strangely empty.

---

# 35. Proposed desktop player

Something like:

```text
← Videos                 Classic dance          Share   •••


┌─────────────────────────────────────┐ ┌───────────────┐
│                                     │ │ Details       │
│                                     │ │               │
│              VIDEO                  │ │ Sep 23, 2026  │
│                                     │ │ 17 sec        │
│                                     │ │ 1.4 MB        │
│                                     │ │               │
│                                     │ │ Collection    │
│ ───────────────●─────────────────── │ │ Ballet        │
└─────────────────────────────────────┘ │               │
                                        │ Storage       │
                                        │ ✓ On cloud    │
                                        │ On iPhone     │
                                        └───────────────┘
```

No metadata footer below the video.

No duplicated share.

No giant bright buttons inside the inspector.

---

# 36. Use progressive disclosure

A prototype often exposes everything because all features need to be testable.

A finished product hides complexity until needed.

For example, the normal video card doesn't need:

> size
> sync state
> location
> collection

The user only needs:

> thumbnail
> title
> date/duration

Everything else goes into Details.

Similarly, the library doesn't need a permanent Queue view unless uploads are happening.

This single principle would make the UI feel significantly more elegant.

---

# 37. Add subtle motion

For a product called **Move Sync**, animation can become part of the identity.

Not flashy animation.

Small details:

- thumbnail subtly fades in after backup,
- progress transitions smoothly,
- finished upload transforms from progress bar into a check,
- details panel glides in,
- video card hover gently lifts,
- storage-recovered number animates when cleanup finishes.

Around 150–250ms for most transitions.

Fluid rather than “dashboard.”

---

# 38. Accessibility

The current dark interface should be checked carefully for contrast, especially the tiny blue/grey text.

I would also ensure:

- minimum 44×44 touch targets on mobile,
- visible keyboard focus states,
- buttons have text or accessible labels,
- status is never communicated only through color,
- destructive actions are not adjacent to common actions,
- reduced-motion support,
- captions/subtitles supported by the player where available.

---

# 39. Product language should become warmer and simpler

Some suggested terminology changes:

| Current                    | Recommended                      |
| -------------------------- | -------------------------------- |
| Medias                     | Videos                           |
| Synced                     | On cloud / Backed up             |
| Queue                      | Uploading                        |
| Sync state                 | Storage                          |
| AutoSync                   | Automatic backup                 |
| Delete cloud copy          | Delete video / Remove from cloud |
| Not in a device collection | No collection                    |
| Location: Not recorded     | No location                      |
| Upload videos              | Upload                           |
| Share video                | Share                            |

The less the product sounds like synchronization software, the more approachable it becomes.

---

# 40. One important semantic decision

You should clearly distinguish **backup** from **sync**.

“Sync” can imply:

> If I delete a video here, it also disappears everywhere.

“Backup” implies:

> There is a safe copy elsewhere.

Because your core promise involves letting users remove local files, this distinction matters enormously.

Internally, your technology may be synchronization.

Externally, I would strongly consider framing the user-facing product around:

**Automatic backup**

and use “sync” only where bidirectional synchronization actually occurs.

---

# 41. What I would preserve

I would **not** redesign everything just to appear fashionable.

Keep:

- dark-first interface,
- video grid,
- simple navigation,
- prominent upload,
- side inspector on large screens,
- bottom details sheet on mobile,
- lightweight application structure.

The current product is refreshingly uncomplicated.

The goal is therefore:

> **Less visible UI, stronger hierarchy, better language and much more deliberate spacing.**

Not more features.

---

# 42. Priority order

If I were directing the redesign, I would tackle it in this order:

1. **Reframe the UX terminology around Videos / Backup / Cloud / Device.**
2. **Redesign the media library layout and cards.**
3. **Make backup status and “free up space” central on mobile.**
4. **Redesign the player and details inspector.**
5. **Simplify AutoSync into Automatic Backup.**
6. **Introduce Collections and search.**
7. **Establish a stronger typography/spacing/color system.**
8. **Design upload/progress/error/empty states.**
9. **Add selection, bulk actions and refined sharing.**
10. **Introduce subtle animation and branding.**

The first four would already make this feel like a different product.

---

# The design direction I would choose

I would **not** push Move Sync toward something that resembles Google Drive or a SaaS dashboard.

I would position it visually between a **video library and a premium creative tool**.

Large media.
Lots of breathing room.
Almost no borders.
Very restrained blue accent.
Soft dark surfaces.
Strong typography.
Beautiful motion.
Minimal technical language.

The emotional goal should be:

> **“My videos are safe and always available.”**

rather than:

> **“My files have synchronized successfully.”**

That change in perspective is the key to making Move Sync feel like a real, polished product rather than a prototype.
