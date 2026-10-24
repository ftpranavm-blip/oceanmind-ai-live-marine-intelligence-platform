# NOAA Coral Reef Watch fixtures

Unmodified CSV responses saved on 2026-10-22 from NOAA CoastWatch ERDDAP
(`https://coastwatch.noaa.gov/erddap/griddap/<dataset>.csv?...`), all for the
date 2026-10-15T12:00:00Z. Tests read these files instead of calling the
network.

| File | Dataset | Variable | Query |
| --- | --- | --- | --- |
| `dhw_gbr.csv` | `noaacrwdhwDaily` | `degree_heating_week` | cell (-18.275, 147.675), Great Barrier Reef |
| `hotspot_gbr.csv` | `noaacrwhotspotDaily` | `hotspot` | same cell |
| `ssta_gbr.csv` | `noaacrwsstanomalyDaily` | `sea_surface_temperature_anomaly` | same cell |
| `baa_gbr.csv` | `noaacrwbaa7dDaily` | `bleaching_alert_area` | same cell |
| `dhw_keywest.csv` | `noaacrwdhwDaily` | `degree_heating_week` | cell (24.575, -81.775), Florida Keys |
| `hotspot_keywest.csv` | `noaacrwhotspotDaily` | `hotspot` | same cell |
| `ssta_keywest.csv` | `noaacrwsstanomalyDaily` | `sea_surface_temperature_anomaly` | same cell |
| `baa_keywest.csv` | `noaacrwbaa7dDaily` | `bleaching_alert_area` | same cell |
| `dhw_honolulu_box.csv` | `noaacrwdhwDaily` | `degree_heating_week` | box lat 21.225..21.425, lon -157.975..-157.775 (13 of 25 cells are land, `NaN`) |

Data: NOAA Coral Reef Watch. Credit per the dataset licence: "The data produced
by Coral Reef Watch are available for use without restriction ... credit and
courtesy should be given to NOAA Coral Reef Watch." See
https://coralreefwatch.noaa.gov.
