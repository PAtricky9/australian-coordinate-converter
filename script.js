(function () {
  "use strict";

  const ellipsoid = {
    a: 6378137,
    invF: 298.257222101
  };

  const k0 = 0.9996;
  const falseEasting = 500000;
  const southernFalseNorthing = 10000000;
  const degToRad = Math.PI / 180;
  const radToDeg = 180 / Math.PI;

  const WGS84_METHOD_NOTE = "Method note: For general Australian GIS, GPS and web mapping use, WGS84 is treated as approximately aligned with GDA2020. For survey control, cadastral or legal positioning, confirm the source reference frame and epoch.";
  const GDA_METHOD_NOTE = "Method note: GDA94 and GDA2020 are different Australian datums. For high accuracy transformation, official grid based transformation files should be used. This tool is intended for general GIS coordinate conversion unless a grid based method is explicitly selected.";

  const CRS_REGISTRY = {
    WGS84_GEOGRAPHIC: {
      id: "WGS84_GEOGRAPHIC",
      displayName: "WGS84 geographic latitude and longitude",
      shortName: "WGS84 geographic",
      crsType: "geographic",
      datumOrFrame: "WGS84",
      unit: "degrees",
      epsgCode: "EPSG:4326",
      defaultPrecision: 8
    },
    GDA2020_GEOGRAPHIC: {
      id: "GDA2020_GEOGRAPHIC",
      displayName: "GDA2020 geographic latitude and longitude",
      shortName: "GDA2020 geographic",
      crsType: "geographic",
      datumOrFrame: "GDA2020",
      unit: "degrees",
      epsgCode: "EPSG:7844",
      defaultPrecision: 8
    },
    GDA94_GEOGRAPHIC: {
      id: "GDA94_GEOGRAPHIC",
      displayName: "GDA94 geographic latitude and longitude",
      shortName: "GDA94 geographic",
      crsType: "geographic",
      datumOrFrame: "GDA94",
      unit: "degrees",
      epsgCode: "EPSG:4283",
      defaultPrecision: 8
    },
    GDA2020_MGA: {
      id: "GDA2020_MGA",
      displayName: "GDA2020 / MGA",
      shortName: "GDA2020 / MGA",
      crsType: "projected",
      datumOrFrame: "GDA2020",
      projectionMethod: "MGA",
      unit: "metres",
      validZones: range(46, 59),
      epsgCode: ({ zone }) => `EPSG:${7800 + zone}`,
      areaOfUseNote: "MGA is intended for Australian coordinates.",
      defaultPrecision: 3
    },
    GDA94_MGA: {
      id: "GDA94_MGA",
      displayName: "GDA94 / MGA",
      shortName: "GDA94 / MGA",
      crsType: "projected",
      datumOrFrame: "GDA94",
      projectionMethod: "MGA",
      unit: "metres",
      validZones: range(48, 58),
      epsgCode: ({ zone }) => `EPSG:${28300 + zone}`,
      areaOfUseNote: "MGA is intended for Australian coordinates.",
      defaultPrecision: 3
    },
    WGS84_UTM: {
      id: "WGS84_UTM",
      displayName: "WGS84 / UTM",
      shortName: "WGS84 / UTM",
      crsType: "projected",
      datumOrFrame: "WGS84",
      projectionMethod: "UTM",
      unit: "metres",
      validZones: range(1, 60),
      epsgCode: ({ zone, hemisphere }) => `EPSG:${hemisphere === "S" ? 32700 + zone : 32600 + zone}`,
      areaOfUseNote: "UTM is a global zone based projected grid.",
      defaultPrecision: 3
    }
  };

  const TRANSFORMATION_REGISTRY = [
    {
      sourceDatumOrFrame: "WGS84",
      targetDatumOrFrame: "GDA2020",
      methodName: "Approximate WGS84 to GDA2020 alignment",
      methodType: "approximation",
      accuracyNote: WGS84_METHOD_NOTE,
      isDefaultForSimpleMode: true,
      isFutureProfessionalMode: false
    },
    {
      sourceDatumOrFrame: "GDA2020",
      targetDatumOrFrame: "WGS84",
      methodName: "Approximate GDA2020 to WGS84 alignment",
      methodType: "approximation",
      accuracyNote: WGS84_METHOD_NOTE,
      isDefaultForSimpleMode: true,
      isFutureProfessionalMode: false
    },
    {
      sourceDatumOrFrame: "GDA94",
      targetDatumOrFrame: "GDA2020",
      methodName: "Basic 7-parameter conformal transformation",
      methodType: "basic",
      accuracyNote: GDA_METHOD_NOTE,
      isDefaultForSimpleMode: true,
      isFutureProfessionalMode: false
    },
    {
      sourceDatumOrFrame: "GDA2020",
      targetDatumOrFrame: "GDA94",
      methodName: "Basic 7-parameter conformal transformation",
      methodType: "basic",
      accuracyNote: GDA_METHOD_NOTE,
      isDefaultForSimpleMode: true,
      isFutureProfessionalMode: false
    }
  ];

  const helmertGda94ToGda2020 = {
    tx: 0.06155,
    ty: -0.01087,
    tz: -0.04019,
    rx: -39.4924 / 1000 / 3600 * degToRad,
    ry: -32.7221 / 1000 / 3600 * degToRad,
    rz: -32.8979 / 1000 / 3600 * degToRad,
    scale: -9.994e-9
  };

  const controls = {
    form: document.querySelector("#converter-form"),
    inputFormat: document.querySelector("#input-format"),
    sourceCrs: document.querySelector("#source-crs"),
    targetCrs: document.querySelector("#target-crs"),
    sourceZone: document.querySelector("#source-zone"),
    targetZone: document.querySelector("#target-zone"),
    angleFormat: document.querySelector("#angle-format"),
    gridEntryMode: document.querySelector("#grid-entry-mode"),
    latitude: document.querySelector("#latitude"),
    longitude: document.querySelector("#longitude"),
    easting: document.querySelector("#easting"),
    northing: document.querySelector("#northing"),
    fieldAppUtm: document.querySelector("#field-app-utm"),
    sourceZoneWrap: document.querySelector("#source-zone-wrap"),
    targetZoneWrap: document.querySelector("#target-zone-wrap"),
    angleFormatWrap: document.querySelector("#angle-format-wrap"),
    gridEntryModeWrap: document.querySelector("#grid-entry-mode-wrap"),
    geoInputs: document.querySelector("#geo-inputs"),
    gridInputs: document.querySelector("#grid-inputs"),
    fieldAppInputWrap: document.querySelector("#field-app-input-wrap"),
    resultOutput: document.querySelector("#result-output"),
    message: document.querySelector("#message"),
    copyButton: document.querySelector("#copy-result"),
    clearButton: document.querySelector("#clear-form")
  };

  [
    controls.inputFormat,
    controls.sourceCrs,
    controls.targetCrs,
    controls.angleFormat,
    controls.gridEntryMode
  ].forEach((control) => {
    control.addEventListener("change", syncUiFromState);
  });

  controls.form.addEventListener("submit", (event) => {
    event.preventDefault();
    convert();
  });

  controls.copyButton.addEventListener("click", copyResult);
  controls.clearButton.addEventListener("click", clearForm);

  populateCrsSelectors();
  syncUiFromState();

  function populateCrsSelectors() {
    syncSourceCrsOptions();
    syncTargetCrsOptions();
  }

  function syncUiFromState() {
    syncSourceCrsOptions();
    syncTargetCrsOptions();
    syncZoneOptions(controls.sourceZone, getCrs(controls.sourceCrs.value), "55|S");
    syncZoneOptions(controls.targetZone, getCrs(controls.targetCrs.value), "55|S");

    const visible = computeVisibleControls(getState());
    controls.angleFormatWrap.classList.toggle("hidden", !visible.angleFormat);
    controls.geoInputs.classList.toggle("hidden", !visible.geographicInputs);
    controls.gridEntryModeWrap.classList.toggle("hidden", !visible.gridEntryMode);
    controls.gridInputs.classList.toggle("hidden", !visible.gridInputs);
    controls.fieldAppInputWrap.classList.toggle("hidden", !visible.fieldAppInput);
    controls.sourceZoneWrap.classList.toggle("hidden", !visible.sourceZone);
    controls.targetZoneWrap.classList.toggle("hidden", !visible.targetZone);

    if (controls.angleFormat.value === "dms") {
      controls.latitude.placeholder = "37 48 49 S";
      controls.longitude.placeholder = "144 57 47 E";
    } else {
      controls.latitude.placeholder = "-37.8136";
      controls.longitude.placeholder = "144.9631";
    }

    clearMessage();
  }

  function syncSourceCrsOptions() {
    const format = controls.inputFormat.value;
    const ids = format === "geographic"
      ? ["WGS84_GEOGRAPHIC", "GDA2020_GEOGRAPHIC", "GDA94_GEOGRAPHIC"]
      : ["GDA2020_MGA", "GDA94_MGA", "WGS84_UTM"];
    syncCrsOptions(controls.sourceCrs, ids, ids[0]);
  }

  function syncTargetCrsOptions() {
    const ids = [
      "WGS84_GEOGRAPHIC",
      "GDA2020_GEOGRAPHIC",
      "GDA94_GEOGRAPHIC",
      "GDA2020_MGA",
      "GDA94_MGA",
      "WGS84_UTM"
    ];
    syncCrsOptions(controls.targetCrs, ids, "GDA2020_MGA");
  }

  function syncCrsOptions(select, ids, fallback) {
    const options = ids.map((id) => ({
      value: id,
      label: getBaseCrsDisplayName(getCrs(id))
    }));
    const current = options.some((option) => option.value === select.value) ? select.value : fallback;
    select.innerHTML = "";
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      option.selected = item.value === current;
      select.appendChild(option);
    });
  }

  function syncZoneOptions(select, crs, fallback) {
    if (crs.crsType === "geographic") {
      select.innerHTML = "";
      return;
    }

    const options = crs.id === "WGS84_UTM"
      ? crs.validZones.flatMap((zone) => [
        { value: `${zone}|S`, label: `UTM Zone ${zone}S` },
        { value: `${zone}|N`, label: `UTM Zone ${zone}N` }
      ])
      : crs.validZones.map((zone) => ({
        value: `${zone}|S`,
        label: `MGA Zone ${zone}`
      }));

    const current = options.some((option) => option.value === select.value) ? select.value : fallback;
    select.innerHTML = "";
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      option.selected = item.value === current;
      select.appendChild(option);
    });
  }

  function computeVisibleControls(state) {
    const sourceCrs = getCrs(state.sourceCrsId);
    const fieldAppInput = state.inputFormat === "projected" &&
      sourceCrs.id === "WGS84_UTM" &&
      state.gridEntryMode === "fieldAppUtm";
    const targetCrs = getCrs(state.targetCrsId);

    return {
      angleFormat: state.inputFormat === "geographic",
      geographicInputs: state.inputFormat === "geographic",
      gridEntryMode: state.inputFormat === "projected" && sourceCrs.id === "WGS84_UTM",
      gridInputs: state.inputFormat === "projected" && !fieldAppInput,
      fieldAppInput,
      sourceZone: sourceCrs.crsType === "projected" && !fieldAppInput,
      targetZone: targetCrs.crsType === "projected"
    };
  }

  function getState() {
    const sourceZoneSelection = parseZoneSelection(controls.sourceZone.value);
    const targetZoneSelection = parseZoneSelection(controls.targetZone.value);
    return {
      inputFormat: controls.inputFormat.value,
      inputAngleFormat: controls.angleFormat.value,
      sourceCrsId: controls.sourceCrs.value,
      targetCrsId: controls.targetCrs.value,
      sourceZone: sourceZoneSelection.zone,
      targetZone: targetZoneSelection.zone,
      sourceHemisphere: sourceZoneSelection.hemisphere,
      targetHemisphere: targetZoneSelection.hemisphere,
      gridEntryMode: controls.gridEntryMode.value,
      operationMethod: "autoRecommended"
    };
  }

  function parseZoneSelection(value) {
    const [zone, hemisphere] = String(value || "").split("|");
    return {
      zone: zone ? Number(zone) : null,
      hemisphere: hemisphere || null
    };
  }

  function convert() {
    try {
      clearMessage();
      const state = getState();
      const notes = [];
      const sourceCoordinate = normaliseSourceInput(state, notes);
      validateInputCoordinate(sourceCoordinate, state, notes);
      const operationPlan = resolveOperationPlan(state);
      const targetGeographic = transformDatumIfRequired(
        sourceCoordinate.latitude,
        sourceCoordinate.longitude,
        operationPlan,
        notes
      );
      validateCrsAreaOfUse(targetGeographic, state, notes);
      const formatted = formatResult(targetGeographic, state, operationPlan, notes);
      showResult(formatted);
    } catch (error) {
      showError(error.message);
    }
  }

  function normaliseSourceInput(state, notes) {
    const sourceCrs = getCrs(state.sourceCrsId);

    if (state.inputFormat === "geographic") {
      return normaliseGeographicInput(state);
    }

    if (sourceCrs.id === "WGS84_UTM" && state.gridEntryMode === "fieldAppUtm") {
      const parsed = parseFieldAppUtmText(controls.fieldAppUtm.value);
      state.sourceZone = parsed.zone;
      state.sourceHemisphere = parsed.hemisphere;
      notes.push(`Input note: Field app text was parsed as WGS84 / UTM Zone ${parsed.zone}${parsed.hemisphere}. The zone band letter is treated as a field format label, not as the formal CRS name.`);
      validateProjectedRanges(parsed.easting, parsed.northing, notes);
      return convertGridToGeographic(parsed.easting, parsed.northing, parsed.zone, parsed.hemisphere);
    }

    const easting = parseNumber(controls.easting.value, "easting");
    const northing = parseNumber(controls.northing.value, "northing");
    validateProjectedRanges(easting, northing, notes);
    const hemisphere = sourceCrs.id === "WGS84_UTM" ? state.sourceHemisphere : "S";
    return convertGridToGeographic(easting, northing, state.sourceZone, hemisphere);
  }

  function normaliseGeographicInput(state) {
    const latitude = state.inputAngleFormat === "dms"
      ? parseDms(controls.latitude.value, "latitude")
      : parseDecimalDegrees(controls.latitude.value, "latitude");
    const longitude = state.inputAngleFormat === "dms"
      ? parseDms(controls.longitude.value, "longitude")
      : parseDecimalDegrees(controls.longitude.value, "longitude");
    return { latitude, longitude };
  }

  function parseDms(value, label) {
    const text = String(value).trim();
    if (!text) {
      throw new Error(`Please enter a ${label}.`);
    }

    const directionMatch = text.match(/[NSEW]$/i);
    if (!directionMatch) {
      throw new Error(`DMS ${label} must end with N, S, E, or W.`);
    }

    const direction = directionMatch[0].toUpperCase();
    const cleaned = text
      .replace(/[NSEW]/gi, " ")
      .replace(/[°º˚]/g, " ")
      .replace(/[′']/g, " ")
      .replace(/[″"]/g, " ")
      .replace(/,/g, " ")
      .trim();
    const parts = cleaned.split(/\s+/).filter(Boolean).map(Number);

    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      throw new Error(`DMS ${label} must use degrees, minutes, seconds and direction, such as 37 48 49 S.`);
    }

    const [degrees, minutes, seconds] = parts;
    if (!Number.isInteger(degrees)) {
      throw new Error(`DMS ${label} degrees must be an integer.`);
    }
    if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
      throw new Error(`DMS ${label} minutes and seconds must be from 0 to less than 60.`);
    }

    let sign = direction === "S" || direction === "W" ? -1 : 1;
    const decimal = sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
    validateLatLonValue(decimal, label);
    return decimal;
  }

  function parseDecimalDegrees(value, label) {
    const number = parseNumber(value, label);
    validateLatLonValue(number, label);
    return number;
  }

  function parseFieldAppUtmText(value) {
    const text = String(value).trim().toUpperCase().replace(/,/g, "");
    const match = text.match(/^(\d{1,2})([C-HJ-NP-X])\s+([0-9.]+)\s*E\s+([0-9.]+)\s*N$/);
    if (!match) {
      throw new Error("Field app UTM text must look like 55H 287110E 5858408N.");
    }

    const zone = Number(match[1]);
    const band = match[2];
    const easting = Number(match[3]);
    const northing = Number(match[4]);
    if (zone < 1 || zone > 60) {
      throw new Error("UTM zone must be from 1 to 60.");
    }
    return {
      zone,
      hemisphere: band < "N" ? "S" : "N",
      easting,
      northing
    };
  }

  function validateInputCoordinate(coordinate, state, notes) {
    validateLatLon(coordinate.latitude, coordinate.longitude);

    if (state.inputFormat === "geographic") {
      if (coordinate.latitude > 0) {
        notes.push("Validation note: Australian latitudes are normally negative. Check whether N/S or the sign is correct.");
      }
      if (coordinate.longitude < 0) {
        notes.push("Validation note: Australian longitudes are normally positive. Check whether E/W or the sign is correct.");
      }
    }
  }

  function validateProjectedRanges(easting, northing, notes) {
    if (easting < 100000 || easting > 900000) {
      notes.push("Validation note: Easting is usually between 100000 and 900000 for MGA and UTM zone based coordinates. Check the source CRS, zone and units.");
    }
    if (northing < 0 || northing > 10000000) {
      notes.push("Validation note: Northing is usually between 0 and 10000000 for southern hemisphere MGA and UTM coordinates. Check the source CRS, hemisphere and units.");
    }
  }

  function validateCrsAreaOfUse(coordinate, state, notes) {
    const sourceCrs = getCrs(state.sourceCrsId);
    const targetCrs = getCrs(state.targetCrsId);
    const usesMga = sourceCrs.projectionMethod === "MGA" || targetCrs.projectionMethod === "MGA";

    if (usesMga && !appearsInsideAustralia(coordinate.latitude, coordinate.longitude)) {
      notes.push("Validation note: The selected MGA CRS is intended for Australia. The coordinate appears to be outside Australia. Consider using WGS84 / UTM or another suitable projected CRS.");
    }

    if (targetCrs.projectionMethod === "MGA" && !longitudeFitsZone(coordinate.longitude, state.targetZone)) {
      notes.push(`Validation note: Longitude ${coordinate.longitude.toFixed(4)} is outside the usual longitude span for MGA Zone ${state.targetZone}. Check the selected zone.`);
    }
  }

  function resolveOperationPlan(state) {
    const sourceCrs = getCrs(state.sourceCrsId);
    const targetCrs = getCrs(state.targetCrsId);
    const needsTransformation = sourceCrs.datumOrFrame !== targetCrs.datumOrFrame;
    const sourceStep = sourceCrs.crsType === "projected" ? "grid to geographic" : "geographic input";
    const targetStep = targetCrs.crsType === "projected" ? "geographic to grid" : "geographic output";
    const steps = [];

    if (sourceCrs.crsType === "projected") {
      steps.push(`Coordinate conversion from ${formatCrsName(sourceCrs, state.sourceZone, state.sourceHemisphere)} to ${geographicNameForDatum(sourceCrs.datumOrFrame)}`);
    }
    if (needsTransformation) {
      steps.push(`Datum/reference frame transformation from ${sourceCrs.datumOrFrame} to ${targetCrs.datumOrFrame}`);
    }
    if (targetCrs.crsType === "projected") {
      steps.push(`Coordinate conversion from ${geographicNameForDatum(targetCrs.datumOrFrame)} to ${formatCrsName(targetCrs, state.targetZone, state.targetHemisphere)}`);
    }

    return {
      sourceCrs,
      targetCrs,
      sourceStep,
      targetStep,
      needsTransformation,
      operationType: needsTransformation ? "Transformation plus conversion" : "Conversion only",
      steps
    };
  }

  function convertGeographicToGrid(latitude, longitude, zone, hemisphere) {
    return projectTransverseMercator(latitude, longitude, zone, hemisphere);
  }

  function convertGridToGeographic(easting, northing, zone, hemisphere) {
    return inverseTransverseMercator(easting, northing, zone, hemisphere);
  }

  function transformDatumIfRequired(latitude, longitude, operationPlan, notes) {
    const sourceDatum = operationPlan.sourceCrs.datumOrFrame;
    const targetDatum = operationPlan.targetCrs.datumOrFrame;

    if (sourceDatum === targetDatum) {
      return { latitude, longitude };
    }

    const addNote = (note) => {
      if (!notes.includes(note)) notes.push(note);
    };

    if (sourceDatum === "WGS84" && targetDatum === "GDA2020") {
      addNote(WGS84_METHOD_NOTE);
      return { latitude, longitude };
    }

    if (sourceDatum === "GDA2020" && targetDatum === "WGS84") {
      addNote(WGS84_METHOD_NOTE);
      return { latitude, longitude };
    }

    if (sourceDatum === "GDA94" && targetDatum === "GDA2020") {
      addNote(GDA_METHOD_NOTE);
      return transformViaHelmert(latitude, longitude, "GDA94", "GDA2020");
    }

    if (sourceDatum === "GDA2020" && targetDatum === "GDA94") {
      addNote(GDA_METHOD_NOTE);
      return transformViaHelmert(latitude, longitude, "GDA2020", "GDA94");
    }

    if (sourceDatum === "WGS84" && targetDatum === "GDA94") {
      addNote(WGS84_METHOD_NOTE);
      addNote(GDA_METHOD_NOTE);
      return transformViaHelmert(latitude, longitude, "GDA2020", "GDA94");
    }

    if (sourceDatum === "GDA94" && targetDatum === "WGS84") {
      addNote(GDA_METHOD_NOTE);
      addNote(WGS84_METHOD_NOTE);
      return transformViaHelmert(latitude, longitude, "GDA94", "GDA2020");
    }

    throw new Error(`Datum transformation from ${sourceDatum} to ${targetDatum} is not supported in Version 2.`);
  }

  function formatResult(coordinate, state, operationPlan, notes) {
    const targetCrs = operationPlan.targetCrs;
    const sourceName = formatCrsName(operationPlan.sourceCrs, state.sourceZone, state.sourceHemisphere);
    const targetName = formatCrsName(targetCrs, state.targetZone, state.targetHemisphere);
    const values = [];
    const lines = [];

    if (targetCrs.crsType === "geographic") {
      values.push({ label: "Latitude", value: coordinate.latitude.toFixed(8), unit: "" });
      values.push({ label: "Longitude", value: coordinate.longitude.toFixed(8), unit: "" });
      values.push({ label: "Latitude DMS", value: formatDms(coordinate.latitude, "lat"), unit: "" });
      values.push({ label: "Longitude DMS", value: formatDms(coordinate.longitude, "lon"), unit: "" });
    } else {
      const hemisphere = targetCrs.id === "WGS84_UTM" ? state.targetHemisphere : "S";
      const projected = convertGeographicToGrid(coordinate.latitude, coordinate.longitude, state.targetZone, hemisphere);
      values.push({ label: "Easting", value: projected.easting.toFixed(3), unit: "m" });
      values.push({ label: "Northing", value: projected.northing.toFixed(3), unit: "m" });
      if (targetCrs.id === "WGS84_UTM") {
        values.push({
          label: "Field app text format",
          value: `${state.targetZone}${latitudeToUtmBand(coordinate.latitude)} ${projected.easting.toFixed(0)}E ${projected.northing.toFixed(0)}N`,
          unit: ""
        });
      }
    }

    const metadata = [
      { label: "Source CRS", value: sourceName },
      { label: "Source EPSG", value: formatEpsg(operationPlan.sourceCrs, state.sourceZone, state.sourceHemisphere) },
      { label: "Target CRS", value: targetName },
      { label: "Target EPSG", value: formatEpsg(targetCrs, state.targetZone, state.targetHemisphere) },
      { label: "Operation type", value: operationPlan.operationType },
      { label: "Operation plan", value: operationPlan.steps.length ? operationPlan.steps.join(" | ") : "No coordinate operation required" }
    ];

    const method = findTransformation(operationPlan.sourceCrs.datumOrFrame, targetCrs.datumOrFrame);
    if (method) {
      metadata.push({ label: "Transformation method", value: method.methodName });
    }

    lines.push(targetName);
    values.forEach((item) => lines.push(`${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ""}`));
    lines.push("");
    lines.push("Metadata");
    metadata.forEach((item) => lines.push(`${item.label}: ${item.value}`));
    const uniqueNotes = unique(notes);
    if (uniqueNotes.length) {
      lines.push("");
      lines.push("Notes");
      uniqueNotes.forEach((note) => lines.push(note));
    }

    return {
      targetName,
      values,
      metadata,
      notes: uniqueNotes,
      plainText: lines.join("\n")
    };
  }

  function buildResultMetadata() {
    return resolveOperationPlan(getState());
  }

  function projectTransverseMercator(latitude, longitude, zone, hemisphere) {
    const lat = latitude * degToRad;
    const lon = longitude * degToRad;
    const lon0 = centralMeridian(zone) * degToRad;
    const f = 1 / ellipsoid.invF;
    const e2 = f * (2 - f);
    const ep2 = e2 / (1 - e2);
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const tanLat = Math.tan(lat);
    const n = ellipsoid.a / Math.sqrt(1 - e2 * sinLat * sinLat);
    const t = tanLat * tanLat;
    const c = ep2 * cosLat * cosLat;
    const a = cosLat * normalizeLongitudeRadians(lon - lon0);
    const m = meridionalArc(lat, e2);
    const y0 = hemisphere === "S" ? southernFalseNorthing : 0;

    const easting = falseEasting + k0 * n * (
      a +
      (1 - t + c) * Math.pow(a, 3) / 6 +
      (5 - 18 * t + t * t + 72 * c - 58 * ep2) * Math.pow(a, 5) / 120
    );

    const northing = y0 + k0 * (
      m +
      n * tanLat * (
        a * a / 2 +
        (5 - t + 9 * c + 4 * c * c) * Math.pow(a, 4) / 24 +
        (61 - 58 * t + t * t + 600 * c - 330 * ep2) * Math.pow(a, 6) / 720
      )
    );

    return { easting, northing };
  }

  function inverseTransverseMercator(easting, northing, zone, hemisphere) {
    const f = 1 / ellipsoid.invF;
    const e2 = f * (2 - f);
    const ep2 = e2 / (1 - e2);
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const x = easting - falseEasting;
    const y0 = hemisphere === "S" ? southernFalseNorthing : 0;
    const y = northing - y0;
    const m = y / k0;
    const mu = m / (ellipsoid.a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * Math.pow(e2, 3) / 256));

    const fp = mu +
      (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
      (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
      (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) +
      (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);

    const sinFp = Math.sin(fp);
    const cosFp = Math.cos(fp);
    const tanFp = Math.tan(fp);
    const c1 = ep2 * cosFp * cosFp;
    const t1 = tanFp * tanFp;
    const n1 = ellipsoid.a / Math.sqrt(1 - e2 * sinFp * sinFp);
    const r1 = ellipsoid.a * (1 - e2) / Math.pow(1 - e2 * sinFp * sinFp, 1.5);
    const d = x / (n1 * k0);

    const lat = fp - (n1 * tanFp / r1) * (
      d * d / 2 -
      (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * Math.pow(d, 4) / 24 +
      (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * Math.pow(d, 6) / 720
    );

    const lon = centralMeridian(zone) * degToRad + (
      d -
      (1 + 2 * t1 + c1) * Math.pow(d, 3) / 6 +
      (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * Math.pow(d, 5) / 120
    ) / cosFp;

    return {
      latitude: lat * radToDeg,
      longitude: normalizeLongitudeDegrees(lon * radToDeg)
    };
  }

  function meridionalArc(lat, e2) {
    return ellipsoid.a * (
      (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * Math.pow(e2, 3) / 256) * lat -
      (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * Math.pow(e2, 3) / 1024) * Math.sin(2 * lat) +
      (15 * e2 * e2 / 256 + 45 * Math.pow(e2, 3) / 1024) * Math.sin(4 * lat) -
      (35 * Math.pow(e2, 3) / 3072) * Math.sin(6 * lat)
    );
  }

  function transformViaHelmert(latitude, longitude, fromDatum, toDatum) {
    if (fromDatum === toDatum) {
      return { latitude, longitude };
    }

    const cartesian = geodeticToCartesian(latitude, longitude, 0);
    const transformed = fromDatum === "GDA94"
      ? applyHelmert(cartesian, helmertGda94ToGda2020)
      : invertHelmert(cartesian, helmertGda94ToGda2020);
    return cartesianToGeodetic(transformed.x, transformed.y, transformed.z);
  }

  function geodeticToCartesian(latitude, longitude, height) {
    const lat = latitude * degToRad;
    const lon = longitude * degToRad;
    const f = 1 / ellipsoid.invF;
    const e2 = f * (2 - f);
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const n = ellipsoid.a / Math.sqrt(1 - e2 * sinLat * sinLat);

    return {
      x: (n + height) * cosLat * Math.cos(lon),
      y: (n + height) * cosLat * Math.sin(lon),
      z: (n * (1 - e2) + height) * sinLat
    };
  }

  function cartesianToGeodetic(x, y, z) {
    const f = 1 / ellipsoid.invF;
    const e2 = f * (2 - f);
    const p = Math.sqrt(x * x + y * y);
    let lat = Math.atan2(z, p * (1 - e2));
    let height = 0;

    for (let i = 0; i < 8; i += 1) {
      const sinLat = Math.sin(lat);
      const n = ellipsoid.a / Math.sqrt(1 - e2 * sinLat * sinLat);
      height = p / Math.cos(lat) - n;
      lat = Math.atan2(z, p * (1 - e2 * n / (n + height)));
    }

    return {
      latitude: lat * radToDeg,
      longitude: normalizeLongitudeDegrees(Math.atan2(y, x) * radToDeg)
    };
  }

  function applyHelmert(point, params) {
    const s = 1 + params.scale;
    return {
      x: params.tx + s * (point.x + params.rz * point.y - params.ry * point.z),
      y: params.ty + s * (-params.rz * point.x + point.y + params.rx * point.z),
      z: params.tz + s * (params.ry * point.x - params.rx * point.y + point.z)
    };
  }

  function invertHelmert(point, params) {
    const s = 1 + params.scale;
    const x = (point.x - params.tx) / s;
    const y = (point.y - params.ty) / s;
    const z = (point.z - params.tz) / s;
    const matrix = [
      [1, params.rz, -params.ry],
      [-params.rz, 1, params.rx],
      [params.ry, -params.rx, 1]
    ];
    return solve3x3(matrix, [x, y, z]);
  }

  function solve3x3(matrix, vector) {
    const m = matrix.map((row, index) => row.concat(vector[index]));

    for (let col = 0; col < 3; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < 3; row += 1) {
        if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) {
          pivot = row;
        }
      }
      [m[col], m[pivot]] = [m[pivot], m[col]];

      const divisor = m[col][col];
      for (let item = col; item < 4; item += 1) {
        m[col][item] /= divisor;
      }

      for (let row = 0; row < 3; row += 1) {
        if (row === col) continue;
        const factor = m[row][col];
        for (let item = col; item < 4; item += 1) {
          m[row][item] -= factor * m[col][item];
        }
      }
    }

    return { x: m[0][3], y: m[1][3], z: m[2][3] };
  }

  function parseNumber(value, label) {
    const number = Number(String(value).replace(/,/g, "").trim());
    if (!Number.isFinite(number)) {
      throw new Error(`Please enter a valid ${label}.`);
    }
    return number;
  }

  function validateLatLon(latitude, longitude) {
    validateLatLonValue(latitude, "latitude");
    validateLatLonValue(longitude, "longitude");
  }

  function validateLatLonValue(value, label) {
    if (label === "latitude" && (value < -90 || value > 90)) {
      throw new Error("Latitude must be between -90 and 90 degrees.");
    }
    if (label === "longitude" && (value < -180 || value > 180)) {
      throw new Error("Longitude must be between -180 and 180 degrees.");
    }
  }

  function formatDms(decimal, type) {
    const direction = type === "lat"
      ? (decimal < 0 ? "S" : "N")
      : (decimal < 0 ? "W" : "E");
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minuteFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minuteFloat);
    const seconds = (minuteFloat - minutes) * 60;
    return `${degrees}° ${minutes}' ${seconds.toFixed(3)}" ${direction}`;
  }

  function formatCrsName(crs, zone, hemisphere) {
    if (crs.crsType === "geographic") {
      return crs.displayName;
    }
    if (crs.id === "WGS84_UTM") {
      return `WGS84 / UTM Zone ${zone}${hemisphere}, Easting and Northing`;
    }
    return `${crs.displayName} Zone ${zone}, Easting and Northing`;
  }

  function getBaseCrsDisplayName(crs) {
    if (crs.crsType === "geographic") {
      return crs.displayName;
    }
    if (crs.id === "WGS84_UTM") {
      return "WGS84 / UTM, Easting and Northing";
    }
    return `${crs.displayName}, Easting and Northing`;
  }

  function geographicNameForDatum(datumOrFrame) {
    if (datumOrFrame === "WGS84") return "WGS84 geographic latitude and longitude";
    if (datumOrFrame === "GDA2020") return "GDA2020 geographic latitude and longitude";
    if (datumOrFrame === "GDA94") return "GDA94 geographic latitude and longitude";
    return `${datumOrFrame} geographic latitude and longitude`;
  }

  function formatEpsg(crs, zone, hemisphere) {
    return typeof crs.epsgCode === "function"
      ? crs.epsgCode({ zone, hemisphere })
      : crs.epsgCode;
  }

  function getCrs(id) {
    return CRS_REGISTRY[id];
  }

  function findTransformation(sourceDatumOrFrame, targetDatumOrFrame) {
    return TRANSFORMATION_REGISTRY.find((item) =>
      item.sourceDatumOrFrame === sourceDatumOrFrame &&
      item.targetDatumOrFrame === targetDatumOrFrame
    );
  }

  function appearsInsideAustralia(latitude, longitude) {
    return latitude >= -45 && latitude <= -8 && longitude >= 110 && longitude <= 155;
  }

  function longitudeFitsZone(longitude, zone) {
    const centre = centralMeridian(zone);
    return longitude >= centre - 3 && longitude <= centre + 3;
  }

  function latitudeToUtmBand(latitude) {
    const bands = "CDEFGHJKLMNPQRSTUVWX";
    if (latitude <= -80) return "C";
    if (latitude >= 84) return "X";
    return bands[Math.floor((latitude + 80) / 8)];
  }

  function centralMeridian(zone) {
    return zone * 6 - 183;
  }

  function normalizeLongitudeDegrees(value) {
    return ((value + 540) % 360) - 180;
  }

  function normalizeLongitudeRadians(value) {
    return ((value + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  }

  function range(start, end) {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  function showResult(lines) {
    if (Array.isArray(lines)) {
      controls.resultOutput.textContent = lines.join("\n");
      controls.resultOutput.dataset.copyText = lines.join("\n");
      showMessage("Conversion complete.");
      return;
    }

    controls.resultOutput.dataset.copyText = lines.plainText;
    controls.resultOutput.innerHTML = "";

    const title = document.createElement("h3");
    title.textContent = lines.targetName;
    controls.resultOutput.appendChild(title);

    const actionRow = document.createElement("div");
    actionRow.className = "result-action-row";
    const copyCoordinates = document.createElement("button");
    copyCoordinates.type = "button";
    copyCoordinates.className = "mini-copy-button";
    copyCoordinates.textContent = "Copy Coordinates";
    copyCoordinates.addEventListener("click", () => copyText(buildCoordinateCopyText(lines.values), "Coordinates copied."));
    actionRow.appendChild(copyCoordinates);
    controls.resultOutput.appendChild(actionRow);

    const valueGrid = document.createElement("div");
    valueGrid.className = "result-value-grid";
    lines.values.forEach((item) => {
      const card = document.createElement("div");
      card.className = "result-value-card";
      const label = document.createElement("span");
      label.textContent = item.label;
      const value = document.createElement("strong");
      value.textContent = item.value;
      const unit = document.createElement("small");
      unit.textContent = item.unit;
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "value-copy-button";
      copyButton.textContent = `Copy ${item.label}`;
      copyButton.addEventListener("click", () => copyText(item.value, `${item.label} copied.`));
      card.append(label, value);
      if (item.unit) card.appendChild(unit);
      card.appendChild(copyButton);
      valueGrid.appendChild(card);
    });
    controls.resultOutput.appendChild(valueGrid);

    const metadata = document.createElement("details");
    metadata.className = "result-details";
    const metadataSummary = document.createElement("summary");
    metadataSummary.textContent = "Metadata and operation plan";
    metadata.appendChild(metadataSummary);
    const metadataList = document.createElement("dl");
    lines.metadata.forEach((item) => {
      const dt = document.createElement("dt");
      dt.textContent = item.label;
      const dd = document.createElement("dd");
      dd.textContent = item.value;
      metadataList.append(dt, dd);
    });
    metadata.appendChild(metadataList);
    controls.resultOutput.appendChild(metadata);

    if (lines.notes.length) {
      const notePanel = document.createElement("div");
      notePanel.className = "method-note-panel";
      lines.notes.forEach((note) => {
        const p = document.createElement("p");
        p.textContent = note;
        notePanel.appendChild(p);
      });
      controls.resultOutput.appendChild(notePanel);
    }
    showMessage("Conversion complete.");
  }

  function showMessage(text) {
    controls.message.textContent = text;
    controls.message.classList.remove("error");
  }

  function showError(text) {
    controls.message.textContent = text;
    controls.message.classList.add("error");
  }

  function clearMessage() {
    controls.message.textContent = "";
    controls.message.classList.remove("error");
  }

  async function copyResult() {
    const text = (controls.resultOutput.dataset.copyText || "").trim();
    if (!text) {
      showError("There is no result to copy yet.");
      return;
    }
    await copyText(text, "Result copied.");
  }

  async function copyText(text, successMessage) {
    if (!text) {
      showError("There is no value to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showMessage(successMessage);
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showMessage(successMessage);
    }
  }

  function buildCoordinateCopyText(values) {
    return values.slice(0, 2).map((item) => item.value).join(", ");
  }

  function clearForm() {
    controls.form.reset();
    populateCrsSelectors();
    syncUiFromState();
    controls.resultOutput.dataset.copyText = "";
    controls.resultOutput.innerHTML = '<p class="empty-result">Enter a coordinate and choose Convert.</p>';
    clearMessage();
  }

  window.CoordinateConverter = {
    CRS_REGISTRY,
    TRANSFORMATION_REGISTRY,
    normaliseGeographicInput,
    parseDms,
    parseFieldAppUtmText,
    validateInputCoordinate,
    validateCrsAreaOfUse,
    resolveOperationPlan,
    convertGeographicToGrid,
    convertGridToGeographic,
    transformDatumIfRequired,
    formatResult,
    buildResultMetadata
  };
})();
