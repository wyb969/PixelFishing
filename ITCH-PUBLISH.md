# Publish PixelFishing on itch.io

Create https://ybwangrogger.itch.io/pixelfishing at https://itch.io/game/new first.

Suggested settings: title PixelFishing; URL pixelfishing; kind HTML; no payments; embed 960 x 540 with fullscreen enabled. After uploading, mark the html5 upload as playable in the browser. Preview before making the page public.

## Description

A peaceful pixel-art seaside with an automatic lure-fishing boat. Watch the sun set, the campfire light up, and the glowing lure illuminate the fish below.

Drag the boat or click the water to sail horizontally. Fish chase the lure, bite, struggle, and sometimes escape. Each fight has a 50% chance of landing the fish. A full day and night lasts one minute.

Press H for settings, drag the sky to pan, and use the mouse wheel to zoom. Best played on desktop with WebGL hardware acceleration enabled.

Visual inspiration: https://www.youtube.com/watch?v=4t6VF38VYzw (Surf Sandbox). This is an independent implementation, not the original game or an official project.

Source: https://github.com/wyb969/PixelFishing

## Automated uploads

The repository secret BUTLER_API_KEY supplies the official butler credential. Never put its value in a file or workflow.

Once the game page exists, set the repository Actions variable ITCH_TARGET to ybwangrogger/pixelfishing. Run Publish to itch.io from the Actions tab for the first upload. Alternatively, supply ybwangrogger/pixelfishing as the manual workflow target input.

Future pushes to main that change dist/ automatically update the html5 channel when ITCH_TARGET is set. Only dist/ is uploaded. Without the variable, automatic runs are skipped. The workflow does not create the game page or configure HTML embed settings.
