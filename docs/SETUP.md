# Setup: running CropScope in your own Earth Engine account

## 1. What you need

- A Google Earth Engine account (https://earthengine.google.com/)
- Three boundary layers for Pakistan, as Earth Engine assets:
  1. **Country**: one polygon for Pakistan
  2. **Districts**: one polygon per district, with a province column and a district column
  3. **Tehsils**: one polygon per tehsil, with a tehsil column (and ideally district and province columns)

## 2. Upload the boundaries

1. In the Code Editor, open the **Assets** tab, click **NEW**, then **Shapefile**.
2. Select all files of the shapefile (.shp, .shx, .dbf, .prj) and upload.
3. Do this for the country, districts and tehsils layers.
4. Copy each asset's path (for example `projects/your-project/assets/Pakistan_Districts`).

## 3. Edit the asset paths

At the top of `src/cropscope_dashboard.js`, find this block and replace the three paths with yours:

```js
assets: {
  country: 'projects/ee-faseehtahir105/assets/Pakistan',
  districts: 'projects/ee-faseehtahir105/assets/Pakistan_Districts',
  tehsils: 'projects/ee-faseehtahir105/assets/Pakistan_Tehsil'
},
```

## 4. Column names

The script tries to detect the province, district and tehsil columns automatically (for example `ADM1_EN`, `ADM2_EN`, `ADM3_EN`, `PROVINCE`, `DISTRICT`, `TEHSIL`). Detected names are printed in the Console.

If detection picks the wrong column, or fails, type the exact column names in this block:

```js
fields: {
  districts: { province: '', district: '' },
  tehsils:   { province: '', district: '', tehsil: '' }
},
```

## 5. Run and publish as an app

1. Click **Run**. The province list loads first, then you can choose a district and tehsil.
2. To publish: click **Apps** (top of the Code Editor), then **New App**, choose your script, and follow the prompts.
3. If you want other people to use your published app, share the boundary assets with "Anyone can read" (Assets tab, then the share icon), otherwise the app will fail to load boundaries for visitors.

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| "Could not read boundary assets" | The asset path is wrong, or the asset is not shared with the viewer. |
| "Could not detect Province/District columns" | Set the column names manually in `fields`. |
| "No Sentinel-2 scenes found" | Try another season or year, or lower the strictness of `cloudScorePlusThreshold`. |
| Slow or timed-out run at country level | Expected for the whole country. Choose a province or district. |
