import index from "./index.html";
import {
  initDB,
  getAllSales,
  getSuburbRankings,
  getSuburbDetail,
  getSalesCount,
  searchSuburbs,
  getOutliers,
  getPredictionStats,
} from "./db";

// Initialize database on startup
initDB();

// NSW postcode to coordinates mapping
const POSTCODE_COORDS: Record<number, [number, number, number]> = {
  2000: [-33.8688, 151.2093, 0.01],
  2010: [-33.8818, 151.213, 0.01],
  2011: [-33.8778, 151.227, 0.01],
  2015: [-33.905, 151.195, 0.01],
  2016: [-33.899, 151.178, 0.01],
  2017: [-33.917, 151.188, 0.01],
  2021: [-33.893, 151.25, 0.01],
  2022: [-33.889, 151.264, 0.01],
  2026: [-33.892, 151.277, 0.01],
  2031: [-33.908, 151.255, 0.01],
  2035: [-33.938, 151.255, 0.01],
  2040: [-33.878, 151.153, 0.01],
  2041: [-33.863, 151.142, 0.01],
  2042: [-33.897, 151.173, 0.01],
  2043: [-33.893, 151.165, 0.01],
  2046: [-33.855, 151.115, 0.01],
  2060: [-33.835, 151.205, 0.01],
  2065: [-33.818, 151.198, 0.01],
  2066: [-33.805, 151.155, 0.01],
  2067: [-33.795, 151.168, 0.01],
  2070: [-33.758, 151.148, 0.01],
  2071: [-33.745, 151.165, 0.01],
  2072: [-33.735, 151.148, 0.01],
  2073: [-33.725, 151.165, 0.01],
  2074: [-33.715, 151.148, 0.01],
  2077: [-33.705, 151.118, 0.02],
  2088: [-33.828, 151.245, 0.01],
  2089: [-33.835, 151.22, 0.01],
  2095: [-33.795, 151.285, 0.01],
  2099: [-33.735, 151.278, 0.02],
  2100: [-33.765, 151.255, 0.01],
  2112: [-33.815, 151.085, 0.02],
  2113: [-33.805, 151.105, 0.01],
  2114: [-33.805, 151.065, 0.01],
  2118: [-33.778, 151.065, 0.01],
  2121: [-33.755, 151.055, 0.01],
  2122: [-33.785, 151.015, 0.01],
  2130: [-33.895, 151.135, 0.01],
  2131: [-33.878, 151.105, 0.01],
  2134: [-33.868, 151.055, 0.01],
  2135: [-33.858, 151.045, 0.01],
  2140: [-33.818, 151.025, 0.01],
  2141: [-33.858, 151.005, 0.02],
  2145: [-33.805, 150.965, 0.02],
  2148: [-33.755, 150.885, 0.02],
  2150: [-33.815, 151.005, 0.02],
  2153: [-33.735, 150.965, 0.02],
  2154: [-33.715, 150.985, 0.02],
  2155: [-33.695, 150.935, 0.03],
  2160: [-33.875, 150.945, 0.02],
  2165: [-33.895, 150.845, 0.02],
  2166: [-33.865, 150.825, 0.02],
  2170: [-33.925, 150.925, 0.03],
  2190: [-33.968, 151.015, 0.01],
  2193: [-33.905, 151.078, 0.01],
  2194: [-33.918, 151.058, 0.01],
  2195: [-33.908, 151.048, 0.01],
  2200: [-33.953, 151.035, 0.02],
  2204: [-33.908, 151.128, 0.01],
  2205: [-33.942, 151.138, 0.01],
  2207: [-33.955, 151.145, 0.01],
  2208: [-33.938, 151.068, 0.01],
  2210: [-33.95, 151.075, 0.01],
  2216: [-33.965, 151.153, 0.01],
  2217: [-33.975, 151.118, 0.01],
  2220: [-33.988, 151.068, 0.01],
  2223: [-33.983, 151.055, 0.01],
  2224: [-34.005, 151.068, 0.01],
  2227: [-34.045, 151.088, 0.01],
  2228: [-34.038, 151.108, 0.01],
  2229: [-34.068, 151.118, 0.01],
  2230: [-34.078, 151.155, 0.02],
  2232: [-34.068, 151.035, 0.02],
  2233: [-34.038, 151.028, 0.01],
  2234: [-34.008, 151.008, 0.02],
  2250: [-33.425, 151.345, 0.03],
  2259: [-33.355, 151.445, 0.03],
  2260: [-33.445, 151.445, 0.02],
  2261: [-33.305, 151.485, 0.02],
  2280: [-32.975, 151.635, 0.02],
  2285: [-32.925, 151.595, 0.02],
  2287: [-32.875, 151.515, 0.02],
  2289: [-32.905, 151.625, 0.02],
  2290: [-32.895, 151.685, 0.02],
  2295: [-32.925, 151.775, 0.01],
  2300: [-32.925, 151.785, 0.01],
  2303: [-32.915, 151.765, 0.01],
  2304: [-32.895, 151.765, 0.02],
  2320: [-32.715, 151.545, 0.03],
  2325: [-32.575, 151.335, 0.02],
  2330: [-32.555, 151.155, 0.03],
  2340: [-31.085, 150.925, 0.03],
  2444: [-31.425, 152.905, 0.03],
  2450: [-30.305, 153.115, 0.03],
  2480: [-28.585, 153.295, 0.03],
  2481: [-28.645, 153.615, 0.02],
  2485: [-28.165, 153.525, 0.02],
  2500: [-34.425, 150.895, 0.03],
  2515: [-34.325, 150.935, 0.02],
  2518: [-34.385, 150.905, 0.02],
  2519: [-34.405, 150.885, 0.02],
  2525: [-34.405, 150.865, 0.02],
  2526: [-34.435, 150.845, 0.02],
  2527: [-34.535, 150.795, 0.03],
  2528: [-34.565, 150.835, 0.02],
  2529: [-34.535, 150.855, 0.02],
  2530: [-34.495, 150.755, 0.02],
  2540: [-34.875, 150.605, 0.03],
  2560: [-34.065, 150.815, 0.03],
  2565: [-34.035, 150.835, 0.02],
  2566: [-34.055, 150.855, 0.02],
  2567: [-34.105, 150.805, 0.02],
  2570: [-34.185, 150.695, 0.03],
  2575: [-34.455, 150.435, 0.02],
  2576: [-34.475, 150.405, 0.02],
  2577: [-34.555, 150.355, 0.03],
  2580: [-34.755, 149.715, 0.03],
  2600: [-35.285, 149.125, 0.02],
  2615: [-35.215, 149.035, 0.02],
  2620: [-35.445, 149.225, 0.03],
  2640: [-36.075, 146.915, 0.03],
  2650: [-35.115, 147.365, 0.03],
  2680: [-34.285, 146.055, 0.03],
  2745: [-33.765, 150.685, 0.02],
  2747: [-33.735, 150.725, 0.02],
  2750: [-33.755, 150.695, 0.02],
  2756: [-33.535, 150.765, 0.03],
  2759: [-33.725, 150.785, 0.02],
  2760: [-33.735, 150.805, 0.02],
  2761: [-33.705, 150.845, 0.02],
  2762: [-33.695, 150.805, 0.02],
  2763: [-33.665, 150.845, 0.02],
  2765: [-33.645, 150.885, 0.03],
  2766: [-33.735, 150.845, 0.02],
  2767: [-33.725, 150.885, 0.02],
  2768: [-33.705, 150.885, 0.02],
  2769: [-33.735, 150.905, 0.02],
  2770: [-33.755, 150.835, 0.02],
  2773: [-33.725, 150.605, 0.02],
  2774: [-33.725, 150.555, 0.02],
  2777: [-33.715, 150.435, 0.02],
  2780: [-33.715, 150.305, 0.02],
  2795: [-33.435, 149.585, 0.03],
  2800: [-33.285, 148.995, 0.03],
  2830: [-32.235, 148.605, 0.03],
};

