# Australian Coordinate Converter

An offline-friendly coordinate conversion tool for Australian GIS and field data workflows.

The tool currently supports single point conversion between:

- WGS84 geographic latitude and longitude
- GDA2020 geographic latitude and longitude
- GDA94 geographic latitude and longitude
- GDA2020 / MGA easting and northing
- GDA94 / MGA easting and northing
- WGS84 / UTM easting and northing

It runs as a static web app, so it can be opened directly from `index.html` or hosted online as a simple website.

## How To Use Offline

Download or copy the project folder, then open:

```text
index.html
```

Keep these files together in the same folder:

```text
index.html
style.css
script.js
```

## Current Features

- Decimal degrees input
- Degrees minutes seconds input
- Easting and northing input
- Field app UTM text parsing, such as `55H 287110E 5858408N`
- CRS-aware input and output controls
- Method notes for WGS84 approximation and GDA94/GDA2020 transformation
- Copy full result
- Copy individual coordinate values
- Works offline without a backend server

## Important Accuracy Note

This tool is intended for general GIS, planning, environmental, modelling, asset management, and field data workflows.

It is not intended to replace official geodetic tools for survey control, cadastral boundaries, legal positioning, or high accuracy GNSS processing.

For high accuracy GDA94 to GDA2020 datum transformation, official grid based transformation files should be used.

## Project Structure

```text
index.html       Page structure and form controls
style.css        Visual design and layout
script.js        Coordinate conversion logic and user interaction
PROJECT_PLAN.md  Early project notes, superseded by the Version 2 specification
```

## Future Ideas

- Map preview
- Batch CSV conversion
- New Zealand mode
- Copy formats for ArcGIS, QGIS, and Survey123
- Official grid based GDA94/GDA2020 transformation support

## License

This project is released under the MIT License.
