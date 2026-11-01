# Sentinel — Access Map Builder

A self-contained access-control and personnel-location map builder. Built with only HTML, CSS, and ES6 JavaScript. No build step, third-party packages, external fonts, or network services are required.

## Run

Open `index.html` in a browser, or serve the folder with a static file server:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Use

- Select one of three floors. Each floor has its own devices and floor-plan image.
- Drag a device from the toolbox onto the map. Drag existing devices to reposition them; click to inspect. Keyboard users can focus a palette item and press Enter or Space to place it at the center of the map.
- Upload a PNG, JPEG, WEBP, GIF, or SVG floor plan. Image dimensions determine the canvas aspect ratio.
- Use the inspector to change a device's width, height, or rotation, or delete it.
- Click a camera for a simulated CCTV feed. Use the top bar to lock/unlock doors, trigger an access alert, or run a personnel-tracking walkthrough.
- Changes save automatically to browser `localStorage`; **Save Config** also confirms the current state. Browser storage quotas vary, so very large uploaded images may not persist. Everything stays on the local device.

The included illustrated floor plan and sample devices make the demo usable immediately. Device center coordinates are stored as percentages so placements follow canvas resizing.