function getPostcodeCoords(postcode: string): { lat: number; lng: number; spread: number } {
  const pc = parseInt(postcode);
  if (isNaN(pc) || pc < 2000 || pc > 3000) {
    return { lat: -33.8688, lng: 151.2093, spread: 0.05 };
  }
  if (POSTCODE_COORDS[pc]) {
    const [lat, lng, spread] = POSTCODE_COORDS[pc];
    return { lat, lng, spread };
  }
  // Interpolate
  const codes = Object.keys(POSTCODE_COORDS).map(Number).sort((a, b) => a - b);
  const nearest = codes.reduce((prev, curr) =>
    Math.abs(curr - pc) < Math.abs(prev - pc) ? curr : prev
  );
  const [lat, lng, spread] = POSTCODE_COORDS[nearest];
  return { lat, lng, spread: spread * 1.5 };
}

function getSuburbCoords(suburb: string, postcode: string): { lat: number; lng: number } {
  const { lat, lng, spread } = getPostcodeCoords(postcode);
  let hash = 0;
  for (let i = 0; i < suburb.length; i++) {
    hash = ((hash << 5) - hash) + suburb.charCodeAt(i);
    hash = hash & hash;
  }
  const angle = (hash % 360) * Math.PI / 180;
  const distance = (Math.abs(hash % 1000) / 1000) * spread;
  return {
    lat: lat + Math.cos(angle) * distance,
    lng: lng + Math.sin(angle) * distance,
  };
}

