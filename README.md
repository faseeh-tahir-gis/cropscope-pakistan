# CropScope Pakistan

An interactive Google Earth Engine web app for monitoring crop and vegetation health anywhere in Pakistan, from the national level down to a single tehsil.

**Live app:** https://ee-faseehtahir105.projects.earthengine.app/view/cropscope-pakistan

**Author:** Faseeh Tahir, BS Geography, University of Gujrat

---

## What it does

Pick a location (Pakistan, Province, District, Tehsil) and a season and year. The app builds a cloud-masked seasonal composite and shows maps and summary statistics for that area. Everything updates automatically when you change an option.

**Map layers**

| Layer | Source | Notes |
|---|---|---|
| NDVI (shown by default) | Sentinel-2 | Vegetation greenness |
| EVI | Sentinel-2 | Enhanced vegetation index |
| SAVI | Sentinel-2 | Soil-adjusted vegetation index |
| NDWI | Sentinel-2 (NIR, SWIR1) | Moisture/water index |
| Land surface temperature (°C) | MODIS MOD11A1 | Daytime, 1 km |
| Rainfall (mm) | CHIRPS Daily | Total over the season, ~5.5 km |
| Vegetation health classes | Derived from NDVI | Stressed / Moderate / Healthy |
| RGB true colour | Sentinel-2 | Bands B4, B3, B2 |

**Dashboard cards**

- Key indicators: % healthy vegetation, % crop stress, water availability (Good / Moderate / Low), average land surface temperature
- Mean NDVI, EVI, SAVI, NDWI and LST
- Number of Sentinel-2 scenes used
- Total accumulated rainfall for the season
- Donut chart of the vegetation health distribution
- Click anywhere on the map to print pixel values to the Console

**Seasons**

| Season | Window |
|---|---|
| Rabi / Wheat | 1 October of the selected year to 31 May of the next year |
| Kharif / Rice | 1 April to 31 December of the selected year |

Years 2015 to 2025 are available. For mountain regions such as Gilgit-Baltistan, Kharif usually gives the best result.

## Repository structure

```
cropscope-pakistan/
├── README.md
├── LICENSE
├── .gitignore
├── src/
│   └── cropscope_dashboard.js    # the full Earth Engine script
└── docs/
    ├── SETUP.md                  # how to run it in your own Earth Engine account
    └── METHODOLOGY.md            # indices, thresholds, cloud masking, limitations
```

## Quick start

1. Open the [Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Create a new script and paste in the contents of `src/cropscope_dashboard.js`.
3. Upload your own boundary assets and update the three asset paths at the top of the script. See [docs/SETUP.md](docs/SETUP.md).
4. Click **Run**.

The boundary assets (country, districts, tehsils) are private to the author's Earth Engine account, so the script will not run for anyone else until they point it at their own copies.

## Data sources

- Sentinel-2 Surface Reflectance Harmonized: `COPERNICUS/S2_SR_HARMONIZED`
- Cloud Score+ for Sentinel-2: `GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED`
- MODIS Land Surface Temperature: `MODIS/061/MOD11A1`
- CHIRPS Daily precipitation: `UCSB-CHG/CHIRPS/DAILY`
- Administrative boundaries: Pakistan country, district and tehsil layers uploaded as Earth Engine assets

## Limitations

- Results are indicative and are not validated against ground-truth crop data.
- NDVI-based health classes use fixed thresholds (see METHODOLOGY) and do not distinguish crop types from other vegetation.
- Nationwide and province-level runs use coarse scales (500 m to 1.5 km) for speed, so numbers differ from district or tehsil runs.
- Very small tehsils can be smaller than one MODIS or CHIRPS pixel, so a centroid value is used as a fallback.

## License

MIT. See [LICENSE](LICENSE).

## Citation

If you use this app or code, please cite:

> Tahir, F. (2026). *CropScope Pakistan: a Google Earth Engine crop health dashboard.* University of Gujrat.
