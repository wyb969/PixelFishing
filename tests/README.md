# Weather regression checks

From the repository root:

```sh
node tests/weather.cjs /tmp/weather-states.json
python3 tests/render_weather.py /tmp/weather-states.json /tmp/weather-render-output
```

The renderer requires `moderngl`, `Pillow`, and an EGL-capable OpenGL implementation. No dependencies are needed for the JavaScript tests. It uses the application's current geometry and GLSL, translating GLSL ES attribute/varying/output syntax to desktop GLSL for EGL. It does **not** exercise a browser, CSS layout, touch input, or physical phone GPU compatibility.

Coverage:
- All 144 season/weather transition pairs over 60 simulated seconds each.
- 10,000 rapid weather retargets, bounded continuous cloud/wind travel, no direct sunlight during visible precipitation.
- 46 rendered transition states, including cloud-first arrival and rain/snow-first clearing.
- 60 full-frame rain/snow/clearing comparisons against a shader with direct celestial lighting disabled, at dawn, noon, dusk, and night. Clear-sky positive controls ensure both sun and water reflections are actually tested.
- Four shader programs compile/link; four seasons at day and night; no OpenGL errors.

Captured sequence images deliberately hold the solar clock at noon to isolate weather changes. Wind comparison samples use the same elapsed times for calm and windy conditions. The scene remains rendered at its native 480×270 pixel grid, with nearest-neighbor enlargement for individual captures.

## Overcast canopy and diffuse-light comparison

The transition test also asserts more than 99% cloud-canopy coverage whenever precipitation is visible, including the least-dense part of the procedural cloud field, and a continuous zero-opacity onset.

To compare against a separate checkout/export of the previous revision:

```sh
python3 tests/compare_weather.py /path/to/baseline /tmp/weather-states.json /tmp/storm-comparison
```

This writes six clear/rain/snow day/night images, a contact sheet and JSON metrics. It verifies unchanged clear-sky pixels; substantially reduced rainy/snowy daytime sky and coast luminance; a readable night-light floor. Timings are five warmed batches of twenty 480×270 EGL renders, including readback. They are relative checks on this machine, **not browser or phone FPS claims**.

## Depth-layered rain

```sh
python3 tests/rain_depth.py /path/to/pre-rain-baseline /tmp/weather-states.json /tmp/rain-depth
```

This exercises the production precipitation shader and writes day/night 90-frame animations at 30 simulated FPS, consecutive-frame contact sheets, layer diagnostics, and timings. Its shader-alpha probe checks exact one-second trajectory translations for all three layers, linear rain-intensity fading with unchanged seeds, zero alpha with no rain, bounded screen occupancy, and unchanged clear scenes at noon and midnight. Snow has its own regression suite below. The normal renderer now covers four programs and composites rain last using the same alpha blending as the browser. No browser or physical-phone performance is inferred from EGL timings.

## Depth snow and environmental accumulation

```sh
node tests/snow.cjs /tmp/snow-environment-states.json
python3 tests/snow_depth.py /path/to/pre-snow-baseline /tmp/weather-states.json /tmp/snow-environment-states.json /tmp/snow-depth
```

Snow is a separate slow-flutter system, not shortened rain streaks. The suite tracks actual shader-rendered flakes, verifies increasing depth speed/contrast and bounded occupancy, half-intensity alpha, no flakes outside winter, unchanged clear/rain day/night rendering, accumulation on shore/vegetation but not open water, and smooth melt back to the winter base or to zero in a warm season. It saves 180 consecutive day/night frames as animations, plus accumulation/winter-melt/warm-melt and material-response contact sheets. Performance results remain local EGL checks, not mobile-device benchmarks.

## Optional thunderstorm light and audio

```sh
node tests/thunder.cjs /tmp/thunder-states.json
node tests/thunder-audio.cjs /tmp/thunder-preview.wav
node tests/storm-controls.cjs
python3 tests/thunder_render.py /path/to/pre-thunder-baseline /tmp/weather-states.json /tmp/thunder-states.json /tmp/thunder-render
```

The storm is weather index 5 and appears in summer's automatic forecast, never winter's. Both light effects and audio default off. The owner can enable either independently; audio unlock only occurs in the checkbox's user gesture. Lightning is a single smoothly bounded pulse (at most 0.65 seconds, at least 14 seconds between strikes), not a burst or strobe. Disabling, leaving the weather, changing season, pausing or hiding the document cancels pending thunder. Reduced-motion changes turn the light effect back off.

The tests include the actual `coast.js` control logic with DOM/WebGL mocks, asynchronous unlock races, 100 rapid weather changes, 100 rapid audio toggles, 100 simultaneous strike requests, 1,000 repeated cancellations, no replay or overlapping audible sources, bounded PCM peak/RMS, and a positive playback control. Mock-context timing is not proof of browser or speaker playback.

The shader suite compares the new heavy-rain mask to normal rain, checks shared flash illumination and exact darkness restoration, and preserves existing clear/rain/snow pixels. Lightning GIF previews deliberately play a **single strike without looping**, rather than presenting unrealistically frequent flashes. Local EGL timings do not establish phone FPS.

## Species, catch journal and yacht

```sh
node tests/species-motion.cjs
node tests/journal.cjs
node tests/storm-controls.cjs
node tests/fishing-states.cjs /tmp/fishing-animation.json
python3 tests/fishing-render.py /path/to/acb2b38-baseline /tmp/weather-states.json /tmp/fishing-animation.json /tmp/fishing-renders
python3 tests/gles_compile.py
```

This covers six stable species, fourteen smoothly steered fish, fishing-only movement ownership, confirmed-catch persistence and achievements, storage failures, both angler directions and stage-gated reeling. The journal uses native collapsed details below the scene, never an overlay. Render captures are production GLSL offscreen; browser layout, touch behavior and phone GPU compatibility require separate device/browser validation. `fishing-render.py` writes scene/close-up GIFs, six shader silhouettes and relative draw-plus-readback timings.

## Weather-ready 1.2× yacht

```sh
node tests/boat-scale.cjs
python3 tests/yacht-render.py /path/to/1205df6-baseline /tmp/weather-states.json /tmp/yacht-renders
```

The yacht uses one inverse scale/shear transform for hull, person, rod and precipitation occlusion. JS cast/retract/deck anchors and pointer hit testing match it. The render suite covers both actual fishing directions, a slow nighttime searchlight sweep, warm windows, rainy palms, arriving/clearing roof deployment and winter clothes; it probes daytime light absence and zero precipitation alpha beneath the roof. Spring/summer/autumn character pixels remain identical. Timings are EGL draw-plus-readback, not phone FPS; no additional draw pass is added.

## Shared dusk searchlight and fish attraction

```sh
node tests/searchlight.cjs
node tests/lightfish-states.cjs /tmp/lightfish-animation.json
python3 tests/lightfish-render.py /path/to/f6e7d7d-baseline /tmp/weather-states.json /tmp/lightfish-animation.json /tmp/lightfish-renders
```

The production CPU light frame is uploaded as `boatLight` and also drives fish steering. Actual normalized 0.15–0.25 contours are inverted and filtered to playable water; targets are not shoreline-clipped fake edges. Tests compare actual trajectories against an unlit control, both directions and moving boats, day identity, dusk continuity, pause and fishing ownership. Shader probes compare CPU values with rendered pixel-center light intensity. Marker-light difference controls verify that only a handful of night pixels change and no daytime pixel changes. The render helper caches production-JS wave-origin calculations outside steady-state timing batches.
