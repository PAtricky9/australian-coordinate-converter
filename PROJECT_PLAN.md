# Coordinate Converter Tool Plan

> Status: Superseded for implementation by `/Users/yongcai/Downloads/AU_COORDINATE_CONVERTER_V2_SPEC.md`.
> Keep this file only as early project history. The Version 2 specification is now the authoritative functional specification.

## Goal

Build a small, friendly coordinate conversion tool for Australian coordinate systems.

The first version should be simple enough for a non-technical user to open and use, while still being accurate enough for practical work.

## Intended User

The user may not know web development or command-line tools. They should be able to:

- Double-click a file to open the tool.
- Enter coordinates in a clear form.
- Choose the source coordinate system.
- Choose the target coordinate system.
- Click a button.
- Copy the converted result.

## Main Use Cases

### 1. Latitude and longitude to MGA easting/northing

Example:

- Input: latitude and longitude
- Input format: decimal degrees, such as `-37.8136, 144.9631`
- Target datum: GDA2020 or GDA94
- Target projection: MGA Zone 53, 54, 55, or 56
- Output: easting and northing

### 2. MGA easting/northing to latitude and longitude

Example:

- Input: easting and northing
- Source datum: GDA2020 or GDA94
- Source projection: MGA Zone 53, 54, 55, or 56
- Output: latitude and longitude in decimal degrees

### 3. Degrees/minutes/seconds support

The first version should support decimal degrees and DMS input such as:

- `37°48'49"S`
- `144°57'47"E`

## Supported Coordinate Systems

### Geographic latitude/longitude

- GDA2020 latitude/longitude
- GDA94 latitude/longitude
- WGS84 latitude/longitude, treated as equivalent to GDA2020 in the current offline version

### Projected MGA zones

GDA2020:

- GDA2020 / MGA Zone 50
- GDA2020 / MGA Zone 51
- GDA2020 / MGA Zone 52
- GDA2020 / MGA Zone 53
- GDA2020 / MGA Zone 54
- GDA2020 / MGA Zone 55
- GDA2020 / MGA Zone 56

GDA94:

- GDA94 / MGA Zone 50
- GDA94 / MGA Zone 51
- GDA94 / MGA Zone 52
- GDA94 / MGA Zone 53
- GDA94 / MGA Zone 54
- GDA94 / MGA Zone 55
- GDA94 / MGA Zone 56

UTM:

- UTM Zones 1 to 60
- Northern and southern hemisphere coordinates
- WGS84 common-use UTM support

## User Interface

The tool should have one main screen:

1. Conversion direction
   - Source type
   - Target type

2. Source settings
   - Datum: GDA2020, GDA94, or WGS84
   - Zone when using MGA or UTM coordinates
   - Hemisphere when using UTM coordinates

3. Input fields
   - Latitude
   - Longitude
   - or Easting
   - or Northing

4. Target settings
   - Datum: GDA2020, GDA94, or WGS84
   - Zone when outputting MGA or UTM coordinates
   - Hemisphere when outputting UTM coordinates

5. Result area
   - Converted coordinate
   - Copy result button
   - Clear button

## Technical Approach

Start with a static web app:

- `index.html` for page structure
- `style.css` for visual design
- `script.js` for interaction and conversion logic

This makes the first version easy to open directly in a browser.

For coordinate conversion, keep the tool fully offline. If a local projection library is available, bundle it with the tool. If not, include the required Transverse Mercator and GDA94/GDA2020 transformation logic directly in `script.js`.

## Packaging Goal

First milestone:

- A folder containing the tool files.
- User opens `index.html` by double-clicking it.

Later milestone:

- Package as a small desktop app if needed, for example with Electron or Tauri.
- This is optional and should only be done if double-clicking `index.html` is not enough.

## Accuracy Notes

Coordinate conversion must be treated carefully.

Important checks:

- Confirm EPSG definitions for GDA2020 and GDA94.
- Test known sample coordinates.
- Show output precision clearly.
- Warn users that professional survey-grade work may require validation against official tools.

## First Build Scope

Version 1 should include:

- Decimal latitude/longitude input.
- Degrees/minutes/seconds latitude/longitude input.
- Easting/northing input.
- GDA2020 and GDA94.
- MGA zones 50, 51, 52, 53, 54, 55, and 56.
- UTM zones 1 to 60.
- Northern and southern hemisphere UTM handling.
- Source datum and target datum selection.
- Conversion in both directions.
- Copy result button.
- Clear button.
- Basic validation messages.

Version 1 should not include yet:

- Batch CSV upload.
- Map display.
- Automatic zone detection.
- Desktop app packaging.
- Official grid-based GDA94/GDA2020 distortion transformation files.

Those can be added after the basic tool works.

## Beginner Workflow

1. Create this planning file.
2. Create the three web files: `index.html`, `style.css`, and `script.js`.
3. Add the basic user interface.
4. Add coordinate conversion logic.
5. Test several known coordinate examples.
6. Improve the interface.
7. Package or share the folder.

## Questions To Confirm

Before building the first version, confirm:

1. Do users need batch conversion from CSV, or only one coordinate at a time?
2. Is the conformal GDA94/GDA2020 transformation suitable for the intended work, or does the tool need official grid-based distortion transformation files later?
3. How many decimal places should the output show in production?
