/**
 * Crop Health Monitoring Dashboard
 * Google Earth Engine (JavaScript API)
 *
 * Written by: Faseeh
 * BS Geography, University of Gujrat
 *
 * Pakistan > Province > District > Tehsil cascading selector.
 * Layers and statistics load automatically when any option changes.
 * Cloud masking uses Cloud Score+ (works well over snow and mountains,
 * e.g. Gilgit-Baltistan).
 */

ui.root.clear();

/**
 * 1. NAMESPACE & GLOBAL CONFIGURATION
 */
var CropDash = {};

CropDash.Config = {

  assets: {
    country: 'projects/ee-faseehtahir105/assets/Pakistan',
    districts: 'projects/ee-faseehtahir105/assets/Pakistan_Districts',
    tehsils: 'projects/ee-faseehtahir105/assets/Pakistan_Tehsil'
  },

  // Leave '' to auto-detect column names (printed in the Console).
  // If detection picks the wrong column, type the exact name here.
  fields: {
    districts: { province: '', district: '' },
    tehsils:   { province: '', district: '', tehsil: '' }
  },

  fieldCandidates: {
    province: ['ADM1_EN', 'PROVINCE', 'Province', 'province', 'PROVINCE_N', 'NAME_1', 'ADM1_NAME'],
    district: ['ADM2_EN', 'DISTRICT', 'District', 'district', 'DISTRICT_N', 'NAME_2', 'ADM2_NAME'],
    tehsil:   ['ADM3_EN', 'TEHSIL', 'Tehsil', 'tehsil', 'TEHSIL_N', 'NAME_3', 'ADM3_NAME']
  },
  fieldRegex: {
    province: /prov|adm1|name_1/i,
    district: /dist|adm2|name_2/i,
    tehsil:   /teh|tah|adm3|name_3/i
  },

  ALL: '__ALL__',

  // Cloud Score+ threshold: pixels with cs_cdf >= this value are kept.
  // Lower (0.4) = more pixels kept, Higher (0.6) = stricter.
  cloudScorePlusThreshold: 0.5,

  // SPEED SETTINGS per administrative level.
  // cloudMax is a loose scene-level pre-filter (Cloud Score+ does the real
  // per-pixel masking). outlineClose = distance (m) used to close gaps
  // between neighbouring polygons so only the OUTER edge is drawn.
  levels: {
    country:  { scale: 1500, maxError: 1000, cloudMax: 40, tileScale: 16, outlineClose: 3000 },
    province: { scale: 500,  maxError: 300,  cloudMax: 60, tileScale: 8,  outlineClose: 1500 },
    district: { scale: 120,  maxError: 100,  cloudMax: 60, tileScale: 4,  outlineClose: 0 },
    tehsil:   { scale: 60,   maxError: 50,   cloudMax: 70, tileScale: 4,  outlineClose: 0 }
  },

  limits: {
    maxPixelsInteractive: 1e9,
    lstScaleFloor: 1000,
    chirpsScaleFloor: 5566
  },

  seasons: {
    rabi:   { label: 'Rabi / Wheat',  startMonth: 10, startDay: 1, endMonth: 5,  endDay: 31, spansYearBoundary: true },
    kharif: { label: 'Kharif / Rice', startMonth: 4,  startDay: 1, endMonth: 12, endDay: 31, spansYearBoundary: false }
  },

  kpiThresholds: {
    healthyNdvi: 0.5,
    stressedNdvi: 0.3,
    waterGoodNdwi: 0.1,
    waterModerateNdwi: -0.1
  },

  // Black & white interface
  styles: {
    leftPanel:  { width: '340px', padding: '15px', backgroundColor: '#FFFFFF', stretch: 'vertical' },
    rightPanel: { width: '410px', padding: '12px', backgroundColor: '#FFFFFF', stretch: 'vertical' },
    cardPanel:  { padding: '10px', margin: '6px 0', backgroundColor: '#FFFFFF', border: '1px solid #000000' },
    header:     { fontSize: '18px', fontWeight: 'bold', color: '#000000', margin: '6px 0 10px 0', backgroundColor: '#FFFFFF' },
    subHeader:  { fontSize: '12px', fontWeight: 'bold', color: '#000000', margin: '8px 0 6px 0', backgroundColor: '#FFFFFF' },
    text:       { fontSize: '12px', color: '#212121', margin: '3px 0', backgroundColor: '#FFFFFF' },
    hint:       { fontSize: '10px', color: '#757575', margin: '2px 0 6px 0', backgroundColor: '#FFFFFF' },
    errorText:  { fontSize: '12px', fontWeight: 'bold', color: '#000000', margin: '3px 0', backgroundColor: '#FFFFFF' },
    warnText:   { fontSize: '11px', color: '#424242', margin: '3px 0', backgroundColor: '#FFFFFF' },
    loadingText:{ fontSize: '12px', color: '#616161', margin: '3px 0', backgroundColor: '#FFFFFF' },
    divider:    { margin: '8px 0', height: '1px', backgroundColor: '#000000' }
  },

  palettes: {
    ndvi: ['#FFFFFF', '#CE7E45', '#DF923D', '#F1B555', '#FCD163', '#99B718', '#74A901', '#66A000', '#529400', '#3E8601', '#207401', '#056201', '#004C00'],
    evi:  ['#FFFFFF', '#FCD163', '#99B718', '#66A000', '#3E8601', '#004C00'],
    savi: ['#FFFFFF', '#FCD163', '#99B718', '#66A000', '#3E8601', '#004C00'],
    ndwi: ['#8B4513', '#F5DEB3', '#FFFFFF', '#BA55D3', '#0000FF', '#00008B'],
    lst:  ['#040274', '#0502a3', '#0502ce', '#0602ff', '#235cb1', '#307ef3', '#269db1', '#30c8e2', '#32d3ef', '#3be285', '#3ff38f', '#86e26f', '#3ae237', '#b5e22e', '#d6e21f', '#fff705', '#ffd611', '#ffb613', '#ff8b13', '#ff6e08', '#ff5014', '#ff0000'],
    rain: ['#FFFFFF', '#C6DBEF', '#6BAED6', '#2171B5', '#08306B'],
    cls:  ['#C62828', '#F9A825', '#2E7D32']
  },

  // Single source of truth for every map layer.
  // source: s2 = Sentinel-2 composite, lst = MODIS, rain = CHIRPS, cls = NDVI classes
  layerDefinitions: [
    { key: 'NDVI', label: 'NDVI (Vegetation Index)',    source: 's2',   bands: ['NDVI'],           min: 0,    max: 1,   palette: 'ndvi', visible: true },
    { key: 'EVI',  label: 'EVI (Enhanced Veg Index)',   source: 's2',   bands: ['EVI'],            min: 0,    max: 1,   palette: 'evi' },
    { key: 'SAVI', label: 'SAVI (Soil Adjusted Index)', source: 's2',   bands: ['SAVI'],           min: 0,    max: 1,   palette: 'savi' },
    { key: 'NDWI', label: 'NDWI (Water Index)',         source: 's2',   bands: ['NDWI'],           min: -0.5, max: 0.5, palette: 'ndwi' },
    { key: 'LST',  label: 'LST (Surface Temp, °C)',     source: 'lst',  bands: ['LST'],            min: 15,   max: 45,  palette: 'lst' },
    { key: 'RAIN', label: 'Rainfall (CHIRPS, mm)',      source: 'rain', bands: ['precipitation'],  min: 0,    max: 500, palette: 'rain' },
    { key: 'CLASS',label: 'Vegetation Health Classes',  source: 'cls',  bands: ['CLASS'],          min: 1,    max: 3,   palette: 'cls' },
    { key: 'RGB',  label: 'RGB True Color',             source: 's2',   bands: ['B4', 'B3', 'B2'], min: 0,    max: 0.3, palette: null }
  ]
};

