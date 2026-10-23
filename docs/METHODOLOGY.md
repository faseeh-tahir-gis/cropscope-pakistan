# Methodology

## Seasonal composite

For the chosen season and year, Sentinel-2 SR Harmonized scenes covering the selected area are:

1. Pre-filtered by scene cloud percentage (`CLOUDY_PIXEL_PERCENTAGE`), with a looser limit for smaller areas: country 40, province 60, district 60, tehsil 70.
2. Masked per pixel with **Cloud Score+** (`cs_cdf`). Pixels with `cs_cdf >= 0.5` are kept. This works better than the QA60 band over snow and mountainous terrain.
3. Scaled to reflectance (divided by 10,000).
4. Reduced to a single **median** composite and clipped to the area.

## Indices

| Index | Formula |
|---|---|
| NDVI | (B8 - B4) / (B8 + B4) |
| NDWI | (B8 - B11) / (B8 + B11) |
| EVI | 2.5 × (B8 - B4) / (B8 + 6×B4 - 7.5×B2 + 1) |
| SAVI | 1.5 × (B8 - B4) / (B8 + B4 + 0.5) |

B2 = blue, B4 = red, B8 = near infrared, B11 = shortwave infrared 1.

## Vegetation health classes

| Class | NDVI rule |
|---|---|
| Stressed | NDVI ≤ 0.3 |
| Moderate | 0.3 < NDVI < 0.5 |
| Healthy | NDVI ≥ 0.5 |

Percentages are the share of valid (cloud-free) pixels in each class.

## Water availability (from mean NDWI)

| Label | Rule |
|---|---|
| Good | NDWI ≥ 0.1 |
| Moderate | -0.1 ≤ NDWI < 0.1 |
| Low | NDWI < -0.1 |

## Land surface temperature

MODIS MOD11A1 `LST_Day_1km`, converted with `value × 0.02 - 273.15` to °C, median over the season.

## Rainfall

CHIRPS Daily precipitation, summed over the season window (mm).

## Statistics scale

To keep the app responsive, area statistics are computed at a scale that depends on the selection level:

| Level | Scale (m) |
|---|---|
| Country | 1500 |
| Province | 500 |
| District | 120 |
| Tehsil | 60 |

LST and rainfall are never computed finer than their native resolution (1000 m and 5566 m). If a tehsil is smaller than one pixel, the value at its centroid is used.

## Caching

Results are cached in the browser session by area, season and year, so returning to a previous selection is instant.

## Limitations

- Fixed NDVI thresholds are a general guide, not crop-specific calibration.
- Seasonal medians hide within-season change (sowing, peak, harvest).
- No ground-truth validation is included.
- Different statistics scales at different levels mean numbers are not strictly comparable between a province run and a district run.
