import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

// NSW postcode to coordinates mapping (comprehensive coverage)
// Each entry: [lat, lng, spread] - spread controls random distribution radius
const POSTCODE_COORDS: Record<number, [number, number, number]> = {
  // Sydney CBD & Inner City (2000-2019)
  2000: [-33.8688, 151.2093, 0.01], // Sydney CBD
  2010: [-33.8818, 151.2130, 0.01], // Surry Hills
  2011: [-33.8778, 151.2270, 0.01], // Potts Point
  2015: [-33.9050, 151.1950, 0.01], // Alexandria
  2016: [-33.8990, 151.1780, 0.01], // Redfern
  2017: [-33.9170, 151.1880, 0.01], // Waterloo
  2018: [-33.9050, 151.2080, 0.01], // Rosebery
  2019: [-33.9250, 151.2250, 0.01], // Botany

  // Eastern Suburbs (2020-2039)
  2021: [-33.8930, 151.2500, 0.01], // Paddington
  2022: [-33.8890, 151.2640, 0.01], // Bondi Junction
  2024: [-33.8780, 151.2730, 0.01], // Bronte
  2025: [-33.8680, 151.2710, 0.01], // Woollahra
  2026: [-33.8920, 151.2770, 0.01], // Bondi
  2027: [-33.8610, 151.2780, 0.01], // Darling Point
  2028: [-33.8550, 151.2700, 0.01], // Double Bay
  2029: [-33.8680, 151.2850, 0.01], // Rose Bay
  2030: [-33.8550, 151.2900, 0.01], // Vaucluse
  2031: [-33.9080, 151.2550, 0.01], // Randwick
  2032: [-33.9170, 151.2350, 0.01], // Kingsford
  2033: [-33.9150, 151.2500, 0.01], // Kensington
  2034: [-33.9250, 151.2600, 0.01], // Coogee
  2035: [-33.9380, 151.2550, 0.01], // Maroubra
  2036: [-33.9580, 151.2450, 0.01], // La Perouse

  // Inner West (2040-2049)
  2040: [-33.8780, 151.1530, 0.01], // Leichhardt
  2041: [-33.8630, 151.1420, 0.01], // Balmain
  2042: [-33.8970, 151.1730, 0.01], // Newtown
  2043: [-33.8930, 151.1650, 0.01], // Erskineville
  2044: [-33.9100, 151.1630, 0.01], // St Peters
  2045: [-33.8580, 151.1280, 0.01], // Haberfield
  2046: [-33.8550, 151.1150, 0.01], // Five Dock
  2047: [-33.8530, 151.1400, 0.01], // Drummoyne
  2048: [-33.8830, 151.1700, 0.01], // Stanmore
  2049: [-33.8780, 151.1380, 0.01], // Petersham
  2050: [-33.8880, 151.1900, 0.01], // Camperdown

  // South Sydney (2200-2234)
  2200: [-33.9530, 151.0350, 0.02], // Bankstown
  2204: [-33.9080, 151.1280, 0.01], // Marrickville
  2205: [-33.9420, 151.1380, 0.01], // Arncliffe
  2206: [-33.9230, 151.1230, 0.01], // Tempe
  2207: [-33.9550, 151.1450, 0.01], // Rockdale
  2208: [-33.9380, 151.0680, 0.01], // Punchbowl
  2209: [-33.9600, 151.0930, 0.01], // Beverly Hills
  2210: [-33.9500, 151.0750, 0.01], // Narwee
  2211: [-33.9350, 151.0500, 0.01], // Padstow
  2212: [-33.9350, 151.0280, 0.01], // Revesby
  2213: [-33.9430, 151.0080, 0.01], // East Hills
  2214: [-33.9380, 150.9950, 0.01], // Milperra
  2216: [-33.9650, 151.1530, 0.01], // Rockdale
  2217: [-33.9750, 151.1180, 0.01], // Kogarah
  2218: [-33.9650, 151.0780, 0.01], // Allawah
  2219: [-33.9850, 151.1080, 0.01], // Kogarah Bay
  2220: [-33.9880, 151.0680, 0.01], // Hurstville
  2221: [-33.9850, 151.0280, 0.01], // Blakehurst
  2223: [-33.9830, 151.0550, 0.01], // Mortdale
  2224: [-34.0050, 151.0680, 0.01], // Sylvania
  2225: [-34.0180, 151.0580, 0.01], // Oyster Bay
  2226: [-34.0250, 151.0780, 0.01], // Bonnet Bay
  2227: [-34.0450, 151.0880, 0.01], // Gymea
  2228: [-34.0380, 151.1080, 0.01], // Miranda
  2229: [-34.0680, 151.1180, 0.01], // Caringbah
  2230: [-34.0780, 151.1550, 0.02], // Cronulla
  2231: [-34.0550, 151.1480, 0.01], // Kurnell
  2232: [-34.0680, 151.0350, 0.02], // Sutherland
  2233: [-34.0380, 151.0280, 0.01], // Engadine
  2234: [-34.0080, 151.0080, 0.02], // Menai

  // St George Area (2190-2199)
  2190: [-33.9680, 151.0150, 0.01], // Greenacre
  2191: [-33.9550, 151.0550, 0.01], // Belfield
  2192: [-33.9150, 151.0830, 0.01], // Belmore
  2193: [-33.9050, 151.0780, 0.01], // Ashfield
  2194: [-33.9180, 151.0580, 0.01], // Campsie
  2195: [-33.9080, 151.0480, 0.01], // Lakemba
  2196: [-33.9230, 151.0350, 0.01], // Punchbowl

  // Northern Beaches (2084-2108)
  2084: [-33.6780, 151.2950, 0.02], // Warriewood
  2085: [-33.6950, 151.2780, 0.01], // Belrose
  2086: [-33.7150, 151.2680, 0.01], // Frenchs Forest
  2087: [-33.7350, 151.2550, 0.01], // Forestville
  2088: [-33.8280, 151.2450, 0.01], // Mosman
  2089: [-33.8350, 151.2200, 0.01], // Neutral Bay
  2090: [-33.8150, 151.2480, 0.01], // Cremorne
  2092: [-33.7950, 151.2580, 0.01], // Seaforth
  2093: [-33.7850, 151.2880, 0.01], // Balgowlah
  2094: [-33.8050, 151.2880, 0.01], // Fairlight
  2095: [-33.7950, 151.2850, 0.01], // Manly
  2096: [-33.7750, 151.2880, 0.01], // Curl Curl
  2097: [-33.7550, 151.2850, 0.01], // Collaroy
  2099: [-33.7350, 151.2780, 0.02], // Dee Why
  2100: [-33.7650, 151.2550, 0.01], // Brookvale
  2101: [-33.7280, 151.2950, 0.02], // Narrabeen
  2102: [-33.7080, 151.2950, 0.01], // Warriewood
  2103: [-33.6780, 151.3050, 0.01], // Mona Vale
  2104: [-33.6380, 151.3150, 0.01], // Bayview
  2105: [-33.6180, 151.2850, 0.01], // Church Point
  2106: [-33.5980, 151.3250, 0.01], // Newport
  2107: [-33.5780, 151.3250, 0.01], // Avalon
  2108: [-33.5480, 151.3250, 0.01], // Palm Beach

  // Lower North Shore (2060-2074)
  2060: [-33.8350, 151.2050, 0.01], // North Sydney
  2061: [-33.8280, 151.1880, 0.01], // Kirribilli
  2062: [-33.8280, 151.1780, 0.01], // Cammeray
  2063: [-33.8180, 151.1850, 0.01], // Northbridge
  2064: [-33.8050, 151.1850, 0.01], // Artarmon
  2065: [-33.8180, 151.1980, 0.01], // Crows Nest
  2066: [-33.8050, 151.1550, 0.01], // Lane Cove
  2067: [-33.7950, 151.1680, 0.01], // Chatswood
  2068: [-33.7850, 151.1880, 0.01], // Willoughby
  2069: [-33.7680, 151.1650, 0.01], // Roseville
  2070: [-33.7580, 151.1480, 0.01], // Lindfield
  2071: [-33.7450, 151.1650, 0.01], // Killara
  2072: [-33.7350, 151.1480, 0.01], // Gordon
  2073: [-33.7250, 151.1650, 0.01], // Pymble
  2074: [-33.7150, 151.1480, 0.01], // Turramurra
  2075: [-33.7350, 151.1280, 0.01], // St Ives
  2076: [-33.7250, 151.1050, 0.02], // Wahroonga
  2077: [-33.7050, 151.1180, 0.02], // Hornsby
  2079: [-33.6780, 151.0880, 0.01], // Mt Colah
  2080: [-33.6580, 151.0780, 0.01], // Mt Kuring-gai
  2081: [-33.6380, 151.0780, 0.01], // Berowra
  2082: [-33.6180, 151.0580, 0.01], // Berowra Heights
  2083: [-33.5880, 151.1580, 0.02], // Brooklyn

  // Parramatta & Hills (2110-2159)
  2110: [-33.8350, 151.1280, 0.01], // Hunters Hill
  2111: [-33.8350, 151.1050, 0.01], // Gladesville
  2112: [-33.8150, 151.0850, 0.02], // Ryde
  2113: [-33.8050, 151.1050, 0.01], // North Ryde
  2114: [-33.8050, 151.0650, 0.01], // West Ryde
  2115: [-33.8050, 151.0350, 0.01], // Ermington
  2116: [-33.8250, 151.0250, 0.01], // Rydalmere
  2117: [-33.7880, 151.0350, 0.01], // Dundas
  2118: [-33.7780, 151.0650, 0.01], // Carlingford
  2119: [-33.7580, 151.0750, 0.01], // Beecroft
  2120: [-33.7350, 151.0850, 0.01], // Thornleigh
  2121: [-33.7550, 151.0550, 0.01], // Epping
  2122: [-33.7850, 151.0150, 0.01], // Eastwood
  2125: [-33.7550, 150.9950, 0.01], // West Pennant Hills
  2126: [-33.7350, 151.0350, 0.01], // Cherrybrook
  2127: [-33.8280, 151.0650, 0.01], // Newington
  2128: [-33.8350, 151.0850, 0.01], // Silverwater
  2129: [-33.8250, 151.0450, 0.01], // Granville
  2130: [-33.8950, 151.1350, 0.01], // Summer Hill
  2131: [-33.8780, 151.1050, 0.01], // Ashfield
  2132: [-33.8680, 151.0850, 0.01], // Croydon
  2133: [-33.8880, 151.0950, 0.01], // Croydon Park
  2134: [-33.8680, 151.0550, 0.01], // Burwood
  2135: [-33.8580, 151.0450, 0.01], // Strathfield
  2136: [-33.9080, 151.0950, 0.01], // Strathfield South
  2137: [-33.8480, 151.0750, 0.01], // Concord
  2138: [-33.8380, 151.0950, 0.01], // Rhodes
  2140: [-33.8180, 151.0250, 0.01], // Homebush
  2141: [-33.8580, 151.0050, 0.02], // Lidcombe
  2142: [-33.8550, 150.9650, 0.02], // Granville
  2143: [-33.8480, 151.0050, 0.01], // Birrong
  2144: [-33.8750, 150.9850, 0.01], // Auburn
  2145: [-33.8050, 150.9650, 0.02], // Westmead
  2146: [-33.7850, 150.9850, 0.02], // Old Toongabbie
  2147: [-33.7650, 150.9450, 0.02], // Seven Hills
  2148: [-33.7550, 150.8850, 0.02], // Blacktown
  2150: [-33.8150, 151.0050, 0.02], // Parramatta
  2151: [-33.7950, 151.0150, 0.01], // North Parramatta
  2152: [-33.7950, 150.9850, 0.01], // Northmead
  2153: [-33.7350, 150.9650, 0.02], // Baulkham Hills
  2154: [-33.7150, 150.9850, 0.02], // Castle Hill
  2155: [-33.6950, 150.9350, 0.03], // Kellyville
  2156: [-33.6750, 150.9650, 0.02], // Glenhaven
  2157: [-33.6550, 150.9950, 0.02], // Galston
  2158: [-33.6350, 150.9350, 0.02], // Dural
  2159: [-33.5950, 150.9550, 0.02], // Glenorie

  // Western Sydney (2160-2179)
  2160: [-33.8750, 150.9450, 0.02], // Merrylands
  2161: [-33.8650, 150.9150, 0.01], // Guildford
  2162: [-33.8850, 150.9250, 0.01], // Chester Hill
  2163: [-33.8650, 150.8950, 0.02], // Villawood
  2164: [-33.8850, 150.8750, 0.02], // Smithfield
  2165: [-33.8950, 150.8450, 0.02], // Fairfield
  2166: [-33.8650, 150.8250, 0.02], // Cabramatta
  2167: [-33.9050, 150.8050, 0.02], // Glenfield
  2168: [-33.9150, 150.8650, 0.02], // Chipping Norton
  2170: [-33.9250, 150.9250, 0.03], // Liverpool
  2171: [-33.9550, 150.8850, 0.02], // Cecil Hills
  2172: [-33.9750, 150.8550, 0.02], // Pleasure Point
  2173: [-33.9950, 150.8250, 0.02], // Holsworthy
  2174: [-34.0050, 150.7850, 0.02], // Edmondson Park
  2175: [-33.9450, 150.8150, 0.02], // Horsley Park
  2176: [-33.8850, 150.8050, 0.02], // Bossley Park
  2177: [-33.8750, 150.8350, 0.02], // Bonnyrigg
  2178: [-33.8450, 150.7850, 0.02], // Cecil Park
  2179: [-33.8650, 150.7350, 0.03], // Austral

  // Penrith & Blue Mountains (2745-2790)
  2745: [-33.7650, 150.6850, 0.02], // Mulgoa
  2747: [-33.7350, 150.7250, 0.02], // Kingswood
  2748: [-33.7550, 150.6550, 0.02], // Orchard Hills
  2749: [-33.7150, 150.6750, 0.02], // Cranebrook
  2750: [-33.7550, 150.6950, 0.02], // Penrith
  2751: [-33.7450, 150.5650, 0.02], // Emu Plains
  2752: [-33.7850, 150.5650, 0.02], // Wallacia
  2753: [-33.6250, 150.6650, 0.02], // Richmond
  2754: [-33.6050, 150.7050, 0.02], // North Richmond
  2755: [-33.5750, 150.7250, 0.02], // Richmond Lowlands
  2756: [-33.5350, 150.7650, 0.03], // Windsor
  2757: [-33.4950, 150.6850, 0.02], // Kurrajong
  2758: [-33.6050, 150.6150, 0.02], // Bowen Mountain
  2759: [-33.7250, 150.7850, 0.02], // St Clair
  2760: [-33.7350, 150.8050, 0.02], // St Marys
  2761: [-33.7050, 150.8450, 0.02], // Plumpton
  2762: [-33.6950, 150.8050, 0.02], // Schofields
  2763: [-33.6650, 150.8450, 0.02], // Quakers Hill
  2765: [-33.6450, 150.8850, 0.03], // Riverstone
  2766: [-33.7350, 150.8450, 0.02], // Rooty Hill
  2767: [-33.7250, 150.8850, 0.02], // Doonside
  2768: [-33.7050, 150.8850, 0.02], // Glenwood
  2769: [-33.7350, 150.9050, 0.02], // The Ponds
  2770: [-33.7550, 150.8350, 0.02], // Mt Druitt
  2773: [-33.7250, 150.6050, 0.02], // Glenbrook
  2774: [-33.7250, 150.5550, 0.02], // Blaxland
  2775: [-33.4650, 150.6550, 0.03], // Wisemans Ferry
  2776: [-33.7350, 150.4850, 0.02], // Faulconbridge
  2777: [-33.7150, 150.4350, 0.02], // Springwood
  2778: [-33.7150, 150.3650, 0.02], // Winmalee
  2779: [-33.7050, 150.3150, 0.02], // Hazelbrook
  2780: [-33.7150, 150.3050, 0.02], // Katoomba
  2782: [-33.7050, 150.2550, 0.02], // Wentworth Falls
  2783: [-33.7150, 150.2050, 0.02], // Lawson
  2784: [-33.7250, 150.1550, 0.02], // Leura
  2785: [-33.7050, 150.1250, 0.02], // Blackheath
  2786: [-33.5550, 150.1550, 0.03], // Mt Victoria
  2787: [-33.4850, 149.9850, 0.03], // Lithgow

  // Central Coast (2250-2265)
  2250: [-33.4250, 151.3450, 0.03], // Gosford
  2251: [-33.4550, 151.4050, 0.02], // Avoca Beach
  2256: [-33.4850, 151.3050, 0.02], // Woy Woy
  2257: [-33.5250, 151.3250, 0.02], // Umina Beach
  2258: [-33.4250, 151.4250, 0.02], // Kincumber
  2259: [-33.3550, 151.4450, 0.03], // Wyong
  2260: [-33.4450, 151.4450, 0.02], // Terrigal
  2261: [-33.3050, 151.4850, 0.02], // The Entrance
  2262: [-33.2650, 151.5150, 0.02], // Toukley
  2263: [-33.2250, 151.5350, 0.02], // Gorokan
  2264: [-33.1950, 151.5650, 0.02], // Mannering Park
  2265: [-33.1550, 151.5350, 0.02], // Doyalson

  // Newcastle & Hunter (2280-2340)
  2280: [-32.9750, 151.6350, 0.02], // Belmont
  2281: [-32.9350, 151.6550, 0.02], // Valentine
  2282: [-32.9550, 151.6150, 0.02], // Warners Bay
  2283: [-32.9850, 151.5850, 0.02], // Toronto
  2284: [-32.9550, 151.5650, 0.02], // Argenton
  2285: [-32.9250, 151.5950, 0.02], // Cardiff
  2286: [-32.8950, 151.5450, 0.02], // Wallsend
  2287: [-32.8750, 151.5150, 0.02], // Edgeworth
  2289: [-32.9050, 151.6250, 0.02], // Adamstown
  2290: [-32.8950, 151.6850, 0.02], // Kotara
  2291: [-32.9150, 151.7250, 0.02], // Merewether
  2292: [-32.9050, 151.7550, 0.01], // Broadmeadow
  2293: [-32.9150, 151.7850, 0.01], // Maryville
  2294: [-32.9050, 151.7450, 0.01], // Islington
  2295: [-32.9250, 151.7750, 0.01], // Newcastle
  2296: [-32.9150, 151.7450, 0.01], // Georgetown
  2297: [-32.9050, 151.7350, 0.01], // Tighes Hill
  2298: [-32.8950, 151.7250, 0.01], // Waratah
  2299: [-32.8850, 151.7150, 0.01], // Jesmond
  2300: [-32.9250, 151.7850, 0.01], // Newcastle CBD
  2302: [-32.9350, 151.7550, 0.01], // Cooks Hill
  2303: [-32.9150, 151.7650, 0.01], // Hamilton
  2304: [-32.8950, 151.7650, 0.02], // Mayfield
  2305: [-32.8650, 151.7350, 0.02], // New Lambton
  2306: [-32.8750, 151.7550, 0.01], // Lambton
  2307: [-32.9550, 151.7350, 0.01], // Shortland
  2308: [-32.8750, 151.7050, 0.01], // Callaghan
  2314: [-32.7550, 152.0050, 0.02], // Fern Bay
  2315: [-32.7150, 152.1050, 0.03], // Nelson Bay
  2316: [-32.7950, 151.8550, 0.02], // Anna Bay
  2317: [-32.8750, 151.7850, 0.02], // Salamander Bay
  2318: [-32.7550, 151.8350, 0.02], // Williamtown
  2319: [-32.8350, 151.8550, 0.02], // Tanilba Bay
  2320: [-32.7150, 151.5450, 0.03], // Maitland
  2321: [-32.7450, 151.5850, 0.02], // Raymond Terrace
  2322: [-32.7950, 151.6750, 0.02], // Beresfield
  2323: [-32.7450, 151.4950, 0.02], // East Maitland
  2324: [-32.6650, 151.8350, 0.02], // Medowie
  2325: [-32.5750, 151.3350, 0.02], // Cessnock
  2326: [-32.5550, 151.3650, 0.02], // Branxton
  2327: [-32.8150, 151.4450, 0.02], // Kurri Kurri
  2328: [-32.3750, 151.1050, 0.02], // Denman
  2329: [-32.0450, 150.6850, 0.03], // Merriwa
  2330: [-32.5550, 151.1550, 0.03], // Singleton
  2333: [-32.2650, 150.8850, 0.03], // Muswellbrook
  2334: [-32.4150, 151.0550, 0.02], // Muswellbrook
  2335: [-32.8550, 151.3250, 0.02], // Branxton
  2336: [-32.0650, 150.8550, 0.02], // Scone
  2337: [-31.8250, 150.7350, 0.02], // Aberdeen
  2338: [-31.5750, 150.5350, 0.02], // Murrurundi
  2339: [-31.4050, 150.3750, 0.03], // Willow Tree
  2340: [-31.0850, 150.9250, 0.03], // Tamworth

  // Mid North Coast (2420-2490)
  2420: [-32.4650, 151.7050, 0.02], // Dungog
  2421: [-32.5550, 151.7550, 0.02], // Paterson
  2422: [-32.1850, 152.0150, 0.03], // Gloucester
  2423: [-32.3850, 152.0850, 0.02], // Bulahdelah
  2424: [-31.8550, 151.8550, 0.02], // Stroud
  2425: [-32.2850, 151.9550, 0.02], // Tea Gardens
  2426: [-31.9050, 152.4250, 0.02], // Harrington
  2427: [-31.9250, 152.5050, 0.02], // Coopernook
  2428: [-32.1850, 152.4850, 0.03], // Forster
  2429: [-31.8550, 152.2550, 0.02], // Wingham
  2430: [-31.8950, 152.4550, 0.03], // Taree
  2431: [-31.0350, 152.8250, 0.02], // South West Rocks
  2439: [-31.6550, 152.7150, 0.02], // Laurieton
  2440: [-31.0650, 152.8350, 0.02], // Kempsey
  2441: [-31.3950, 152.8550, 0.02], // Crescent Head
  2443: [-31.5750, 152.7850, 0.02], // Camden Haven
  2444: [-31.4250, 152.9050, 0.03], // Port Macquarie
  2445: [-31.4850, 152.8350, 0.02], // Bonny Hills
  2446: [-31.5250, 152.7150, 0.02], // Wauchope
  2447: [-30.3950, 152.8950, 0.02], // Nambucca Heads
  2448: [-30.4550, 152.8550, 0.02], // Scotts Head
  2449: [-30.5850, 152.7850, 0.02], // Macksville
  2450: [-30.3050, 153.1150, 0.03], // Coffs Harbour
  2452: [-30.4350, 153.0350, 0.02], // Sawtell
  2453: [-30.3550, 152.7550, 0.02], // Dorrigo
  2454: [-30.2050, 152.8450, 0.02], // Bellingen
  2455: [-30.1950, 152.9650, 0.02], // Urunga
  2456: [-30.0550, 153.1950, 0.02], // Woolgoolga
  2460: [-29.6850, 152.9350, 0.03], // Grafton
  2462: [-29.4350, 153.1950, 0.02], // Yamba
  2463: [-29.5250, 153.2450, 0.02], // Maclean
  2464: [-29.5050, 153.0550, 0.02], // Lawrence
  2465: [-29.3550, 153.2350, 0.02], // Angourie
  2466: [-29.2550, 153.3050, 0.02], // Wooli
  2469: [-28.9850, 152.4550, 0.02], // Casino
  2470: [-29.0450, 153.0050, 0.02], // Lismore
  2471: [-28.9250, 153.2250, 0.02], // Coraki
  2472: [-28.8650, 153.4050, 0.02], // Woodburn
  2473: [-28.7950, 153.5450, 0.02], // Evans Head
  2474: [-28.5450, 152.7250, 0.02], // Kyogle
  2476: [-29.1850, 152.2150, 0.02], // Tenterfield
  2477: [-28.8250, 153.2950, 0.02], // Alstonville
  2478: [-28.8650, 153.5850, 0.03], // Ballina
  2479: [-28.7050, 153.5350, 0.02], // Lennox Head
  2480: [-28.5850, 153.2950, 0.03], // Lismore
  2481: [-28.6450, 153.6150, 0.02], // Byron Bay
  2482: [-28.5050, 153.4250, 0.02], // Mullumbimby
  2483: [-28.4450, 153.5450, 0.02], // Brunswick Heads
  2484: [-28.2550, 153.3750, 0.02], // Murwillumbah
  2485: [-28.1650, 153.5250, 0.02], // Tweed Heads
  2486: [-28.2150, 153.5450, 0.02], // Banora Point
  2487: [-28.3050, 153.5650, 0.02], // Kingscliff
  2488: [-28.3550, 153.5450, 0.02], // Casuarina
  2489: [-28.3850, 153.5550, 0.02], // Pottsville
  2490: [-28.4350, 153.5650, 0.02], // Hastings Point

  // Wollongong & South Coast (2500-2560)
  2500: [-34.4250, 150.8950, 0.03], // Wollongong
  2502: [-34.4550, 150.8550, 0.02], // Warrawong
  2505: [-34.4750, 150.8650, 0.02], // Port Kembla
  2506: [-34.4950, 150.8450, 0.02], // Cringila
  2508: [-34.3650, 150.9150, 0.02], // Coalcliff
  2515: [-34.3250, 150.9350, 0.02], // Bulli
  2516: [-34.3050, 150.9250, 0.01], // Thirroul
  2517: [-34.3550, 150.9150, 0.01], // Austinmer
  2518: [-34.3850, 150.9050, 0.02], // Woonona
  2519: [-34.4050, 150.8850, 0.02], // Bellambi
  2520: [-34.4150, 150.8950, 0.02], // Wollongong
  2525: [-34.4050, 150.8650, 0.02], // Figtree
  2526: [-34.4350, 150.8450, 0.02], // Berkeley
  2527: [-34.5350, 150.7950, 0.03], // Albion Park
  2528: [-34.5650, 150.8350, 0.02], // Shellharbour
  2529: [-34.5350, 150.8550, 0.02], // Warilla
  2530: [-34.4950, 150.7550, 0.02], // Dapto
  2533: [-34.6350, 150.7850, 0.02], // Minnamurra
  2534: [-34.6750, 150.7950, 0.03], // Gerringong
  2535: [-34.7350, 150.7650, 0.02], // Berry
  2536: [-35.7150, 150.1850, 0.03], // Batehaven
  2537: [-35.6550, 150.1550, 0.02], // Moruya
  2538: [-35.0450, 150.5750, 0.02], // Nowra
  2539: [-35.2350, 150.4550, 0.02], // Ulladulla
  2540: [-34.8750, 150.6050, 0.03], // Nowra
  2541: [-35.0150, 150.5450, 0.02], // Sussex Inlet
  2545: [-36.0450, 150.1350, 0.02], // Narooma
  2546: [-36.2250, 150.0850, 0.02], // Bermagui
  2548: [-36.7350, 149.9150, 0.02], // Merimbula
  2549: [-36.8550, 149.9050, 0.02], // Pambula
  2550: [-36.9050, 149.8550, 0.03], // Bega
  2551: [-37.0550, 149.9050, 0.02], // Eden
  2555: [-33.8950, 150.7450, 0.02], // Badgerys Creek
  2556: [-33.9350, 150.7250, 0.02], // Elizabeth Hills
  2557: [-34.0150, 150.7850, 0.02], // Rossmore
  2558: [-34.0450, 150.8150, 0.02], // Eschol Park
  2559: [-34.0750, 150.8350, 0.02], // Blairmount
  2560: [-34.0650, 150.8150, 0.03], // Campbelltown

  // Macarthur (2565-2579)
  2565: [-34.0350, 150.8350, 0.02], // Ingleburn
  2566: [-34.0550, 150.8550, 0.02], // Minto
  2567: [-34.1050, 150.8050, 0.02], // Leumeah
  2568: [-34.1950, 150.7350, 0.02], // Menangle
  2569: [-34.2250, 150.6850, 0.02], // Douglas Park
  2570: [-34.1850, 150.6950, 0.03], // Camden
  2571: [-34.2550, 150.6350, 0.02], // Picton
  2572: [-34.2950, 150.6050, 0.02], // Thirlmere
  2573: [-34.3250, 150.5850, 0.02], // Tahmoor
  2574: [-34.4050, 150.5250, 0.02], // Bargo
  2575: [-34.4550, 150.4350, 0.02], // Mittagong
  2576: [-34.4750, 150.4050, 0.02], // Bowral
  2577: [-34.5550, 150.3550, 0.03], // Moss Vale
  2578: [-34.6250, 150.4150, 0.02], // Bundanoon
  2579: [-34.6750, 150.3450, 0.02], // Marulan
  2580: [-34.7550, 149.7150, 0.03], // Goulburn

  // ACT Region (2600-2620)
  2600: [-35.2850, 149.1250, 0.02], // Canberra
  2601: [-35.2750, 149.1350, 0.02], // Canberra City
  2602: [-35.2550, 149.1350, 0.02], // Dickson
  2603: [-35.2850, 149.1550, 0.02], // Manuka
  2604: [-35.3150, 149.1350, 0.02], // Narrabundah
  2605: [-35.3350, 149.0850, 0.02], // Curtin
  2606: [-35.3550, 149.0550, 0.02], // Phillip
  2607: [-35.3350, 149.1050, 0.02], // Deakin
  2610: [-35.2850, 149.1250, 0.01], // Canberra
  2611: [-35.3550, 149.0050, 0.02], // Weston Creek
  2612: [-35.2650, 149.1550, 0.02], // Campbell
  2614: [-35.2450, 149.0550, 0.02], // Aranda
  2615: [-35.2150, 149.0350, 0.02], // Belconnen
  2617: [-35.2350, 149.0750, 0.02], // Bruce
  2618: [-35.1750, 149.0550, 0.02], // Hall
  2619: [-35.4150, 149.0650, 0.02], // Jerrabomberra
  2620: [-35.4450, 149.2250, 0.03], // Queanbeyan

  // Riverina (2640-2720)
  2640: [-36.0750, 146.9150, 0.03], // Albury
  2641: [-36.0450, 146.9650, 0.02], // Lavington
  2642: [-35.8650, 146.9550, 0.02], // Corowa
  2643: [-36.1050, 146.8350, 0.02], // Howlong
  2644: [-35.7150, 146.9150, 0.02], // Mulwala
  2645: [-35.4350, 146.4150, 0.02], // Berrigan
  2646: [-35.5450, 146.5350, 0.02], // Finley
  2647: [-35.9550, 145.9350, 0.02], // Tocumwal
  2648: [-34.1750, 142.1550, 0.03], // Wentworth
  2650: [-35.1150, 147.3650, 0.03], // Wagga Wagga
  2651: [-35.0950, 147.3350, 0.02], // Wagga Wagga
  2652: [-35.5550, 147.4550, 0.02], // Lockhart
  2653: [-36.2150, 148.3750, 0.02], // Tumbarumba
  2655: [-35.2050, 146.8550, 0.02], // Narrandera
  2656: [-35.5950, 146.3950, 0.02], // Jerilderie
  2658: [-35.7650, 146.7450, 0.02], // Urana
  2659: [-35.8850, 146.4050, 0.02], // Oaklands
  2660: [-35.4050, 146.9850, 0.02], // Coolamon
  2663: [-34.8350, 147.1950, 0.02], // Temora
  2665: [-34.5850, 147.1050, 0.02], // West Wyalong
  2666: [-34.2850, 147.8850, 0.02], // Cootamundra
  2668: [-34.0950, 147.2350, 0.02], // Grenfell
  2669: [-33.7950, 147.3050, 0.02], // Condobolin
  2671: [-33.3050, 147.2350, 0.02], // Lake Cargelligo
  2672: [-33.0850, 146.0150, 0.02], // Hillston
  2675: [-34.6850, 145.9050, 0.02], // Hay
  2678: [-34.2450, 145.0050, 0.02], // Balranald
  2680: [-34.2850, 146.0550, 0.03], // Griffith
  2681: [-34.3350, 146.0150, 0.02], // Griffith
  2700: [-35.7250, 144.7550, 0.02], // Deniliquin
  2701: [-35.5550, 144.6550, 0.02], // Blighty
  2702: [-35.4650, 145.7950, 0.02], // Leeton
  2703: [-34.5450, 145.9150, 0.02], // Yenda
  2705: [-34.6350, 146.4050, 0.02], // Leeton
  2706: [-34.5550, 145.7650, 0.02], // Whitton
  2707: [-34.3450, 145.9450, 0.02], // Yenda
  2710: [-35.0050, 144.9550, 0.02], // Deniliquin
  2711: [-35.5250, 143.5550, 0.02], // Moulamein
  2712: [-35.8550, 145.2350, 0.02], // Berrigan
  2713: [-35.6250, 145.0350, 0.02], // Finley
  2714: [-35.3150, 144.7750, 0.02], // Barham
  2715: [-34.7050, 143.5550, 0.02], // Balranald
  2716: [-35.1250, 145.4550, 0.02], // Barooga
  2717: [-34.0550, 141.9050, 0.02], // Dareton
  2720: [-35.5350, 148.2550, 0.03], // Tumut

  // Central West (2787-2850)
  2790: [-33.4850, 150.0550, 0.02], // Bowenfels
  2791: [-33.5850, 149.5550, 0.02], // Wallerawang
  2792: [-33.4050, 149.5750, 0.02], // Portland
  2793: [-33.9150, 149.1350, 0.02], // Blayney
  2794: [-34.0450, 148.6950, 0.02], // Cowra
  2795: [-33.4350, 149.5850, 0.03], // Bathurst
  2797: [-33.8450, 149.0550, 0.02], // Millthorpe
  2798: [-33.5450, 149.2050, 0.02], // Sofala
  2799: [-33.7650, 148.7650, 0.02], // Canowindra
  2800: [-33.2850, 148.9950, 0.03], // Orange
  2804: [-33.4450, 148.6050, 0.02], // Molong
  2805: [-33.5450, 148.2550, 0.02], // Manildra
  2806: [-33.0850, 148.6250, 0.02], // Yeoval
  2807: [-34.4550, 148.8350, 0.02], // Harden
  2808: [-34.5350, 148.4750, 0.02], // Boorowa
  2809: [-33.9950, 148.2450, 0.02], // Grenfell
  2810: [-34.0650, 147.7150, 0.02], // Young
  2820: [-32.7850, 148.6550, 0.03], // Wellington
  2821: [-32.5350, 148.3950, 0.02], // Narromine
  2823: [-32.2450, 147.9350, 0.02], // Trangie
  2824: [-32.0050, 147.5050, 0.02], // Warren
  2825: [-31.5050, 147.2250, 0.02], // Nyngan
  2826: [-32.0250, 147.0850, 0.02], // Tottenham
  2827: [-31.9850, 147.9550, 0.02], // Gilgandra
  2828: [-31.5550, 148.6350, 0.02], // Coonamble
  2829: [-30.9350, 148.2650, 0.02], // Gulargambone
  2830: [-32.2350, 148.6050, 0.03], // Dubbo
  2831: [-32.4250, 148.2550, 0.02], // Dubbo
  2832: [-30.1050, 147.7350, 0.02], // Walgett
  2833: [-29.4350, 147.5350, 0.02], // Lightning Ridge
  2834: [-29.7650, 147.2650, 0.02], // Collarenebri
  2835: [-31.5350, 145.5550, 0.02], // Cobar
  2836: [-31.0550, 145.8450, 0.02], // Bourke
  2838: [-30.0550, 145.9350, 0.02], // Brewarrina
  2839: [-29.5550, 146.8950, 0.02], // Goodooga
  2840: [-31.0550, 141.4550, 0.02], // Broken Hill
  2842: [-32.2450, 149.0750, 0.02], // Gulgong
  2843: [-32.2050, 149.3850, 0.02], // Kandos
  2844: [-32.4050, 149.4450, 0.02], // Mudgee
  2845: [-32.6350, 149.5850, 0.02], // Rylstone
  2846: [-32.8050, 149.7450, 0.02], // Capertee
  2848: [-32.3850, 149.1850, 0.02], // Stuart Town
  2849: [-32.6150, 149.0050, 0.02], // Dunedoo
  2850: [-32.5950, 149.5750, 0.02], // Mudgee

  // North West (2357-2411)
  2357: [-31.0550, 150.1150, 0.02], // Nundle
  2358: [-30.7050, 150.3550, 0.02], // Bendemeer
  2359: [-30.4750, 150.2650, 0.02], // Bundarra
  2360: [-29.7750, 151.1150, 0.03], // Inverell
  2361: [-29.5050, 151.0950, 0.02], // Ashford
  2365: [-30.2850, 151.6550, 0.02], // Guyra
  2369: [-29.9350, 150.7350, 0.02], // Bingara
  2370: [-30.5150, 151.6450, 0.02], // Glen Innes
  2371: [-29.1950, 151.2450, 0.02], // Emmaville
  2372: [-28.6950, 151.9450, 0.02], // Stanthorpe
  2379: [-31.5550, 150.1750, 0.02], // Currabubula
  2380: [-30.5450, 150.2850, 0.02], // Gunnedah
  2381: [-30.7550, 149.9550, 0.02], // Mullaley
  2382: [-30.3450, 149.7950, 0.02], // Boggabri
  2386: [-30.1050, 149.2050, 0.02], // Narrabri
  2387: [-29.6450, 149.7350, 0.02], // Wee Waa
  2388: [-30.1250, 149.4150, 0.02], // Bellata
  2390: [-30.3350, 149.7850, 0.03], // Narrabri
  2395: [-30.9850, 149.4550, 0.02], // Coolah
  2396: [-31.3350, 149.1450, 0.02], // Coonabarabran
  2397: [-29.3150, 149.4150, 0.02], // Pilliga
  2398: [-29.8950, 149.9850, 0.02], // Baradine
  2399: [-30.2850, 150.5050, 0.02], // Manilla
  2400: [-29.4950, 150.3050, 0.03], // Moree
  2401: [-29.7950, 150.0050, 0.02], // Pallamallawa
  2402: [-29.3150, 150.4650, 0.02], // Warialda
  2403: [-29.0550, 150.5650, 0.02], // North Star
  2404: [-29.6450, 150.7950, 0.02], // Croppa Creek
  2405: [-28.9850, 150.3650, 0.02], // Boggabilla
  2406: [-28.5450, 150.6050, 0.02], // Mungindi
  2408: [-29.4150, 149.8750, 0.02], // Moree
  2409: [-28.7550, 149.5850, 0.02], // Toomelah
  2410: [-29.1750, 151.0550, 0.02], // Yetman
  2411: [-29.2050, 150.2050, 0.02], // Pallamallawa
};