/**
 * 2. ADMIN BOUNDARY MODULE
 */
CropDash.Admin = {

  districtsFC: null,
  tehsilsFC: null,
  detected: { districts: {}, tehsils: {} },

  _pick: function(names, kind, override) {
    if (override) { return override; }
    var cands = CropDash.Config.fieldCandidates[kind];
    for (var i = 0; i < cands.length; i++) {
      if (names.indexOf(cands[i]) !== -1) { return cands[i]; }
    }
    var rx = CropDash.Config.fieldRegex[kind];
    for (var j = 0; j < names.length; j++) {
      if (rx.test(names[j])) { return names[j]; }
    }
    return null;
  },

  detectFields: function(callback) {
    var self = this;
    var cfg = CropDash.Config;
    this.districtsFC = ee.FeatureCollection(cfg.assets.districts);
    this.tehsilsFC = ee.FeatureCollection(cfg.assets.tehsils);

    ee.Dictionary({
      d: this.districtsFC.first().propertyNames(),
      t: this.tehsilsFC.first().propertyNames()
    }).evaluate(function(res, err) {
      if (err || !res) {
        callback('Could not read boundary assets: ' + (err || 'unknown error'));
        return;
      }
      var f = cfg.fields;
      self.detected.districts = {
        province: self._pick(res.d, 'province', f.districts.province),
        district: self._pick(res.d, 'district', f.districts.district)
      };
      self.detected.tehsils = {
        province: self._pick(res.t, 'province', f.tehsils.province),
        district: self._pick(res.t, 'district', f.tehsils.district),
        tehsil: self._pick(res.t, 'tehsil', f.tehsils.tehsil)
      };
      print('Districts asset columns:', res.d);
      print('Tehsil asset columns:', res.t);
      print('Detected fields:', self.detected);

      if (!self.detected.districts.province || !self.detected.districts.district) {
        callback('Could not detect Province/District columns in Pakistan_Districts. Set CropDash.Config.fields.districts manually.');
        return;
      }
      if (!self.detected.tehsils.tehsil) {
        callback('Could not detect the Tehsil column in Pakistan_Tehsil. Set CropDash.Config.fields.tehsils.tehsil manually.');
        return;
      }
      callback(null);
    });
  },

  distinctValues: function(fc, field, callback) {
    fc.aggregate_array(field).distinct().sort().evaluate(function(list, err) {
      if (err) { callback(null, err); return; }
      callback((list || []).filter(function(v) { return v !== null && v !== ''; }), null);
    });
  },

  getProvinces: function(callback) {
    this.distinctValues(this.districtsFC, this.detected.districts.province, callback);
  },

  getDistricts: function(province, callback) {
    var d = this.detected.districts;
    var fc = this.districtsFC.filter(ee.Filter.eq(d.province, province));
    this.distinctValues(fc, d.district, callback);
  },

  getTehsils: function(province, district, callback) {
    var t = this.detected.tehsils;
    var fc = this.tehsilsFC;
    if (t.district) { fc = fc.filter(ee.Filter.eq(t.district, district)); }
    if (t.province) { fc = fc.filter(ee.Filter.eq(t.province, province)); }
    this.distinctValues(fc, t.tehsil, callback);
  },

  levelOf: function(sel) {
    var ALL = CropDash.Config.ALL;
    if (sel.tehsil && sel.tehsil !== ALL) { return 'tehsil'; }
    if (sel.district && sel.district !== ALL) { return 'district'; }
    if (sel.province && sel.province !== ALL) { return 'province'; }
    return 'country';
  },

  buildSelectionFC: function(sel) {
    var cfg = CropDash.Config;
    var d = this.detected.districts;
    var t = this.detected.tehsils;

    if (this.levelOf(sel) === 'tehsil') {
      var fc = this.tehsilsFC.filter(ee.Filter.eq(t.tehsil, sel.tehsil));
      if (t.district) { fc = fc.filter(ee.Filter.eq(t.district, sel.district)); }
      if (t.province) { fc = fc.filter(ee.Filter.eq(t.province, sel.province)); }
      return fc;
    }
    if (this.levelOf(sel) === 'district') {
      return this.districtsFC
        .filter(ee.Filter.eq(d.province, sel.province))
        .filter(ee.Filter.eq(d.district, sel.district));
    }
    if (this.levelOf(sel) === 'province') {
      return this.districtsFC.filter(ee.Filter.eq(d.province, sel.province));
    }
    return ee.FeatureCollection(cfg.assets.country);
  },

  selectionLabel: function(sel) {
    var ALL = CropDash.Config.ALL;
    var parts = [];
    if (sel.tehsil && sel.tehsil !== ALL) { parts.push(sel.tehsil); }
    if (sel.district && sel.district !== ALL) { parts.push(sel.district); }
    if (sel.province && sel.province !== ALL) { parts.push(sel.province); }
    if (parts.length === 0) { parts.push('Pakistan'); }
    return parts.join(', ');
  }
};