const PORT = process.env.PORT || 3003;

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  routes: {
    "/": index,

    // Get all sales with coordinates
    "/api/sales": {
      GET() {
        const sales = getAllSales() as any[];
        const enriched = sales.map((s) => ({
          ...s,
          coords: getSuburbCoords(s.suburb, s.postcode),
        }));
        return Response.json(enriched);
      },
    },

    // Get suburb rankings
    "/api/suburbs": {
      GET(req) {
        const url = new URL(req.url);
        const sortBy = url.searchParams.get("sortBy") || "median_price";
        const order = url.searchParams.get("order") || "DESC";
        const limit = parseInt(url.searchParams.get("limit") || "500");

        const rankings = getSuburbRankings(sortBy, order, limit) as any[];
        // Add coordinates
        const enriched = rankings.map((s) => ({
          ...s,
          coords: getSuburbCoords(s.suburb, s.postcode),
        }));
        return Response.json(enriched);
      },
    },

    // Get suburb detail
    "/api/suburbs/:suburb/:postcode": {
      GET(req) {
        const suburb = decodeURIComponent(req.params.suburb);
        const postcode = req.params.postcode;
        const detail = getSuburbDetail(suburb, postcode);

        if (!detail.stats) {
          return new Response("Suburb not found", { status: 404 });
        }

        // Add coordinates to sales
        const enrichedSales = (detail.recentSales as any[]).map((s) => ({
          ...s,
          coords: getSuburbCoords(s.suburb, s.postcode),
        }));

        return Response.json({
          ...detail,
          recentSales: enrichedSales,
          coords: getSuburbCoords(suburb, postcode),
        });
      },
    },

    // Search suburbs
    "/api/search": {
      GET(req) {
        const url = new URL(req.url);
        const q = url.searchParams.get("q") || "";
        if (q.length < 2) {
          return Response.json([]);
        }
        const results = searchSuburbs(q);
        return Response.json(results);
      },
    },

    // Stats
    "/api/stats": {
      GET() {
        const count = getSalesCount();
        return Response.json({ salesCount: count });
      },
    },

    // Outliers - find underpriced and overpriced sales
    "/api/outliers": {
      GET(req) {
        const url = new URL(req.url);
        const threshold = parseFloat(url.searchParams.get("threshold") || "2.0");
        const limit = parseInt(url.searchParams.get("limit") || "200");
        const result = getOutliers(threshold, limit);
        // Add coordinates
        const enrichedOutliers = result.outliers.map((o: any) => ({
          ...o,
          coords: getSuburbCoords(o.suburb, o.postcode),
        }));
        return Response.json({
          ...result,
          outliers: enrichedOutliers,
        });
      },
    },

    // Price prediction stats by month and postcode prefix
    "/api/prediction-stats": {
      GET() {
        const stats = getPredictionStats();
        return Response.json(stats);
      },
    },
  },
  development: process.env.NODE_ENV !== "production" ? {
    hmr: true,
    console: true,
  } : false,
});

console.log(`Server running at http://localhost:${PORT}`);