// Get coordinates for a postcode with fallback interpolation
function getPostcodeCoords(postcode: string): { lat: number; lng: number; spread: number } {
  const pc = parseInt(postcode);

  // Handle invalid postcode
  if (isNaN(pc) || pc < 2000 || pc > 3000) {
    return { lat: -33.8688, lng: 151.2093, spread: 0.05 }; // Default to Sydney
  }

  // Exact match
  if (POSTCODE_COORDS[pc]) {
    const [lat, lng, spread] = POSTCODE_COORDS[pc];
    return { lat, lng, spread };
  }

  // Find nearest postcodes for interpolation
  const codes = Object.keys(POSTCODE_COORDS).map(Number).sort((a, b) => a - b);
  let lower = codes[0];
  let upper = codes[codes.length - 1];

  for (const code of codes) {
    if (code <= pc) lower = code;
    if (code >= pc && upper === codes[codes.length - 1]) upper = code;
  }

  if (lower === upper || !POSTCODE_COORDS[lower] || !POSTCODE_COORDS[upper]) {
    // Fallback to nearest known postcode
    const nearest = codes.reduce((prev, curr) =>
      Math.abs(curr - pc) < Math.abs(prev - pc) ? curr : prev
    );
    const [lat, lng, spread] = POSTCODE_COORDS[nearest];
    return { lat, lng, spread: spread * 1.5 };
  }

  // Interpolate between lower and upper
  const ratio = (pc - lower) / (upper - lower);
  const [lat1, lng1, spread1] = POSTCODE_COORDS[lower];
  const [lat2, lng2, spread2] = POSTCODE_COORDS[upper];

  return {
    lat: lat1 + (lat2 - lat1) * ratio,
    lng: lng1 + (lng2 - lng1) * ratio,
    spread: Math.max(spread1, spread2) * 1.2,
  };
}