/**
 * 3. DATA MODULE
 */
CropDash.Data = {

  addIndices: function(img) {
    var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI').toFloat();
    var ndwi = img.normalizedDifference(['B8', 'B11']).rename('NDWI').toFloat();
    var evi = img.expression('2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      NIR: img.select('B8'), RED: img.select('B4'), BLUE: img.select('B2')
    }).rename('EVI').toFloat();
    var savi = img.expression('1.5 * ((NIR - RED) / (NIR + RED + 0.5))', {
      NIR: img.select('B8'), RED: img.select('B4')
    }).rename('SAVI').toFloat();

    return img.addBands([ndvi, evi, savi, ndwi])
      .select(['NDVI', 'EVI', 'SAVI', 'NDWI', 'B4', 'B3', 'B2'])
      .toFloat()
      .copyProperties(img, ['system:time_start']);
  },

  // Cloud Score+ masks clouds per pixel and handles snow and terrain much
  // better than QA60. cs_cdf >= threshold keeps clear pixels only.
  getSentinelIndexCollection: function(aoi, startDate, endDate, cloudMax) {
    var threshold = CropDash.Config.cloudScorePlusThreshold;
    var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
    return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(aoi)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudMax))
      .linkCollection(csPlus, ['cs_cdf'])
      .map(function(img) {
        var clear = img.select('cs_cdf').gte(threshold);
        return img.select(['B2', 'B3', 'B4', 'B8', 'B11'])
          .updateMask(clear)
          .divide(10000)
          .toFloat()
          .copyProperties(img, ['system:time_start']);
      })
      .map(CropDash.Data.addIndices);
  },

  resolveSeasonDateRange: function(seasonKey, year) {
    var season = CropDash.Config.seasons[seasonKey];
    var startYear = year;
    var endYear = season.spansYearBoundary ? (year + 1) : year;
    var pad = function(n) { return n < 10 ? '0' + n : String(n); };
    var startDate = startYear + '-' + pad(season.startMonth) + '-' + pad(season.startDay);
    var endMonthExclusive = season.endMonth + 1;
    var endYearAdjusted = endYear;
    if (endMonthExclusive > 12) { endMonthExclusive = 1; endYearAdjusted = endYear + 1; }
    var endDate = endYearAdjusted + '-' + pad(endMonthExclusive) + '-01';
    return { startDate: startDate, endDate: endDate, label: season.label + ' ' + startYear };
  },

  getLSTCollection: function(aoi, startDate, endDate) {
    return ee.ImageCollection('MODIS/061/MOD11A1')
      .filterBounds(aoi)
      .filterDate(startDate, endDate)
      .select('LST_Day_1km')
      .map(function(img) {
        return img.multiply(0.02).subtract(273.15).rename('LST').toFloat()
          .copyProperties(img, ['system:time_start']);
      });
  },

  getPrecipitationCollection: function(aoi, startDate, endDate) {
    return ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
      .filterBounds(aoi)
      .filterDate(startDate, endDate)
      .select('precipitation');
  },

  /**
   * Mean over the area, PLUS a centroid sample as a fallback. Coarse
   * datasets (MODIS 1 km, CHIRPS 5 km) can return null for a small tehsil
   * that is smaller than one pixel; the fallback avoids "N/A".
   */
  reduceRobust: function(image, aoi, scale, tileScale) {
    var opts = function(geom) {
      return {
        reducer: ee.Reducer.mean(), geometry: geom, scale: scale,
        bestEffort: true, maxPixels: CropDash.Config.limits.maxPixelsInteractive,
        tileScale: tileScale
      };
    };
    return ee.Dictionary({
      area: image.reduceRegion(opts(aoi)),
      point: image.reduceRegion(opts(aoi.centroid(100)))
    });
  },

  pickValue: function(res, band) {
    if (res && res.area && typeof res.area[band] === 'number') { return res.area[band]; }
    if (res && res.point && typeof res.point[band] === 'number') { return res.point[band]; }
    return null;
  }
};

