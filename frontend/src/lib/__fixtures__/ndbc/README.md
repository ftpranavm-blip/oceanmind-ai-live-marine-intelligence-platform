# NOAA NDBC fixtures

Saved on 2026-10-23 from `https://www.ndbc.noaa.gov/data/realtime2/<file>`.
Each file is the unmodified body of an HTTP request with `Range: bytes=0-4095`
(the header, units row and newest rows). Four files end mid-line because of the
range; `JOBP4.ocean` is the whole file (2,754 bytes). Tests read these files
instead of calling the network.

| File | Station | What it shows |
| --- | --- | --- |
| `PPHH1.ocean` | Papahana, He'eia Reserve, O'ahu, HI | Water temp (OTMP), pH, dissolved oxygen (O2PPM) and turbidity (TURB) |
| `JOBP4.ocean` | Station 9, Jobos Bay Reserve, Puerto Rico | Same variables; complete file |
| `41049.txt` | 300 nm SSE of Bermuda | Standard met file with water temp (WTMP) |
| `14049.txt` | 12°S 65°E, Indian Ocean | WTMP; newest row 2026-10-01 |
| `23019.txt` | 4°S 65°E, Indian Ocean | WTMP is `MM` (missing) in every row |

Data: NOAA National Data Buoy Center. Station locations from
https://www.ndbc.noaa.gov/data/stations/station_table.txt.