// Geocoding cache
const geocodeCache: Record<string, { lat: number; lng: number }> = {};

function getSuburbCoords(suburb: string, postcode: string): { lat: number; lng: number } {
  const key = `${suburb}-${postcode}`;
  if (geocodeCache[key]) return geocodeCache[key];

  const { lat, lng, spread } = getPostcodeCoords(postcode);

  // Use suburb name to create deterministic but varied offset
  let hash = 0;
  for (let i = 0; i < suburb.length; i++) {
    hash = ((hash << 5) - hash) + suburb.charCodeAt(i);
    hash = hash & hash;
  }

  // Create pseudo-random but deterministic offset based on suburb name
  const angle = (hash % 360) * Math.PI / 180;
  const distance = (Math.abs(hash % 1000) / 1000) * spread;

  const coords = {
    lat: lat + Math.cos(angle) * distance,
    lng: lng + Math.sin(angle) * distance,
  };

  geocodeCache[key] = coords;
  return coords;
}

// Zone code descriptions
const ZONE_DESCRIPTIONS: Record<string, string> = {
  R1: "General Residential",
  R2: "Low Density Residential",
  R3: "Medium Density Residential",
  R4: "High Density Residential",
  R5: "Large Lot Residential",
  B1: "Neighbourhood Centre",
  B2: "Local Centre",
  B3: "Commercial Core",
  B4: "Mixed Use",
  B5: "Business Development",
  B6: "Enterprise Corridor",
  B7: "Business Park",
  IN1: "General Industrial",
  IN2: "Light Industrial",
  IN3: "Heavy Industrial",
  RU1: "Primary Production",
  RU2: "Rural Landscape",
  RU3: "Forestry",
  RU4: "Primary Production Small Lots",
  RU5: "Village",
  SP1: "Special Activities",
  SP2: "Infrastructure",
  RE1: "Public Recreation",
  RE2: "Private Recreation",
  E1: "National Parks",
  E2: "Environmental Conservation",
  E3: "Environmental Management",
  E4: "Environmental Living",
  W1: "Natural Waterways",
  W2: "Recreational Waterways",
};

