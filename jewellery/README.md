# Jewellery Design Sandbox

A single-page Three.js workbench with a starter necklace, a mannequin reference, seven component tiles, real millimetre dimensions, independent colour and finish, mirrored placement, and undo.

## Run locally

Install Node.js 20 or newer, open a terminal in this folder, then run:

```sh
npm install
npm start
```

Open **http://127.0.0.1:5173**. Stop the server with Ctrl+C. If using pnpm, `pnpm install` and `pnpm start` also work.

Three.js is served locally after installation. The optional Google font falls back to system fonts offline. Use a browser with WebGL enabled. No account, build step, API key, or backend is required.

## Play

- Choose a component tile, then click near the strand. A translucent preview shows the snap position. Placement finds nearby space within 20 mm of your click.
- Drag empty space to orbit; scroll or pinch to zoom. Reset camera returns to the front.
- Mirror placement adds a symmetric pair. A pendant always anchors at the front centre (the lowest point).
- Choose Select, then click a part to recolour it, change its finish, or remove it. Appearance changes also become the settings for future parts.
- Undo restores placement, removals, clearing, appearance, and strand settings. Use Ctrl/Cmd+Z or the toolbar. Delete removes the selected component; Escape switches to Select.
- Try classic drape, a round collar, or a V necklace, change strand length, and switch the base between chain, cord, and wire.
- Use the mannequin menu for translucent, wireframe, porcelain, or hidden views.

## Files and model

`index.html` and `style.css` define the workbench. `app.js` contains the scene and interactions. `model.js` is the database-ready catalogue and placement logic. `server.mjs` serves local files with Node's standard library.

Catalogue records own an ID, geometry type, dimensions in millimetres, hole diameter/direction, threading width, and optional centre anchor. Placed instances reference a catalogue ID and store a normalized arc-length position plus a separate `{ colour, finish }` appearance. A production database could replace this catalogue without multiplying records for every colour.

The curve is scaled to the selected physical length; the components share that scale. Occupied length sums threading widths and excludes the 1 mm placement clearance. Pendants occupy the width of their attachment, not their hanging height.

## Prototype limits

This is a design sandbox, not a manufacturing fit or physics simulator. The mannequin is a stylized display bust. Holes are metadata rather than cut-out geometry, and materials are approximations. Components follow a fixed curve. Shortening an existing design can cause overlaps (a message appears); undo or remove parts to resolve them. Designs live in memory and reset on refresh. The server binds only to your own computer.

## Verify

```sh
npm test
```

Tests cover symmetric placement, collision spacing, centre anchors, occupied length, and separation of catalogue geometry from appearance.