/**
 * 4. UI
 */
CropDash.UI = {
  listToken: 0,
  selection: { province: null, district: null, tehsil: null },

  init: function() {
    this.createLayout();
    this.setupInteractions();
    this.initAdminDropdowns();
  },

  _makeSelect: function(placeholder) {
    return ui.Select({
      items: [],
      placeholder: placeholder,
      style: { stretch: 'horizontal', margin: '0 0 6px 0' }
    });
  },

  _setItems: function(select, values, allLabel, selectFirst) {
    var items = [{ label: allLabel, value: CropDash.Config.ALL }];
    values.forEach(function(v) { items.push({ label: String(v), value: String(v) }); });
    select.items().reset(items);
    if (selectFirst) { select.setValue(items[0].value, false); }
  },

  _resetSelect: function(select, placeholder) {
    select.items().reset([]);
    select.setValue(null, false);
    select.setPlaceholder(placeholder);
    select.setDisabled(true);
  },

  // A KPI card whose value label can be updated later.
  _makeKpiCard: function(title, caption) {
    var bg = '#F5F5F5';
    var valueLabel = ui.Label('…', { fontSize: '20px', fontWeight: 'bold', color: '#000000', margin: '2px 0', backgroundColor: bg });
    var panel = ui.Panel({
      widgets: [
        ui.Label(title, { fontSize: '11px', fontWeight: 'bold', color: '#000000', margin: '0', backgroundColor: bg }),
        valueLabel,
        ui.Label(caption, { fontSize: '9px', color: '#757575', margin: '0', backgroundColor: bg })
      ],
      layout: ui.Panel.Layout.Flow('vertical'),
      style: { width: '160px', margin: '0 8px 8px 0', padding: '8px', backgroundColor: bg, border: '1px solid #000000' }
    });
    return { panel: panel, value: valueLabel };
  },

  createLayout: function() {
    var cfg = CropDash.Config;
    var S = cfg.styles;
    var th = cfg.kpiThresholds;

    this.map = ui.Map();
    this.map.setOptions('SATELLITE');
    this.map.setControlVisibility({ drawingToolsControl: false, layerList: true, scaleControl: true });
    this.map.setCenter(69.3, 30.4, 5);
    this.map.style().set({ stretch: 'both' });

    // ----- Left panel -----
    this.leftPanel = ui.Panel({ style: S.leftPanel });
    this.leftPanel.add(ui.Label('Crop Health Monitor', S.header));
    this.leftPanel.add(ui.Label('Developed by Faseeh Tahir', {
      fontSize: '11px', color: '#616161', margin: '-6px 0 8px 0', backgroundColor: '#FFFFFF'
    }));
    this.leftPanel.add(ui.Label('', S.divider));

    this.leftPanel.add(ui.Label('STUDY AREA', S.subHeader));

    this.leftPanel.add(ui.Label('1. Country', S.text));
    this.countrySelect = ui.Select({
      items: [{ label: 'Pakistan', value: 'PAK' }],
      value: 'PAK',
      style: { stretch: 'horizontal', margin: '0 0 6px 0' }
    });
    this.leftPanel.add(this.countrySelect);

    this.leftPanel.add(ui.Label('2. Province', S.text));
    this.provinceSelect = this._makeSelect('Loading provinces…');
    this.leftPanel.add(this.provinceSelect);

    this.leftPanel.add(ui.Label('3. District', S.text));
    this.districtSelect = this._makeSelect('Select a province first');
    this.leftPanel.add(this.districtSelect);

    this.leftPanel.add(ui.Label('4. Tehsil', S.text));
    this.tehsilSelect = this._makeSelect('Select a district first');
    this.leftPanel.add(this.tehsilSelect);

    this.leftPanel.add(ui.Label(
      'Layers load automatically as soon as you choose or change an option. "All" at any level analyzes the whole parent area.',
      S.hint
    ));

    this.provinceSelect.setDisabled(true);
    this.districtSelect.setDisabled(true);
    this.tehsilSelect.setDisabled(true);

    this.leftPanel.add(ui.Label('', S.divider));

    this.leftPanel.add(ui.Label('SEASONAL COMPOSITE', S.subHeader));
    this.leftPanel.add(ui.Label(
      'One cloud-masked seasonal median composite (e.g. "Rabi 2023" or "Kharif 2025"). For mountain regions such as Gilgit-Baltistan, Kharif gives the best result.',
      S.hint
    ));

    var years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
    this.seasonSelect = ui.Select({
      items: [
        { label: 'Rabi (Oct - May) / Wheat', value: 'rabi' },
        { label: 'Kharif (Apr - Dec) / Rice', value: 'kharif' }
      ],
      value: 'rabi',
      style: { stretch: 'horizontal', margin: '0 0 6px 0' }
    });
    this.yearSelect = ui.Select({ items: years, value: '2023', style: { stretch: 'horizontal', margin: '0 0 6px 0' } });

    this.leftPanel.add(ui.Label('Season', S.text));
    this.leftPanel.add(this.seasonSelect);
    this.leftPanel.add(ui.Label('Year', S.text));
    this.leftPanel.add(this.yearSelect);

    this.leftPanel.add(ui.Label(
      'Map layers: NDVI (shown), EVI, SAVI, NDWI, LST, Rainfall, Health Classes, RGB. Toggle them from the map layer list. Click the map to inspect pixel values in the Console.',
      S.hint
    ));

    // ----- Right panel -----
    this.rightPanel = ui.Panel({ style: S.rightPanel });
    this.rightPanel.add(ui.Label('Analytics & Summaries', S.header));

    this.statusContainer = ui.Panel({ style: { padding: '0', margin: '0 0 4px 0', backgroundColor: '#FFFFFF' } });
    this.kpiContainer = ui.Panel({ style: S.cardPanel });
    this.statsContainer = ui.Panel({ style: S.cardPanel });
    this.weatherContainer = ui.Panel({ style: S.cardPanel });
    this.pieContainer = ui.Panel({ style: S.cardPanel });

    // --- KPI: 2 x 2 grid ---
    this.kpiContainer.add(ui.Label('KEY PERFORMANCE INDICATORS', S.subHeader));
    this.kpiAreaLabel = ui.Label('', S.hint);
    this.kpiContainer.add(this.kpiAreaLabel);

    this.kpi = {
      healthy: this._makeKpiCard('Healthy Vegetation', 'NDVI ≥ ' + th.healthyNdvi + ' (% of area)'),
      stress:  this._makeKpiCard('Crop Stress', 'NDVI ≤ ' + th.stressedNdvi + ' (% of area)'),
      water:   this._makeKpiCard('Water Availability', 'Based on mean NDWI'),
      lst:     this._makeKpiCard('Average LST', 'Daytime surface temp')
    };
    var row1 = ui.Panel([this.kpi.healthy.panel, this.kpi.stress.panel], ui.Panel.Layout.Flow('horizontal'), { backgroundColor: '#FFFFFF', margin: '0' });
    var row2 = ui.Panel([this.kpi.water.panel, this.kpi.lst.panel], ui.Panel.Layout.Flow('horizontal'), { backgroundColor: '#FFFFFF', margin: '0' });
    this.kpiContainer.add(row1);
    this.kpiContainer.add(row2);

    // --- Stats card ---
    this.statsContainer.add(ui.Label('CROP STATISTICS & AVERAGES', S.subHeader));
    this.statLabels = {};
    var statsRow = ui.Panel({ layout: ui.Panel.Layout.Flow('horizontal'), style: { backgroundColor: '#FFFFFF' } });
    var self = this;
    ['NDVI', 'EVI', 'SAVI', 'NDWI', 'LST'].forEach(function(k) {
      var v = ui.Label('…', { fontSize: '13px', fontWeight: 'bold', color: '#000000', backgroundColor: '#FFFFFF' });
      self.statLabels[k] = v;
      statsRow.add(ui.Panel([
        ui.Label(k === 'LST' ? 'LST (°C)' : k, { fontSize: '10px', color: '#757575', backgroundColor: '#FFFFFF' }),
        v
      ], ui.Panel.Layout.Flow('vertical'), { margin: '0 14px 4px 0', backgroundColor: '#FFFFFF' }));
    });
    this.statsContainer.add(statsRow);
    this.scenesLabel = ui.Label('Sentinel-2 scenes used: …', S.hint);
    this.statsContainer.add(this.scenesLabel);

    // --- Weather card ---
    this.weatherContainer.add(ui.Label('WEATHER & HYDROLOGY SUMMARY', S.subHeader));
    this.rainLabel = ui.Label('Total accumulated rainfall (CHIRPS): …', S.text);
    this.weatherContainer.add(this.rainLabel);
    this.seasonWindowLabel = ui.Label('', S.hint);
    this.weatherContainer.add(this.seasonWindowLabel);

    this.rightPanel.add(this.statusContainer);
    this.rightPanel.add(this.kpiContainer);
    this.rightPanel.add(this.statsContainer);
    this.rightPanel.add(this.weatherContainer);
    this.rightPanel.add(this.pieContainer);

    this.pieContainer.add(ui.Label('VEGETATION HEALTH DISTRIBUTION', S.subHeader));
    this.pieContainer.add(ui.Label('Choose an area to see the chart.', S.hint));

    var centerRight = ui.Panel({
      widgets: [this.map, this.rightPanel],
      layout: ui.Panel.Layout.Flow('horizontal'),
      style: { stretch: 'both' }
    });

    ui.root.widgets().reset([ui.SplitPanel({
      firstPanel: this.leftPanel,
      secondPanel: centerRight,
      orientation: 'horizontal',
      wipe: false
    })]);
  },

  initAdminDropdowns: function() {
    var self = this;
    this.setStatus('Reading boundary assets…', 'loading');

    CropDash.Admin.detectFields(function(fieldErr) {
      if (fieldErr) {
        self.setStatus(fieldErr, 'error');
        self.provinceSelect.setPlaceholder('Boundary load failed');
        return;
      }
      CropDash.Admin.getProvinces(function(provinces, err) {
        if (err) { self.setStatus('Could not load provinces: ' + err, 'error'); return; }

        self._setItems(self.provinceSelect, provinces, '— All of Pakistan —', false);
        self.provinceSelect.setPlaceholder('Select province');
        self.provinceSelect.setDisabled(false);
        self.setStatus('Boundaries loaded. Select a province (or All of Pakistan) to load the layers.', null);

        self.provinceSelect.onChange(function(v) { self.onProvinceChange(v); });
        self.districtSelect.onChange(function(v) { self.onDistrictChange(v); });
        self.tehsilSelect.onChange(function(v) { self.onTehsilChange(v); });
        self.seasonSelect.onChange(function() { self.updateDashboard(); });
        self.yearSelect.onChange(function() { self.updateDashboard(); });
      });
    });
  },

  onProvinceChange: function(province) {
    var self = this;
    var ALL = CropDash.Config.ALL;
    var token = ++this.listToken;
    if (!province) { return; }

    this.selection.province = province;
    this.selection.district = null;
    this.selection.tehsil = null;
    this._resetSelect(this.districtSelect, 'Select a province first');
    this._resetSelect(this.tehsilSelect, 'Select a district first');

    this.updateDashboard();

    if (province === ALL) { return; }
    this.districtSelect.setPlaceholder('Loading districts…');
    CropDash.Admin.getDistricts(province, function(list, err) {
      if (token !== self.listToken) { return; }
      if (err) { self.setStatus('Could not load districts: ' + err, 'error'); return; }
      self._setItems(self.districtSelect, list, '— All districts —', true);
      self.districtSelect.setDisabled(false);
      self.selection.district = ALL;
    });
  },

  onDistrictChange: function(district) {
    var self = this;
    var ALL = CropDash.Config.ALL;
    var token = ++this.listToken;
    if (!district) { return; }

    this.selection.district = district;
    this.selection.tehsil = null;
    this._resetSelect(this.tehsilSelect, 'Select a district first');

    this.updateDashboard();

    if (district === ALL) { return; }
    this.tehsilSelect.setPlaceholder('Loading tehsils…');
    CropDash.Admin.getTehsils(this.selection.province, district, function(list, err) {
      if (token !== self.listToken) { return; }
      if (err) { self.setStatus('Could not load tehsils: ' + err, 'error'); return; }
      self._setItems(self.tehsilSelect, list, '— All tehsils —', true);
      self.tehsilSelect.setDisabled(false);
      self.selection.tehsil = ALL;
    });
  },

  onTehsilChange: function(tehsil) {
    if (!tehsil) { return; }
    this.selection.tehsil = tehsil;
    this.updateDashboard();
  },

  setupInteractions: function() {
    this.map.onClick(function(coords) {
      var img = CropDash.App.currentImage;
      if (!img) { return; }
      var point = ee.Geometry.Point([coords.lon, coords.lat]);
      img.reduceRegion({
        reducer: ee.Reducer.mean(), geometry: point, scale: 100,
        bestEffort: true, tileScale: 4
      }).evaluate(function(val, err) {
        if (err) { print('Field Inspector error: ' + err); return; }
        print('Pixel sample at [' + coords.lon.toFixed(3) + ', ' + coords.lat.toFixed(3) + ']:', val);
      });
    });
  },

  setStatus: function(message, kind) {
    var S = CropDash.Config.styles;
    this.statusContainer.clear();
    if (!message) { return; }
    var style = S.loadingText;
    if (kind === 'error') { style = S.errorText; }
    if (kind === 'warn') { style = S.warnText; }
    this.statusContainer.add(ui.Label((kind === 'error' ? 'Error: ' : '') + message, style));
  },

  /** Puts every card into a "loading" state so stale numbers never linger. */
  resetCards: function() {
    var S = CropDash.Config.styles;
    this.kpi.healthy.value.setValue('…');
    this.kpi.stress.value.setValue('…');
    this.kpi.water.value.setValue('…');
    this.kpi.lst.value.setValue('…');
    for (var k in this.statLabels) { this.statLabels[k].setValue('…'); }
    this.scenesLabel.setValue('Sentinel-2 scenes used: …');
    this.rainLabel.setValue('Total accumulated rainfall (CHIRPS): …');
    this.pieContainer.clear();
    this.pieContainer.add(ui.Label('VEGETATION HEALTH DISTRIBUTION', S.subHeader));
    this.pieContainer.add(ui.Label('Computing…', S.loadingText));
  },

  /**
   * Builds ONE clean outer outline for the selection.
   * Province/country: neighbouring polygons are merged, then the geometry is
   * buffered OUT (closing tiny gaps between districts) and back IN, so only
   * the outer edge is painted. District/tehsil: painted directly.
   */
  buildOutlineImage: function(fc, lvl) {
    var geom = fc.geometry(lvl.maxError);
    if (lvl.outlineClose > 0) {
      geom = geom
        .buffer(lvl.outlineClose, lvl.maxError)
        .buffer(-lvl.outlineClose, lvl.maxError);
    }
    return ee.Image().byte().paint({
      featureCollection: ee.FeatureCollection([ee.Feature(geom)]),
      color: 1,
      width: 2
    });
  },

  /**
   * Evaluates an EE object and caches the result, so going back to an
   * area/season already computed is instant. Stale runs never touch the UI.
   */
  fetchStat: function(key, eeObject, token, cb) {
    var cache = CropDash.App.cache;
    if (cache[key] !== undefined) {
      cb(cache[key], null);
      return;
    }
    eeObject.evaluate(function(res, err) {
      if (!err && res !== null && res !== undefined) { cache[key] = res; }
      if (!CropDash.App.isCurrentRun(token)) { return; }
      cb(res, err);
    });
  },

  /**
   * AUTOMATIC PIPELINE:
   *  1) map layers are added immediately (tiles load lazily in parallel)
   *  2) four independent statistics requests run IN PARALLEL
   *  3) each card fills in as soon as its own result arrives
   */
  updateDashboard: function() {
    var self = this;
    var App = CropDash.App;
    var cfg = CropDash.Config;
    var S = cfg.styles;
    var th = cfg.kpiThresholds;
    var sel = {
      province: this.selection.province,
      district: this.selection.district,
      tehsil: this.selection.tehsil
    };
    if (!sel.province) { return; }

    var token = ++App.runToken;
    var level = CropDash.Admin.levelOf(sel);
    var lvl = cfg.levels[level];
    var areaLabel = CropDash.Admin.selectionLabel(sel);
    var seasonKey = this.seasonSelect.getValue();
    var year = parseInt(this.yearSelect.getValue(), 10);
    var season = CropDash.Data.resolveSeasonDateRange(seasonKey, year);
    var cacheBase = areaLabel + '|' + seasonKey + '|' + year;

    this.map.layers().reset();
    this.resetCards();
    this.kpiAreaLabel.setValue(areaLabel + ' · ' + season.label);
    this.seasonWindowLabel.setValue('Season window: ' + season.startDate + ' to ' + season.endDate + ' (end exclusive)');
    this.setStatus('Loading ' + areaLabel + ' · ' + season.label + '…', 'loading');
    App.currentAreaLabel = areaLabel;

    var fc, aoi;
    try {
      fc = CropDash.Admin.buildSelectionFC(sel);
      aoi = fc.geometry(lvl.maxError);
    } catch (e) {
      this.setStatus('Could not build the selected area: ' + e, 'error');
      return;
    }
    App.currentAOI = aoi;

    // ---- Images ----
    var s2col = CropDash.Data.getSentinelIndexCollection(aoi, season.startDate, season.endDate, lvl.cloudMax);
    var s2Median = s2col.median().clip(aoi).toFloat();
    var lstMedian = CropDash.Data.getLSTCollection(aoi, season.startDate, season.endDate).median().clip(aoi).toFloat();
    var totalPrecip = CropDash.Data.getPrecipitationCollection(aoi, season.startDate, season.endDate).sum().clip(aoi).toFloat();

    var ndvi = s2Median.select('NDVI');
    var classImg = ee.Image(2)
      .where(ndvi.lte(th.stressedNdvi), 1)
      .where(ndvi.gte(th.healthyNdvi), 3)
      .updateMask(ndvi.mask())
      .rename('CLASS').toFloat();

    var sources = { s2: s2Median, lst: lstMedian, rain: totalPrecip, cls: classImg };
    App.currentImage = s2Median;
    App.currentLayerImages = sources;

    // ---- Map layers (added immediately, tiles load lazily) ----
    cfg.layerDefinitions.slice().reverse().forEach(function(def) {
      var vis = { bands: def.bands, min: def.min, max: def.max };
      if (def.palette) { vis.palette = cfg.palettes[def.palette]; }
      self.map.addLayer(sources[def.source], vis, def.label + ' — ' + season.label, def.visible === true);
    });

    // Single outer boundary outline on top (no inner district borders)
    this.map.addLayer(this.buildOutlineImage(fc, lvl), { palette: ['FFFFFF'] }, 'Boundary', true);

    // Zoom to the area
    this.map.centerObject(aoi.bounds(lvl.maxError));

    // ---- Parallel statistics ----
    var pending = 4;
    var hadError = false;
    var done = function(failed) {
      if (failed) { hadError = true; }
      pending--;
      if (pending === 0 && !hadError) {
        self.setStatus(areaLabel + ' · ' + season.label + ' — analysis complete (stats scale: ' + lvl.scale + ' m).', null);
      }
    };

    // (1) Sentinel-2: indices + class shares in ONE reduction
    var indicators = ee.Image.cat([
      ndvi.gte(th.healthyNdvi).rename('healthy'),
      ndvi.gt(th.stressedNdvi).and(ndvi.lt(th.healthyNdvi)).rename('moderate'),
      ndvi.lte(th.stressedNdvi).rename('stressed')
    ]).toFloat();
    var s2Stats = s2Median.select(['NDVI', 'EVI', 'SAVI', 'NDWI']).addBands(indicators).reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: aoi,
      scale: lvl.scale,
      bestEffort: true,
      maxPixels: cfg.limits.maxPixelsInteractive,
      tileScale: lvl.tileScale
    });
    this.fetchStat(cacheBase + '|s2', s2Stats, token, function(res, err) {
      if (err || !res || typeof res.NDVI !== 'number') {
        self.setStatus('Sentinel-2 statistics unavailable (no cloud-free imagery for this area/season?). ' + (err || ''), 'error');
        self.kpi.healthy.value.setValue('N/A');
        self.kpi.stress.value.setValue('N/A');
        self.kpi.water.value.setValue('N/A');
        self.pieContainer.clear();
        self.pieContainer.add(ui.Label('VEGETATION HEALTH DISTRIBUTION', S.subHeader));
        self.pieContainer.add(ui.Label('No data available for this selection.', S.warnText));
        ['NDVI', 'EVI', 'SAVI', 'NDWI'].forEach(function(k) { self.statLabels[k].setValue('N/A'); });
        done(true);
        return;
      }
      self.renderS2Stats(res, th);
      done(false);
    });

    // (2) LST
    var lstRes = CropDash.Data.reduceRobust(lstMedian, aoi, Math.max(lvl.scale, cfg.limits.lstScaleFloor), lvl.tileScale);
    this.fetchStat(cacheBase + '|lst', lstRes, token, function(res, err) {
      var v = err ? null : CropDash.Data.pickValue(res, 'LST');
      self.kpi.lst.value.setValue(v !== null ? v.toFixed(0) + ' °C' : 'N/A');
      self.statLabels.LST.setValue(v !== null ? v.toFixed(1) : 'N/A');
      done(false);
    });

    // (3) Rainfall
    var rainScale = Math.max(lvl.scale, cfg.limits.chirpsScaleFloor);
    var rainRes = CropDash.Data.reduceRobust(totalPrecip, aoi, rainScale, lvl.tileScale);
    this.fetchStat(cacheBase + '|rain', rainRes, token, function(res, err) {
      var v = err ? null : CropDash.Data.pickValue(res, 'precipitation');
      self.rainLabel.setValue('Total accumulated rainfall (CHIRPS): ' + (v !== null ? v.toFixed(0) + ' mm' : 'N/A'));
      done(false);
    });

    // (4) Number of Sentinel-2 scenes
    this.fetchStat(cacheBase + '|n', s2col.size(), token, function(n, err) {
      if (err || n === null || n === undefined) {
        self.scenesLabel.setValue('Sentinel-2 scenes used: N/A');
      } else {
        self.scenesLabel.setValue('Sentinel-2 scenes used: ' + n);
        if (n === 0) {
          self.setStatus('No Sentinel-2 scenes found for ' + areaLabel + ' · ' + season.label + '. Try another season/year.', 'error');
        }
      }
      done(false);
    });
  },

  renderS2Stats: function(res, th) {
    var S = CropDash.Config.styles;
    var fmt = function(v, d) { return (typeof v === 'number' && !isNaN(v)) ? v.toFixed(d) : 'N/A'; };

    this.statLabels.NDVI.setValue(fmt(res.NDVI, 3));
    this.statLabels.EVI.setValue(fmt(res.EVI, 3));
    this.statLabels.SAVI.setValue(fmt(res.SAVI, 3));
    this.statLabels.NDWI.setValue(fmt(res.NDWI, 3));

    var h = (typeof res.healthy === 'number') ? res.healthy : 0;
    var m = (typeof res.moderate === 'number') ? res.moderate : 0;
    var st = (typeof res.stressed === 'number') ? res.stressed : 0;
    var total = h + m + st;

    var healthyPct = null, moderatePct = null, stressedPct = null;
    if (total > 0) {
      healthyPct = h / total * 100;
      moderatePct = m / total * 100;
      stressedPct = st / total * 100;
    }
    this.kpi.healthy.value.setValue(healthyPct !== null ? healthyPct.toFixed(0) + '%' : 'N/A');
    this.kpi.stress.value.setValue(stressedPct !== null ? stressedPct.toFixed(0) + '%' : 'N/A');

    var waterLabel = 'N/A';
    if (typeof res.NDWI === 'number') {
      if (res.NDWI >= th.waterGoodNdwi) { waterLabel = 'Good'; }
      else if (res.NDWI >= th.waterModerateNdwi) { waterLabel = 'Moderate'; }
      else { waterLabel = 'Low'; }
    }
    this.kpi.water.value.setValue(waterLabel);

    // Colored pie chart (built client-side, no extra server request)
    this.pieContainer.clear();
    this.pieContainer.add(ui.Label('VEGETATION HEALTH DISTRIBUTION', S.subHeader));
    if (healthyPct === null) {
      this.pieContainer.add(ui.Label('Area breakdown unavailable.', S.warnText));
      return;
    }
    var pie = ui.Chart(
      [
        ['Class', 'Share (%)'],
        ['Healthy', Number(healthyPct.toFixed(1))],
        ['Moderate', Number(moderatePct.toFixed(1))],
        ['Stressed', Number(stressedPct.toFixed(1))]
      ],
      'PieChart',
      {
        colors: ['#2E7D32', '#F9A825', '#C62828'],
        pieHole: 0.4,
        height: '210px',
        backgroundColor: '#FFFFFF',
        pieSliceText: 'percentage',
        pieSliceTextStyle: { color: '#FFFFFF', fontSize: 11, bold: true },
        pieSliceBorderColor: '#FFFFFF',
        sliceVisibilityThreshold: 0,
        legend: { position: 'right', textStyle: { fontSize: 11, color: '#000000' } },
        chartArea: { left: 10, top: 10, width: '95%', height: '85%' }
      }
    );
    this.pieContainer.add(pie);
    this.pieContainer.add(ui.Label(
      'Healthy ≥ ' + th.healthyNdvi + ' NDVI · Stressed ≤ ' + th.stressedNdvi + ' NDVI · share of valid (cloud-free) pixels',
      { fontSize: '9px', color: '#9E9E9E', margin: '2px 0 0 0', backgroundColor: '#FFFFFF' }
    ));
  }
};

/**
 * 5. APPLICATION BOOTSTRAP
 */
CropDash.App = {
  currentImage: null,
  currentAOI: null,
  currentAreaLabel: 'Pakistan',
  currentLayerImages: null,
  cache: {},
  runToken: 0,
  isCurrentRun: function(token) { return token === CropDash.App.runToken; },
  run: function() { CropDash.UI.init(); }
};

CropDash.App.run();