function formatDate(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;
}

function parseDateToTimestamp(dateStr: string): number {
  if (!dateStr || dateStr.length !== 8) return 0;
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6)) - 1;
  const day = parseInt(dateStr.slice(6, 8));
  return new Date(year, month, day).getTime();
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(price);
}

function getPriceColor(price: number, minPrice: number, maxPrice: number) {
  const range = maxPrice - minPrice;
  const normalized = range > 0 ? (price - minPrice) / range : 0.5;

  if (normalized < 0.25) return "#22c55e";
  if (normalized < 0.5) return "#eab308";
  if (normalized < 0.75) return "#f97316";
  return "#ef4444";
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface Sale {
  id: string;
  address: string;
  suburb: string;
  postcode: string;
  landArea: number;
  contractDate: string;
  settlementDate: string;
  price: number;
  zoneCode: string;
  zoneDesc?: string;
  propertyType: string;
  propertyDesc: string;
  pricePerSqm: number | null;
  coords?: { lat: number; lng: number };
}

export default function NSWPropertySalesMap() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState([0, 5000000]);
  const [dateRange, setDateRange] = useState<[number, number]>([0, Date.now()]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("price-desc");
  const [selectedProperty, setSelectedProperty] = useState<Sale | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "table" | "split">("split");
  const [searchText, setSearchText] = useState("");
  const [mapLayer, setMapLayer] = useState<"points" | "suburbs">("points");

  // Fetch data from API
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch("/api/sales");
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();

        // Add coordinates and zone descriptions
        const enrichedData = data.map((sale: Sale) => ({
          ...sale,
          coords: getSuburbCoords(sale.suburb, sale.postcode),
          zoneDesc: ZONE_DESCRIPTIONS[sale.zoneCode] || sale.zoneCode,
        }));

        setSales(enrichedData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Calculate date bounds (filter to 2025 only)
  const dateBounds = useMemo(() => {
    const jan2025 = new Date(2025, 0, 1).getTime();
    const dec2025 = new Date(2025, 11, 31).getTime();

    if (sales.length === 0) return { min: jan2025, max: dec2025 };
    let min = Infinity;
    let max = -Infinity;
    for (const s of sales) {
      const t = parseDateToTimestamp(s.settlementDate);
      // Only consider dates in 2025
      if (t >= jan2025 && t <= dec2025) {
        if (t < min) min = t;
        if (t > max) max = t;
      }
    }
    if (min === Infinity) return { min: jan2025, max: dec2025 };
    return { min, max };
  }, [sales]);

  // Initialize date range when data loads
  useEffect(() => {
    if (dateBounds.min > 0) {
      setDateRange([dateBounds.min, dateBounds.max]);
    }
  }, [dateBounds]);

  // Stats for the full dataset (used for slider bounds)
  const fullPriceStats = useMemo(() => {
    if (sales.length === 0)
      return { min: 0, max: 5000000, median: 500000, avg: 500000 };
    const prices = sales.map((s) => s.price).sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    return {
      min: prices[0],
      max: prices[prices.length - 1],
      median: prices[Math.floor(prices.length / 2)],
      avg: Math.round(sum / prices.length),
    };
  }, [sales]);

  // Initialize price range when data loads
  useEffect(() => {
    if (fullPriceStats.max > 0) {
      setPriceRange([0, fullPriceStats.max]);
    }
  }, [fullPriceStats.max]);

  const availableZones = useMemo(() => {
    return [...new Set(sales.map((s) => s.zoneCode))].sort();
  }, [sales]);

  // Stats for filtered data (used for color scale and display)
  const filteredPriceStats = useMemo(() => {
    const jan2025 = new Date(2025, 0, 1).getTime();
    const dec2025 = new Date(2025, 11, 31).getTime();
    const candidateSales = sales.filter((s) => {
      const saleDate = parseDateToTimestamp(s.settlementDate);
      const isValid2025 = saleDate >= jan2025 && saleDate <= dec2025;
      const inDateRange = saleDate >= dateRange[0] && saleDate <= dateRange[1];
      const inZones = selectedZones.length === 0 || selectedZones.includes(s.zoneCode);
      return isValid2025 && inDateRange && inZones;
    });
    if (candidateSales.length === 0)
      return { min: 0, max: 5000000, median: 500000, avg: 500000 };
    const prices = candidateSales.map((s) => s.price).sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    return {
      min: prices[0],
      max: prices[prices.length - 1],
      median: prices[Math.floor(prices.length / 2)],
      avg: Math.round(sum / prices.length),
    };
  }, [sales, dateRange, selectedZones]);

  const filteredSales = useMemo(() => {
    const jan2025 = new Date(2025, 0, 1).getTime();
    const dec2025 = new Date(2025, 11, 31).getTime();
    const searchLower = searchText.toLowerCase().trim();
    let filtered = sales.filter((s) => {
      const saleDate = parseDateToTimestamp(s.settlementDate);
      const isValid2025 = saleDate >= jan2025 && saleDate <= dec2025;
      const inPriceRange = s.price >= priceRange[0] && s.price <= priceRange[1];
      const inDateRange = saleDate >= dateRange[0] && saleDate <= dateRange[1];
      const inZones = selectedZones.length === 0 || selectedZones.includes(s.zoneCode);
      const matchesSearch = !searchLower ||
        s.address.toLowerCase().includes(searchLower) ||
        s.suburb.toLowerCase().includes(searchLower) ||
        s.postcode.includes(searchLower);
      return isValid2025 && inPriceRange && inDateRange && inZones && matchesSearch;
    });

    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "date-desc":
        filtered.sort((a, b) =>
          parseDateToTimestamp(b.settlementDate) - parseDateToTimestamp(a.settlementDate)
        );
        break;
      case "date-asc":
        filtered.sort((a, b) =>
          parseDateToTimestamp(a.settlementDate) - parseDateToTimestamp(b.settlementDate)
        );
        break;
      case "sqm-desc":
        filtered.sort((a, b) => (b.pricePerSqm || 0) - (a.pricePerSqm || 0));
        break;
    }

    return filtered;
  }, [sales, priceRange, dateRange, selectedZones, sortBy, searchText]);

  const mapCenter = useMemo((): [number, number] => {
    if (filteredSales.length === 0) return [-33.8688, 151.2093];
    const withCoords = filteredSales.filter((s) => s.coords && !isNaN(s.coords.lat) && !isNaN(s.coords.lng));
    if (withCoords.length === 0) return [-33.8688, 151.2093];
    const avgLat = withCoords.reduce((sum, s) => sum + s.coords!.lat, 0) / withCoords.length;
    const avgLng = withCoords.reduce((sum, s) => sum + s.coords!.lng, 0) / withCoords.length;
    if (isNaN(avgLat) || isNaN(avgLng)) return [-33.8688, 151.2093];
    return [avgLat, avgLng];
  }, [filteredSales]);

  // Suburb aggregation for heatmap view
  interface SuburbStats {
    suburb: string;
    postcode: string;
    count: number;
    totalValue: number;
    avgPrice: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
    avgPricePerSqm: number;
    coords: { lat: number; lng: number };
  }

  const suburbStats = useMemo((): SuburbStats[] => {
    const grouped: Record<string, Sale[]> = {};

    for (const sale of filteredSales) {
      const key = `${sale.suburb}-${sale.postcode}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(sale);
    }

    const stats: SuburbStats[] = [];
    for (const [key, sales] of Object.entries(grouped)) {
      const prices = sales.map(s => s.price).sort((a, b) => a - b);
      const pricesPerSqm = sales.filter(s => s.pricePerSqm).map(s => s.pricePerSqm!);

      // Calculate centroid of all properties in suburb
      const validCoords = sales.filter(s => s.coords && !isNaN(s.coords.lat) && !isNaN(s.coords.lng));
      if (validCoords.length === 0) continue;

      const avgLat = validCoords.reduce((sum, s) => sum + s.coords!.lat, 0) / validCoords.length;
      const avgLng = validCoords.reduce((sum, s) => sum + s.coords!.lng, 0) / validCoords.length;

      stats.push({
        suburb: sales[0].suburb,
        postcode: sales[0].postcode,
        count: sales.length,
        totalValue: prices.reduce((a, b) => a + b, 0),
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        medianPrice: prices[Math.floor(prices.length / 2)],
        minPrice: prices[0],
        maxPrice: prices[prices.length - 1],
        avgPricePerSqm: pricesPerSqm.length > 0
          ? Math.round(pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length)
          : 0,
        coords: { lat: avgLat, lng: avgLng },
      });
    }

    return stats.sort((a, b) => b.count - a.count);
  }, [filteredSales]);

  const suburbPriceRange = useMemo(() => {
    if (suburbStats.length === 0) return { min: 0, max: 5000000 };
    const prices = suburbStats.map(s => s.avgPrice);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [suburbStats]);

  const formatDateLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        color: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>Loading...</div>
          <div style={{ color: "#64748b" }}>Extracting property data from archive</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        color: "#ef4444",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0f1a",
        color: "#e2e8f0",
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        className="mobile-padding"
        style={{
          background: "linear-gradient(180deg, #111827 0%, #0a0f1a 100%)",
          borderBottom: "1px solid #1e293b",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
          >
            🏠
          </div>
          <div>
            <h1
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#f8fafc",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              <span className="mobile-hide">NSW </span>Property Sales
            </h1>
            <p className="mobile-hide" style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
              {sales.length.toLocaleString()} properties
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Map Layer Toggle */}
          <div
            className="mobile-hide"
            style={{
              display: "flex",
              background: "#1e293b",
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid #334155",
            }}
          >
            {(["points", "suburbs"] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setMapLayer(layer)}
                style={{
                  padding: "8px 12px",
                  background: mapLayer === layer ? "#8b5cf6" : "transparent",
                  border: "none",
                  color: mapLayer === layer ? "#fff" : "#94a3b8",
                  cursor: "pointer",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {layer === "points" ? "Points" : "Suburbs"}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div
            style={{
              display: "flex",
              background: "#1e293b",
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid #334155",
            }}
          >
            {(["map", "split", "table"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "8px 12px",
                  background: viewMode === mode ? "#3b82f6" : "transparent",
                  border: "none",
                  color: viewMode === mode ? "#fff" : "#94a3b8",
                  cursor: "pointer",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div
        className="mobile-padding"
        style={{
          background: "#111827",
          borderBottom: "1px solid #1e293b",
          padding: "12px 24px",
          display: "flex",
          gap: "24px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { label: "Showing", value: filteredSales.length.toLocaleString(), suffix: ` of ${sales.length.toLocaleString()}`, hide: false },
          { label: "Suburbs", value: suburbStats.length.toLocaleString(), suffix: "", hide: false },
          { label: "Min", value: formatPrice(filteredPriceStats.min), suffix: "", hide: false },
          { label: "Max", value: formatPrice(filteredPriceStats.max), suffix: "", hide: false },
          { label: "Median", value: formatPrice(filteredPriceStats.median), suffix: "", hide: true },
          { label: "Average", value: formatPrice(filteredPriceStats.avg), suffix: "", hide: true },
        ].map((stat) => (
          <div key={stat.label} className={stat.hide ? "mobile-hide" : ""} style={{ minWidth: "fit-content" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {stat.label}
            </div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#f8fafc" }}>
              {stat.value}
              <span style={{ fontSize: "11px", color: "#64748b" }}>{stat.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="mobile-stack" style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Sidebar Filters */}
        <aside
          className="mobile-sidebar"
          style={{
            width: "300px",
            background: "#111827",
            borderRight: "1px solid #1e293b",
            padding: "20px",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {/* Map Layer Toggle (Mobile) */}
          <div className="desktop-hide" style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              Map Layer
            </label>
            <div
              style={{
                display: "flex",
                background: "#1e293b",
                borderRadius: "6px",
                overflow: "hidden",
                border: "1px solid #334155",
              }}
            >
              {(["points", "suburbs"] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => setMapLayer(layer)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: mapLayer === layer ? "#8b5cf6" : "transparent",
                    border: "none",
                    color: mapLayer === layer ? "#fff" : "#94a3b8",
                    cursor: "pointer",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {layer === "points" ? "Points" : "Suburbs"}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              Date Range
            </label>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "12px",
              padding: "8px 12px",
              background: "#1e293b",
              borderRadius: "4px",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>From</div>
                <div style={{ fontSize: "13px", color: "#f8fafc", fontWeight: "600" }}>
                  {new Date(dateRange[0]).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </div>
              </div>
              <div style={{ color: "#475569" }}>—</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>To</div>
                <div style={{ fontSize: "13px", color: "#f8fafc", fontWeight: "600" }}>
                  {new Date(dateRange[1]).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
            {/* Dual-thumb range slider */}
            <div style={{ position: "relative", height: "24px", marginBottom: "8px" }}>
              {/* Track background */}
              <div style={{
                position: "absolute",
                top: "10px",
                left: 0,
                right: 0,
                height: "4px",
                background: "#334155",
                borderRadius: "2px",
              }} />
              {/* Selected range highlight */}
              <div style={{
                position: "absolute",
                top: "10px",
                left: `${((dateRange[0] - dateBounds.min) / (dateBounds.max - dateBounds.min)) * 100}%`,
                right: `${100 - ((dateRange[1] - dateBounds.min) / (dateBounds.max - dateBounds.min)) * 100}%`,
                height: "4px",
                background: "#3b82f6",
                borderRadius: "2px",
              }} />
              {/* Start handle */}
              <input
                type="range"
                min={dateBounds.min}
                max={dateBounds.max}
                value={dateRange[0]}
                onChange={(e) => {
                  const newStart = parseInt(e.target.value);
                  setDateRange([Math.min(newStart, dateRange[1]), dateRange[1]]);
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "24px",
                  background: "transparent",
                  pointerEvents: "none",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
                className="range-thumb"
              />
              {/* End handle */}
              <input
                type="range"
                min={dateBounds.min}
                max={dateBounds.max}
                value={dateRange[1]}
                onChange={(e) => {
                  const newEnd = parseInt(e.target.value);
                  setDateRange([dateRange[0], Math.max(newEnd, dateRange[0])]);
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "24px",
                  background: "transparent",
                  pointerEvents: "none",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
                className="range-thumb"
              />
            </div>
            {/* Month markers */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9px",
              color: "#475569",
            }}>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              Price Range
            </label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                type="number"
                value={priceRange[0]}
                onChange={(e) =>
                  setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])
                }
                placeholder="Min"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "4px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                }}
              />
              <input
                type="number"
                value={priceRange[1]}
                onChange={(e) =>
                  setPriceRange([priceRange[0], parseInt(e.target.value) || 5000000])
                }
                placeholder="Max"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "4px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={fullPriceStats.max}
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
              style={{ width: "100%", accentColor: "#3b82f6" }}
            />
          </div>

          {/* Sort By */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#e2e8f0",
                fontSize: "13px",
              }}
            >
              <option value="price-desc">Price (High to Low)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="date-desc">Date (Recent First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="sqm-desc">$/m2 (High to Low)</option>
            </select>
          </div>

          {/* Zones */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              Zones ({availableZones.length})
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {availableZones.map((zone) => (
                <label
                  key={zone}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    background: selectedZones.includes(zone) ? "#1e3a5f" : "transparent",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedZones.includes(zone)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedZones([...selectedZones, zone]);
                      } else {
                        setSelectedZones(selectedZones.filter((z) => z !== zone));
                      }
                    }}
                    style={{ accentColor: "#3b82f6" }}
                  />
                  <span style={{ color: "#94a3b8" }}>{zone}</span>
                  <span style={{ color: "#64748b", fontSize: "10px" }}>
                    {ZONE_DESCRIPTIONS[zone] || ""}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              Price Legend
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "8px",
                background: "#1e293b",
                borderRadius: "4px",
              }}
            >
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: "10px", color: "#64748b", flex: 1 }}>Low</span>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#eab308" }} />
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#f97316" }} />
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#ef4444" }} />
              <span style={{ fontSize: "10px", color: "#64748b" }}>High</span>
            </div>
          </div>

          {/* Top Suburbs */}
          {mapLayer === "suburbs" && suburbStats.length > 0 && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                }}
              >
                Top Suburbs by Avg Price
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {[...suburbStats]
                  .sort((a, b) => b.avgPrice - a.avgPrice)
                  .slice(0, 10)
                  .map((suburb, idx) => (
                    <div
                      key={`${suburb.suburb}-${suburb.postcode}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 8px",
                        background: "#1e293b",
                        borderRadius: "4px",
                        fontSize: "11px",
                      }}
                    >
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          background: idx < 3 ? "#8b5cf6" : "#334155",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "9px",
                          fontWeight: "700",
                          color: idx < 3 ? "#fff" : "#94a3b8",
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: "#f8fafc",
                            fontWeight: "500",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {suburb.suburb}
                        </div>
                        <div style={{ color: "#64748b", fontSize: "9px" }}>
                          {suburb.count} sales
                        </div>
                      </div>
                      <div
                        style={{
                          color: getPriceColor(suburb.avgPrice, suburbPriceRange.min, suburbPriceRange.max),
                          fontWeight: "600",
                          fontSize: "10px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatPrice(suburb.avgPrice)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </aside>

        {/* Map / Table Area */}
        <main
          className="mobile-stack"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: viewMode === "split" ? "row" : "column",
            minHeight: 0,
          }}
        >
          {/* Map */}
          {(viewMode === "map" || viewMode === "split") && (
            <div
              style={{
                flex: 1,
                position: "relative",
                minHeight: viewMode === "split" ? "100%" : "60%",
              }}
            >
              <MapContainer
                center={mapCenter}
                zoom={10}
                style={{ height: "100%", width: "100%", background: "#0a0f1a" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <MapController center={mapCenter} zoom={10} />

                {/* Individual Points Layer */}
                {mapLayer === "points" && filteredSales.slice(0, 5000).map((sale) =>
                  sale.coords && !isNaN(sale.coords.lat) && !isNaN(sale.coords.lng) ? (
                    <CircleMarker
                      key={sale.id}
                      center={[sale.coords.lat, sale.coords.lng]}
                      radius={8}
                      pathOptions={{
                        fillColor: getPriceColor(sale.price, filteredPriceStats.min, filteredPriceStats.max),
                        fillOpacity: 0.85,
                        color: selectedProperty?.id === sale.id ? "#fff" : "#1e293b",
                        weight: selectedProperty?.id === sale.id ? 3 : 1,
                      }}
                      eventHandlers={{
                        click: () => setSelectedProperty(sale),
                      }}
                    >
                      <Popup>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "12px",
                            minWidth: "200px",
                          }}
                        >
                          <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "8px" }}>
                            {sale.address}
                          </div>
                          <div style={{ color: "#666", marginBottom: "4px" }}>
                            {sale.suburb} {sale.postcode}
                          </div>
                          <div
                            style={{
                              fontSize: "20px",
                              fontWeight: "700",
                              color: "#3b82f6",
                              margin: "12px 0",
                            }}
                          >
                            {formatPrice(sale.price)}
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px",
                              fontSize: "11px",
                            }}
                          >
                            <div>
                              <span style={{ color: "#999" }}>Land: </span>
                              {sale.landArea} m2
                            </div>
                            <div>
                              <span style={{ color: "#999" }}>$/m2: </span>
                              {sale.pricePerSqm ? `$${sale.pricePerSqm}` : "N/A"}
                            </div>
                            <div>
                              <span style={{ color: "#999" }}>Zone: </span>
                              {sale.zoneCode}
                            </div>
                            <div>
                              <span style={{ color: "#999" }}>Settled: </span>
                              {formatDate(sale.settlementDate)}
                            </div>
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${sale.address}, ${sale.suburb} NSW ${sale.postcode}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              marginTop: "12px",
                              padding: "6px 12px",
                              background: "#3b82f6",
                              color: "#fff",
                              borderRadius: "4px",
                              textDecoration: "none",
                              fontSize: "11px",
                              fontWeight: "500",
                            }}
                          >
                            View on Map
                          </a>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ) : null
                )}

                {/* Suburb Aggregation Layer */}
                {mapLayer === "suburbs" && suburbStats.map((suburb) => (
                  <CircleMarker
                    key={`${suburb.suburb}-${suburb.postcode}`}
                    center={[suburb.coords.lat, suburb.coords.lng]}
                    radius={Math.min(30, Math.max(12, Math.sqrt(suburb.count) * 3))}
                    pathOptions={{
                      fillColor: getPriceColor(suburb.avgPrice, suburbPriceRange.min, suburbPriceRange.max),
                      fillOpacity: 0.7,
                      color: "#1e293b",
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "12px",
                          minWidth: "240px",
                        }}
                      >
                        <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>
                          {suburb.suburb}
                        </div>
                        <div style={{ color: "#666", marginBottom: "12px" }}>
                          {suburb.postcode}
                        </div>

                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                          marginBottom: "12px",
                        }}>
                          <div style={{
                            background: "#f0f9ff",
                            padding: "8px",
                            borderRadius: "4px",
                            textAlign: "center",
                          }}>
                            <div style={{ fontSize: "20px", fontWeight: "700", color: "#3b82f6" }}>
                              {suburb.count}
                            </div>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>SALES</div>
                          </div>
                          <div style={{
                            background: "#f0fdf4",
                            padding: "8px",
                            borderRadius: "4px",
                            textAlign: "center",
                          }}>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#22c55e" }}>
                              {formatPrice(suburb.totalValue)}
                            </div>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>TOTAL</div>
                          </div>
                        </div>

                        <div style={{
                          background: "#f8fafc",
                          padding: "10px",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ color: "#64748b", fontSize: "11px" }}>Average</span>
                            <span style={{ fontWeight: "600" }}>{formatPrice(suburb.avgPrice)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ color: "#64748b", fontSize: "11px" }}>Median</span>
                            <span style={{ fontWeight: "600" }}>{formatPrice(suburb.medianPrice)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ color: "#64748b", fontSize: "11px" }}>Range</span>
                            <span style={{ fontWeight: "500", fontSize: "11px" }}>
                              {formatPrice(suburb.minPrice)} - {formatPrice(suburb.maxPrice)}
                            </span>
                          </div>
                          {suburb.avgPricePerSqm > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748b", fontSize: "11px" }}>Avg $/m²</span>
                              <span style={{ fontWeight: "600" }}>${suburb.avgPricePerSqm.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${suburb.suburb}, NSW ${suburb.postcode}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            background: "#8b5cf6",
                            color: "#fff",
                            borderRadius: "4px",
                            textDecoration: "none",
                            fontSize: "11px",
                            fontWeight: "500",
                          }}
                        >
                          View Suburb
                        </a>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
              {mapLayer === "points" && filteredSales.length > 5000 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "16px",
                    background: "rgba(0,0,0,0.8)",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#f97316",
                  }}
                >
                  Showing 5,000 of {filteredSales.length.toLocaleString()} properties on map
                </div>
              )}
              {mapLayer === "suburbs" && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "16px",
                    background: "rgba(0,0,0,0.85)",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: "#94a3b8",
                    maxWidth: "200px",
                  }}
                >
                  <div style={{ color: "#8b5cf6", fontWeight: "600", marginBottom: "4px" }}>
                    Suburb View
                  </div>
                  <div>Circle size = sales count</div>
                  <div>Color = avg price</div>
                  <div style={{ marginTop: "4px", color: "#64748b" }}>
                    {suburbStats.length} suburbs shown
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          {(viewMode === "table" || viewMode === "split") && (
            <div
              className="mobile-full-width"
              style={{
                flex: viewMode === "split" ? "0 0 450px" : 1,
                background: "#0f172a",
                borderLeft: viewMode === "split" ? "1px solid #1e293b" : "none",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                minHeight: "300px",
              }}
            >
              {/* Search input */}
              <div style={{ padding: "12px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
                <input
                  type="text"
                  placeholder="Search address, suburb, postcode..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#111827",
                    zIndex: 10,
                  }}
                >
                  <tr>
                    <th style={{ padding: "12px", textAlign: "left", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b" }}>
                      Address
                    </th>
                    <th style={{ padding: "12px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b" }}>
                      Price
                    </th>
                    <th className="mobile-hide" style={{ padding: "12px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b" }}>
                      Land m2
                    </th>
                    <th className="mobile-hide" style={{ padding: "12px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b" }}>
                      $/m2
                    </th>
                    <th className="mobile-hide" style={{ padding: "12px", textAlign: "center", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b" }}>
                      Zone
                    </th>
                    <th style={{ padding: "12px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b" }}>
                      Settled
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b" }}>

                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(0, 1000).map((sale, idx) => (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedProperty(sale)}
                      style={{
                        cursor: "pointer",
                        background:
                          selectedProperty?.id === sale.id
                            ? "#1e3a5f"
                            : idx % 2 === 0
                            ? "#0f172a"
                            : "#111827",
                      }}
                    >
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b" }}>
                        <div style={{ fontWeight: "500", color: "#f8fafc" }}>{sale.address}</div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>{sale.suburb}</div>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: "600",
                          color: getPriceColor(sale.price, filteredPriceStats.min, filteredPriceStats.max),
                          borderBottom: "1px solid #1e293b",
                        }}
                      >
                        {formatPrice(sale.price)}
                      </td>
                      <td className="mobile-hide" style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8", borderBottom: "1px solid #1e293b" }}>
                        {sale.landArea.toLocaleString()}
                      </td>
                      <td className="mobile-hide" style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8", borderBottom: "1px solid #1e293b" }}>
                        {sale.pricePerSqm ? `$${sale.pricePerSqm.toLocaleString()}` : "-"}
                      </td>
                      <td className="mobile-hide" style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #1e293b" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            background: "#1e293b",
                            borderRadius: "4px",
                            fontSize: "10px",
                            color: "#94a3b8",
                          }}
                        >
                          {sale.zoneCode}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontSize: "11px", borderBottom: "1px solid #1e293b" }}>
                        {formatDate(sale.settlementDate)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #1e293b" }}>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${sale.address}, ${sale.suburb} NSW ${sale.postcode}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: "#3b82f6",
                            textDecoration: "none",
                            fontSize: "16px",
                          }}
                          title="View on Google Maps"
                        >
                          📍
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSales.length > 1000 && (
                <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                  Showing 1,000 of {filteredSales.length.toLocaleString()} properties in table
                </div>
              )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
